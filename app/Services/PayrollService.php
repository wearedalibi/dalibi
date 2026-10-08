<?php

namespace App\Services;

use App\Models\EmployeeProfile;
use App\Models\PayrollSetting;
use App\Models\PayRun;
use App\Models\Payslip;
use App\Models\SalaryComponent;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PayrollService
{
    public function __construct(private readonly AccountingService $accountingService) {}

    /**
     * Crée un cycle de paie brouillon pour un mois/année et génère un bulletin
     * par employé actif (salaire de base + rubriques par défaut).
     */
    public function generate(int $month, int $year, ?string $label = null): PayRun
    {
        // Un seul cycle actif (non annulé) par période.
        $exists = PayRun::where('period_month', $month)
            ->where('period_year', $year)
            ->where('status', '!=', PayRun::CANCELLED)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'period' => ['Un cycle de paie existe déjà pour cette période.'],
            ]);
        }

        return DB::transaction(function () use ($month, $year, $label): PayRun {
            $run = PayRun::create([
                'reference' => $this->generateReference($month, $year),
                'period_month' => $month,
                'period_year' => $year,
                'label' => $label,
                'status' => PayRun::DRAFT,
                'created_by' => auth()->id(),
            ]);

            $components = SalaryComponent::where('active', true)
                ->where('is_default', true)
                ->orderBy('sort_order')
                ->get();

            $employees = EmployeeProfile::with([
                'user:id,firstname,lastname',
                'salaryGrade:id,base_amount,name',
                'allowances' => fn ($q) => $q->where('active', true),
            ])->where('status', 'active')->get();

            $settings = PayrollSetting::current();

            foreach ($employees as $employee) {
                $built = $this->buildLines($employee, $components, $month, $year, $settings);
                $this->persistPayslip($run, $employee, $built['lines'], $built['employer']);
            }

            $this->refreshTotals($run);

            return $run->fresh(['payslips']);
        });
    }

    /**
     * Compose les lignes d'un bulletin :
     *   salaire de base (grille) + ancienneté + rubriques par défaut + primes tracées
     *   + retenues légales (CNSS salariale, ITS). Chaque ligne porte une `origin`.
     *
     * @return array{lines: array<int, array<string, mixed>>, employer: array<int, array{label:string, amount:float}>}
     */
    private function buildLines(EmployeeProfile $employee, $components, int $month, int $year, PayrollSetting $settings): array
    {
        $base = $employee->effectiveBaseSalary();

        $lines = [[
            'code' => 'BASE',
            'label' => 'Salaire de base',
            'type' => SalaryComponent::EARNING,
            'amount' => $base,
            'origin' => $employee->salary_grade_id ? 'grade:'.$employee->salary_grade_id : 'base',
        ]];

        // Prime d'ancienneté (si activée) : % du base par année, plafonnée.
        if ($settings->seniority_enabled && $settings->seniority_rate_per_year > 0 && $employee->hire_date) {
            $periodEnd = Carbon::create($year, $month, 1)->endOfMonth();
            $years = (int) $employee->hire_date->diffInYears($periodEnd); // années pleines
            $rate = $settings->seniority_rate_per_year * $years;
            if ($settings->seniority_cap_percent > 0) {
                $rate = min($rate, $settings->seniority_cap_percent);
            }
            if ($rate > 0 && $years > 0) {
                $lines[] = [
                    'code' => 'ANC',
                    'label' => "Prime d'ancienneté ({$years} an".($years > 1 ? 's' : '').')',
                    'type' => SalaryComponent::EARNING,
                    'amount' => round($base * $rate / 100, 2),
                    'origin' => 'seniority',
                ];
            }
        }

        // Rubriques par défaut (globales).
        foreach ($components as $c) {
            $lines[] = [
                'code' => $c->code,
                'label' => $c->name,
                'type' => $c->type,
                'amount' => (float) ($c->default_amount ?? 0),
                'origin' => 'component:'.$c->id,
            ];
        }

        // Primes / retenues propres à l'employé, actives sur la période (tracées).
        foreach ($employee->allowances as $a) {
            if ($a->appliesTo($month, $year)) {
                $lines[] = [
                    'code' => null,
                    'label' => $a->label,
                    'type' => $a->type,
                    'amount' => $a->computeAmount($base),
                    'reason' => $a->reason,
                    'origin' => 'allowance:'.$a->id,
                ];
            }
        }

        // Retenues légales (CNSS salariale, ITS) calculées sur le brut imposable.
        $grossEarnings = 0.0;
        foreach ($lines as $l) {
            if (($l['type'] ?? '') !== SalaryComponent::DEDUCTION) {
                $grossEarnings += (float) ($l['amount'] ?? 0);
            }
        }
        $statutory = $this->statutory($grossEarnings, $settings);
        $lines = array_merge($lines, $statutory['deductions']);

        return ['lines' => $lines, 'employer' => $statutory['employer']];
    }

    /**
     * Retenues légales togolaises (paramétrables, désactivées par défaut) :
     *   - CNSS part salariale (sur brut plafonné) + part patronale (info employeur) ;
     *   - ITS : barème progressif sur le brut − CNSS salariale.
     *
     * @return array{deductions: array<int, array<string, mixed>>, employer: array<int, array{label:string, amount:float}>}
     */
    private function statutory(float $gross, PayrollSetting $s): array
    {
        $deductions = [];
        $employer = [];
        $cnssEmployee = 0.0;

        if ($s->cnss_enabled && $s->cnss_employee_rate > 0) {
            $baseCnss = $s->cnss_ceiling > 0 ? min($gross, $s->cnss_ceiling) : $gross;
            $cnssEmployee = round($baseCnss * $s->cnss_employee_rate / 100, 2);
            if ($cnssEmployee > 0) {
                $deductions[] = ['code' => 'CNSS', 'label' => 'CNSS (part salariale)', 'type' => SalaryComponent::DEDUCTION, 'amount' => $cnssEmployee, 'origin' => 'cnss'];
            }
            if ($s->cnss_employer_rate > 0) {
                $employer[] = ['label' => 'CNSS (part patronale)', 'amount' => round($baseCnss * $s->cnss_employer_rate / 100, 2)];
            }
        }

        if ($s->its_enabled) {
            $taxable = max(0.0, $gross - $cnssEmployee);
            $its = $this->progressiveTax($taxable, $s->its_brackets ?? []);
            if ($its > 0) {
                $deductions[] = ['code' => 'ITS', 'label' => 'ITS (impôt sur salaire)', 'type' => SalaryComponent::DEDUCTION, 'amount' => $its, 'origin' => 'its'];
            }
        }

        return ['deductions' => $deductions, 'employer' => $employer];
    }

    /**
     * Impôt progressif par tranches. Chaque tranche : {up_to, rate}. up_to null =
     * dernière tranche (au-delà). La part de revenu dans chaque tranche est taxée
     * à son taux.
     */
    private function progressiveTax(float $taxable, array $brackets): float
    {
        if ($taxable <= 0 || empty($brackets)) {
            return 0.0;
        }

        usort($brackets, fn ($a, $b) => (($a['up_to'] ?? INF) <=> ($b['up_to'] ?? INF)));

        $tax = 0.0;
        $prev = 0.0;
        foreach ($brackets as $b) {
            $cap = isset($b['up_to']) && $b['up_to'] !== null ? (float) $b['up_to'] : INF;
            $rate = (float) ($b['rate'] ?? 0);
            if ($taxable <= $prev) {
                break;
            }
            $portion = min($taxable, $cap) - $prev;
            if ($portion > 0) {
                $tax += $portion * $rate / 100;
            }
            $prev = $cap;
            if (is_infinite($cap)) {
                break;
            }
        }

        return round($tax, 2);
    }

    /**
     * Remplace les lignes d'un bulletin (uniquement tant que le cycle est en
     * brouillon) et recalcule les totaux du bulletin et du cycle.
     *
     * @param  array<int, array{code:?string, label:string, type:string, amount:float}>  $lines
     */
    public function updatePayslipLines(Payslip $payslip, array $lines): Payslip
    {
        $run = $payslip->payRun;
        if ($run->status !== PayRun::DRAFT) {
            throw ValidationException::withMessages([
                'payslip' => ['Seul un cycle en brouillon peut être modifié.'],
            ]);
        }

        return DB::transaction(function () use ($payslip, $lines, $run): Payslip {
            [$gross, $deductions, $net] = $this->totals($lines);

            $payload = $payslip->payload;
            $payload['lines'] = $lines;

            $payslip->update([
                'payload' => $payload,
                'gross' => $gross,
                'total_deductions' => $deductions,
                'net' => $net,
            ]);

            $this->refreshTotals($run);

            return $payslip->fresh();
        });
    }

    /** Valide le cycle (brouillon → validé). */
    public function validate(PayRun $run): PayRun
    {
        return DB::transaction(function () use ($run): PayRun {
            $locked = $this->lockAndAssert($run, [PayRun::DRAFT]);

            $locked->update(['status' => PayRun::VALIDATED, 'validated_at' => now()]);

            return $locked->fresh();
        });
    }

    /**
     * Paie le cycle : pour chaque bulletin, écrit une dépense de salaire et
     * débite la caisse choisie. Passe le cycle à « payé ».
     */
    public function pay(PayRun $run, string $cashAccountId): PayRun
    {
        return DB::transaction(function () use ($run, $cashAccountId): PayRun {
            $locked = $this->lockAndAssert($run, [PayRun::VALIDATED]);

            $locked->load('payslips');
            $periodLabel = $locked->periodLabel();

            foreach ($locked->payslips as $payslip) {
                $this->accountingService->recordPayrollTransaction($payslip, $cashAccountId, $periodLabel);
            }

            $locked->update([
                'status' => PayRun::PAID,
                'paid_at' => now(),
                'cash_account_id' => $cashAccountId,
            ]);

            return $locked->fresh();
        });
    }

    /**
     * Annule le cycle. Si déjà payé, recrédite la caisse et supprime les
     * transactions liées.
     */
    public function cancel(PayRun $run): PayRun
    {
        return DB::transaction(function () use ($run): PayRun {
            $locked = $this->lockAndAssert($run, [PayRun::DRAFT, PayRun::VALIDATED, PayRun::PAID]);

            if ($locked->status === PayRun::PAID) {
                $locked->load('payslips');
                foreach ($locked->payslips as $payslip) {
                    $this->accountingService->cancelPayrollTransaction($payslip);
                }
            }

            $locked->update(['status' => PayRun::CANCELLED]);

            return $locked->fresh();
        });
    }

    /**
     * Supprime définitivement un cycle. Si le cycle était payé, on annule
     * d'abord les écritures comptables (recrédit des caisses) avant de le
     * supprimer ; les bulletins sont supprimés en cascade.
     */
    public function delete(PayRun $run): void
    {
        DB::transaction(function () use ($run): void {
            // Verrou : évite qu'une suppression concurrente recrédite deux fois la caisse.
            $locked = PayRun::whereKey($run->id)->lockForUpdate()->firstOrFail();
            $locked->load('payslips');

            if ($locked->status === PayRun::PAID) {
                foreach ($locked->payslips as $payslip) {
                    $this->accountingService->cancelPayrollTransaction($payslip);
                }
            }

            // Suppression explicite des bulletins (portable : ne dépend pas du
            // cascade FK, non appliqué sous SQLite en test).
            $locked->payslips()->delete();
            $locked->delete();
        });
    }

    /* ------------------------------------------------------------------ */
    /* Helpers */
    /* ------------------------------------------------------------------ */

    private function persistPayslip(PayRun $run, EmployeeProfile $employee, array $lines, array $employerCharges = []): Payslip
    {
        [$gross, $deductions, $net] = $this->totals($lines);

        return Payslip::create([
            'pay_run_id' => $run->id,
            'employee_profile_id' => $employee->id,
            'reference' => $run->reference.'-'.Str::upper(Str::random(4)),
            'gross' => $gross,
            'total_deductions' => $deductions,
            'net' => $net,
            'payload' => [
                'employee' => [
                    'name' => $employee->fullName(),
                    'matricule' => $employee->employee_number,
                    'job_title' => $employee->job_title,
                    'contract_type' => $employee->contract_type,
                    'cnss_number' => $employee->cnss_number,
                ],
                'lines' => $lines,
                'employer_charges' => $employerCharges,
            ],
        ]);
    }

    /** @return array{0:float,1:float,2:float} [gross, deductions, net] */
    private function totals(array $lines): array
    {
        $gross = 0.0;
        $deductions = 0.0;
        foreach ($lines as $line) {
            $amount = (float) ($line['amount'] ?? 0);
            if (($line['type'] ?? '') === SalaryComponent::DEDUCTION) {
                $deductions += $amount;
            } else {
                $gross += $amount;
            }
        }

        return [$gross, $deductions, $gross - $deductions];
    }

    private function refreshTotals(PayRun $run): void
    {
        $sums = $run->payslips()->selectRaw('
            coalesce(sum(gross), 0) as g,
            coalesce(sum(total_deductions), 0) as d,
            coalesce(sum(net), 0) as n
        ')->first();

        $run->update([
            'total_gross' => (float) $sums->g,
            'total_deductions' => (float) $sums->d,
            'total_net' => (float) $sums->n,
        ]);
    }

    /**
     * Recharge le cycle SOUS VERROU puis vérifie son statut.
     *
     * À appeler impérativement dans une transaction : sans verrou, deux requêtes
     * concurrentes (double-clic sur « Payer ») liraient toutes deux le statut
     * « validé » et décaisseraient deux fois.
     */
    private function lockAndAssert(PayRun $run, array $allowed): PayRun
    {
        $locked = PayRun::whereKey($run->id)->lockForUpdate()->firstOrFail();

        $this->assertStatus($locked, $allowed);

        return $locked;
    }

    private function assertStatus(PayRun $run, array $allowed): void
    {
        if (! in_array($run->status, $allowed, true)) {
            throw ValidationException::withMessages([
                'status' => ['Action impossible pour un cycle au statut « '.$run->status.' ».'],
            ]);
        }
    }

    private function generateReference(int $month, int $year): string
    {
        $base = sprintf('PAIE-%04d-%02d', $year, $month);
        $ref = $base;
        $i = 1;
        while (PayRun::where('reference', $ref)->exists()) {
            $ref = $base.'-'.(++$i);
        }

        return $ref;
    }
}
