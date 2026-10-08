<?php

namespace App\Services;

use App\Models\AccountingTransaction;
use App\Models\CashAccount;
use App\Models\Payment;
use App\Models\Payslip;
use App\Models\StudentScholarship;

final class AccountingService
{
    /**
     * Enregistre la dépense de salaire d'un bulletin (net payé) et débite la
     * caisse. Lie la transaction au bulletin. À appeler dans un DB::transaction.
     */
    public function recordPayrollTransaction(Payslip $payslip, ?string $cashAccountId, string $periodLabel): AccountingTransaction
    {
        $name = $payslip->payload['employee']['name'] ?? 'Employé';

        $transaction = AccountingTransaction::create([
            'type' => 'EXPENSE',
            'amount' => $payslip->net,
            'description' => "Salaire {$periodLabel} — {$name}",
            'reference_type' => 'PAYROLL',
            'reference_id' => $payslip->id,
            'cash_account_id' => $cashAccountId,
            'created_by' => auth()->id(),
            'transaction_date' => now(),
        ]);

        if ($cashAccountId) {
            CashAccount::where('id', $cashAccountId)->decrement('balance', $payslip->net);
        }

        $payslip->update(['accounting_transaction_id' => $transaction->id]);

        return $transaction;
    }

    /**
     * Annule la dépense de salaire liée à un bulletin : recrédite la caisse et
     * supprime la transaction. À appeler dans un DB::transaction.
     */
    public function cancelPayrollTransaction(Payslip $payslip): void
    {
        if (! $payslip->accounting_transaction_id) {
            return;
        }

        $transaction = AccountingTransaction::find($payslip->accounting_transaction_id);
        if (! $transaction) {
            $payslip->update(['accounting_transaction_id' => null]);

            return;
        }

        if ($transaction->cash_account_id) {
            CashAccount::where('id', $transaction->cash_account_id)->increment('balance', $transaction->amount);
        }

        $transaction->delete();
        $payslip->update(['accounting_transaction_id' => null]);
    }

    /**
     * Crée une transaction INCOME pour un paiement
     * et incrémente la caisse correspondante.
     * Doit être appelé dans un DB::transaction.
     */
    public function recordPaymentTransaction(Payment $payment): AccountingTransaction
    {
        // Récupérer le nom de l'élève pour la description
        $invoice = $payment->invoice()->with('enrollment.student')->first();
        $student = $invoice?->enrollment?->student;
        $studentName = $student
            ? "{$student->firstname} {$student->lastname}"
            : 'Élève inconnu';

        $transaction = AccountingTransaction::create([
            'type' => 'INCOME',
            'amount' => $payment->amount,
            'description' => "Paiement écolage — {$studentName}",
            'reference_type' => 'PAYMENT',
            'reference_id' => $payment->id,
            'cash_account_id' => $payment->cash_account_id,
            'created_by' => auth()->id(),
            'transaction_date' => $payment->paid_at ?? now(),
        ]);

        // Mettre à jour le solde de la caisse
        if ($payment->cash_account_id) {
            CashAccount::where('id', $payment->cash_account_id)
                ->increment('balance', $payment->amount);
        }

        return $transaction;
    }

    /**
     * Crée une transaction EXPENSE pour une bourse accordée.
     * Doit être appelé dans un DB::transaction.
     */
    public function recordScholarshipTransaction(
        StudentScholarship $studentScholarship,
        float $discountAmount
    ): AccountingTransaction {
        $student = $studentScholarship->student;
        $scholarship = $studentScholarship->scholarship;
        $studentName = $student
            ? "{$student->firstname} {$student->lastname}"
            : 'Élève inconnu';
        $scholarshipName = $scholarship?->name ?? 'Bourse';

        return AccountingTransaction::create([
            'type' => 'EXPENSE',
            'amount' => $discountAmount,
            'description' => "Réduction '{$scholarshipName}' accordée à {$studentName}",
            'reference_type' => 'SCHOLARSHIP',
            'reference_id' => $studentScholarship->id,
            'created_by' => auth()->id(),
            'transaction_date' => now(),
        ]);
    }

    /**
     * Annulation d'un paiement : transaction inverse + décrémentation de la caisse.
     */
    public function cancelPaymentTransaction(Payment $payment): AccountingTransaction
    {
        $invoice = $payment->invoice()->with('enrollment.student')->first();
        $student = $invoice?->enrollment?->student;
        $studentName = $student
            ? "{$student->firstname} {$student->lastname}"
            : 'Élève inconnu';

        $transaction = AccountingTransaction::create([
            'type' => 'EXPENSE',
            'amount' => $payment->amount,
            'description' => "Annulation paiement — {$studentName}",
            'reference_type' => 'CANCELLATION',
            'reference_id' => $payment->id,
            'cash_account_id' => $payment->cash_account_id,
            'created_by' => auth()->id(),
            'transaction_date' => now(),
        ]);

        // Décrémenter la caisse
        if ($payment->cash_account_id) {
            CashAccount::where('id', $payment->cash_account_id)
                ->decrement('balance', $payment->amount);
        }

        return $transaction;
    }
}
