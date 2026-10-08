<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\CashAccount;
use App\Models\Enrollment;
use App\Models\FeeStructure;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\Receipt;
use App\Models\StudentScholarship;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class InvoiceService
{
    public function __construct(private readonly AccountingService $accountingService) {}

    /**
     * Génère automatiquement une facture à partir d'une inscription.
     * Récupère les FeeStructures de la classe/année et les bourses éventuelles.
     */
    public function createFromEnrollment(Enrollment $enrollment): Invoice
    {
        return DB::transaction(function () use ($enrollment): Invoice {
            $feeStructures = FeeStructure::with('feeCategory')
                ->where('class_id', $enrollment->class_id)
                ->where('academic_year_id', $enrollment->academic_year_id)
                ->orderBy('created_at')
                ->get();

            $invoice = Invoice::create([
                'enrollment_id' => $enrollment->id,
                'invoice_number' => $this->generateInvoiceNumber(),
                'subtotal' => 0,
                'discount_amount' => 0,
                'total' => 0,
                'amount_paid' => 0,
                'amount_remaining' => 0,
                'status' => 'ISSUED',
                'issued_at' => now()->toDateString(),
            ]);

            $order = 0;
            foreach ($feeStructures as $fee) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'label' => $fee->feeCategory->name ?? 'Frais scolaires',
                    'type' => 'FEE',
                    'amount' => $fee->amount,
                    'sort_order' => $order++,
                ]);
            }

            // Bourse éventuelle → ligne DISCOUNT + transaction comptable
            $studentScholarship = StudentScholarship::with(['scholarship', 'student'])
                ->where('student_id', $enrollment->student_id)
                ->where('academic_year_id', $enrollment->academic_year_id)
                ->first();

            if ($studentScholarship && $studentScholarship->scholarship) {
                $scholarship = $studentScholarship->scholarship;
                $subtotal = $feeStructures->sum('amount');

                $discountAmount = $scholarship->type === 'percentage'
                    ? round($subtotal * ((float) $scholarship->value / 100), 2)
                    : (float) $scholarship->value;

                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'label' => 'Bourse : '.$scholarship->name,
                    'type' => 'DISCOUNT',
                    'amount' => $discountAmount,
                    'sort_order' => $order,
                ]);

                $this->accountingService->recordScholarshipTransaction($studentScholarship, $discountAmount);
            }

            $invoice->recalculate();

            return $invoice->fresh();
        });
    }

    /**
     * Enregistre un paiement, crée le reçu, recalcule la facture,
     * et met à jour le statut de l'inscription si soldée.
     */
    public function recordPayment(Invoice $invoice, array $data): Payment
    {
        return DB::transaction(function () use ($invoice, $data): Payment {
            // Garde anti trop-perçu, évaluée SOUS VERROU : sans cela, deux requêtes
            // concurrentes (double-clic, deux caissiers) liraient le même reste dû et
            // passeraient toutes les deux — le trop-perçu étant ensuite masqué par le
            // max(0, …) de recalculate().
            $invoice = Invoice::whereKey($invoice->id)->lockForUpdate()->firstOrFail();

            $remaining = (float) $invoice->amount_remaining;
            if ((float) ($data['amount'] ?? 0) > $remaining + 0.001) {
                throw ValidationException::withMessages([
                    'amount' => 'Le montant dépasse le reste à payer ('.number_format($remaining, 0, ',', ' ').' F).',
                ]);
            }

            $data['invoice_id'] = $invoice->id;

            // Rattache le paiement à la caisse correspondant au moyen de paiement
            // (si non déjà précisé) afin que le solde de la caisse soit crédité.
            if (empty($data['cash_account_id'])) {
                $data['cash_account_id'] = $this->resolveCashAccountId($data['payment_method'] ?? null);
            }

            $payment = Payment::create($data);

            Receipt::create([
                'payment_id' => $payment->id,
                'receipt_number' => $this->generateReceiptNumber(),
                'verification_code' => $this->generateVerificationCode(),
            ]);

            $invoice->recalculate();

            $this->accountingService->recordPaymentTransaction($payment);

            $enrollment = $invoice->enrollment;
            if (in_array($invoice->fresh()->status, ['PARTIALLY_PAID', 'PAID'], true)) {
                $enrollment->update(['status' => Enrollment::STATUS_ACTIVE]);
            }

            return $payment->load('receipt');
        });
    }

    /**
     * Caisse par défaut correspondant à un moyen de paiement.
     * Espèces → CASH · Mobile Money → MOBILE_MONEY · Virement/Chèque → BANK.
     * Retourne la première caisse active du type, ou null si aucune.
     */
    private function resolveCashAccountId(?string $method): ?string
    {
        $type = match ($method) {
            'MOBILE_MONEY' => 'MOBILE_MONEY',
            'BANK_TRANSFER', 'CHEQUE' => 'BANK',
            default => 'CASH',
        };

        return CashAccount::where('active', true)
            ->where('type', $type)
            ->orderBy('created_at')
            ->value('id');
    }

    /* ------------------------------------------------------------------ */
    /* Générateurs de numéros uniques */
    /* ------------------------------------------------------------------ */

    /** Numéro de facture séquentiel par année : INV-AAAA-0001 */
    public function generateInvoiceNumber(): string
    {
        $year = now()->format('Y');
        do {
            $seq = Invoice::where('invoice_number', 'like', "INV-{$year}-%")->count() + 1;
            $number = 'INV-'.$year.'-'.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
        } while (Invoice::where('invoice_number', $number)->exists());

        return $number;
    }

    /** Numéro de reçu séquentiel par année : REC-AAAA-0001 */
    public function generateReceiptNumber(): string
    {
        $year = now()->format('Y');
        do {
            $seq = Receipt::where('receipt_number', 'like', "REC-{$year}-%")->count() + 1;
            $number = 'REC-'.$year.'-'.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
        } while (Receipt::where('receipt_number', $number)->exists());

        return $number;
    }

    /** Code unique anti-falsification encodé dans le code-barres du reçu. */
    public function generateVerificationCode(): string
    {
        do {
            $code = 'DAL-'.strtoupper(Str::random(12));
        } while (Receipt::where('verification_code', $code)->exists());

        return $code;
    }
}
