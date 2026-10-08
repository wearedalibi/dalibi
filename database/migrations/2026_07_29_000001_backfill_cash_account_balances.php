<?php

use App\Models\AccountingTransaction;
use App\Models\CashAccount;
use App\Models\Payment;
use Illuminate\Database\Migrations\Migration;

// Répare les soldes de caisse : les paiements d'écolage étaient créés sans
// cash_account_id, donc le solde n'était jamais crédité. On rattache les
// paiements/transactions existants à la caisse par défaut du moyen de paiement,
// puis on recalcule chaque solde depuis ses transactions.
return new class extends Migration
{
    public function up(): void
    {
        $methodToType = [
            'CASH' => 'CASH',
            'MOBILE_MONEY' => 'MOBILE_MONEY',
            'BANK_TRANSFER' => 'BANK',
            'CHEQUE' => 'BANK',
        ];

        // Caisse par défaut (1re active) pour chaque type.
        $defaultByType = [];
        foreach (['CASH', 'MOBILE_MONEY', 'BANK'] as $type) {
            $defaultByType[$type] = CashAccount::where('active', true)
                ->where('type', $type)->orderBy('created_at')->value('id');
        }

        // 1) Rattacher les paiements sans caisse.
        Payment::whereNull('cash_account_id')->get()->each(function (Payment $p) use ($methodToType, $defaultByType): void {
            $type = $methodToType[$p->payment_method] ?? 'CASH';
            if ($id = $defaultByType[$type] ?? null) {
                $p->updateQuietly(['cash_account_id' => $id]);
            }
        });

        // 2) Propager sur les transactions issues d'un paiement / annulation.
        AccountingTransaction::whereIn('reference_type', ['PAYMENT', 'CANCELLATION'])
            ->whereNull('cash_account_id')->get()
            ->each(function (AccountingTransaction $t): void {
                $accId = Payment::whereKey($t->reference_id)->value('cash_account_id');
                if ($accId) {
                    $t->updateQuietly(['cash_account_id' => $accId]);
                }
            });

        // 3) Recalculer chaque solde = somme INCOME − somme EXPENSE des transactions de la caisse.
        foreach (CashAccount::all() as $account) {
            $income = (float) AccountingTransaction::where('cash_account_id', $account->id)->where('type', 'INCOME')->sum('amount');
            $expense = (float) AccountingTransaction::where('cash_account_id', $account->id)->where('type', 'EXPENSE')->sum('amount');
            $account->updateQuietly(['balance' => $income - $expense]);
        }
    }

    public function down(): void
    {
        // Réparation de données : pas de rollback.
    }
};
