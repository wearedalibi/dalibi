<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AccountingTransaction;
use App\Models\CashAccount;
use App\Models\EmployeeProfile;
use App\Models\PayRun;
use App\Models\User;
use App\Services\PayrollService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Machine à états du cycle de paie : brouillon → validé → payé (ou annulé).
 *
 * Chaque transition est vérifiée SOUS VERROU (`lockAndAssert`) : sans cela, un
 * double-clic sur « Payer » décaisserait deux fois la caisse et créerait des
 * écritures comptables en double.
 */
class PayRunStateMachineTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function admin(): User
    {
        return tap(User::factory()->create(), fn ($u) => $u->assignRole(Roles::ADMINISTRATOR));
    }

    private function makeRun(float $base = 100000): PayRun
    {
        EmployeeProfile::create([
            'user_id' => User::factory()->create()->id,
            'job_title' => 'Enseignant',
            'contract_type' => 'CDI',
            'base_salary' => $base,
            'payment_method' => 'CASH',
            'status' => 'active',
        ]);

        return app(PayrollService::class)->generate(7, 2026);
    }

    private function cash(float $balance = 500000): CashAccount
    {
        return CashAccount::create([
            'name' => 'Caisse espèces', 'type' => 'CASH', 'balance' => $balance, 'active' => true,
        ]);
    }

    public function test_a_draft_run_cannot_be_paid_before_validation(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin);
        $run = $this->makeRun();
        $cash = $this->cash();

        $this->actingAs($admin)
            ->post(route('pay-runs.pay', $run), ['cash_account_id' => $cash->id])
            ->assertSessionHasErrors('status');

        $this->assertSame(PayRun::DRAFT, $run->fresh()->status);
        $this->assertEqualsWithDelta(500000, (float) $cash->fresh()->balance, 0.01);
    }

    public function test_a_run_cannot_be_validated_twice(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin);
        $run = $this->makeRun();

        $this->actingAs($admin)->post(route('pay-runs.validate', $run))->assertSessionHasNoErrors();
        $this->assertSame(PayRun::VALIDATED, $run->fresh()->status);

        $this->actingAs($admin)->post(route('pay-runs.validate', $run))->assertSessionHasErrors('status');
    }

    public function test_a_run_cannot_be_paid_twice(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin);
        $run = $this->makeRun();
        $cash = $this->cash();

        $this->actingAs($admin)->post(route('pay-runs.validate', $run));
        $this->actingAs($admin)
            ->post(route('pay-runs.pay', $run), ['cash_account_id' => $cash->id])
            ->assertSessionHasNoErrors();

        $balanceAfterFirst = (float) $cash->fresh()->balance;
        $entriesAfterFirst = AccountingTransaction::where('reference_type', 'PAYROLL')->count();

        // Second appel : refusé, sans second décaissement ni écriture en double.
        $this->actingAs($admin)
            ->post(route('pay-runs.pay', $run), ['cash_account_id' => $cash->id])
            ->assertSessionHasErrors('status');

        $this->assertEqualsWithDelta($balanceAfterFirst, (float) $cash->fresh()->balance, 0.01);
        $this->assertSame($entriesAfterFirst, AccountingTransaction::where('reference_type', 'PAYROLL')->count());
    }

    public function test_cancelling_a_paid_run_credits_the_cash_account_back_once(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin);
        $run = $this->makeRun();
        $cash = $this->cash();

        $this->actingAs($admin)->post(route('pay-runs.validate', $run));
        $this->actingAs($admin)->post(route('pay-runs.pay', $run), ['cash_account_id' => $cash->id]);

        $this->actingAs($admin)->post(route('pay-runs.cancel', $run))->assertSessionHasNoErrors();
        $this->assertSame(PayRun::CANCELLED, $run->fresh()->status);
        $this->assertEqualsWithDelta(500000, (float) $cash->fresh()->balance, 0.01);

        // Une seconde annulation est refusée : pas de double recrédit.
        $this->actingAs($admin)->post(route('pay-runs.cancel', $run))->assertSessionHasErrors('status');
        $this->assertEqualsWithDelta(500000, (float) $cash->fresh()->balance, 0.01);
    }

    public function test_payslip_cannot_be_edited_once_validated(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin);
        $run = $this->makeRun();

        $this->actingAs($admin)->post(route('pay-runs.validate', $run));

        $payslip = $run->fresh()->payslips->first();

        $this->actingAs($admin)
            ->put(route('payslips.update', $payslip), [
                'lines' => [['label' => 'Salaire', 'type' => 'earning', 'amount' => 999999]],
            ])
            ->assertSessionHasErrors('payslip');
    }
}
