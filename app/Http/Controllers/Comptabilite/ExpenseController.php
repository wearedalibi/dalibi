<?php

/**
 * Projet : Système de Gestion Scolaire (SIGE) - Togo
 * Description : Gestion des élèves, des notes et des bulletins.
 * * Copyright (c) 2026 Kudayah Sassou Horacio Herve.
 */

namespace App\Http\Controllers\Comptabilite;

use App\Constants\ExpenseCategories;
use App\Http\Controllers\Controller;
use App\Models\AccountingTransaction;
use App\Models\CashAccount;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    /**
     * Page dédiée de saisie d'une nouvelle dépense.
     */
    public function create(): Response
    {
        $cashAccounts = CashAccount::where('active', true)
            ->orderBy('type')->orderBy('name')
            ->get(['id', 'name', 'type', 'balance']);

        // Dernières dépenses manuelles, pour repère à la saisie.
        $recent = AccountingTransaction::where('reference_type', 'EXPENSE')
            ->with('cashAccount:id,name,type')
            ->orderByDesc('transaction_date')
            ->limit(5)
            ->get(['id', 'amount', 'description', 'category', 'cash_account_id', 'transaction_date']);

        return Inertia::render('Comptabilite/Expenses/Create', [
            'cashAccounts' => $cashAccounts,
            'categories' => ExpenseCategories::options(),
            'recent' => $recent,
        ]);
    }

    /**
     * Store a manual expense transaction.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'description' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'in:'.implode(',', ExpenseCategories::keys())],
            'amount' => ['required', 'numeric', 'min:1', 'max:999999999'],
            'cash_account_id' => ['required', 'uuid', 'exists:cash_accounts,id'],
            'transaction_date' => ['required', 'date'],
        ], [
            'description.required' => 'La description est obligatoire.',
            'category.required' => 'Veuillez choisir une catégorie.',
            'category.in' => 'Catégorie invalide.',
            'amount.required' => 'Le montant est obligatoire.',
            'amount.min' => 'Le montant doit être supérieur à 0.',
            'cash_account_id.required' => 'Veuillez sélectionner une caisse.',
            'transaction_date.required' => 'La date est obligatoire.',
        ]);

        DB::transaction(function () use ($validated): void {
            AccountingTransaction::create([
                'type' => 'EXPENSE',
                'amount' => $validated['amount'],
                'description' => $validated['description'],
                'reference_type' => 'EXPENSE',
                'category' => $validated['category'],
                'cash_account_id' => $validated['cash_account_id'],
                'created_by' => auth()->id(),
                'transaction_date' => $validated['transaction_date'],
            ]);

            CashAccount::where('id', $validated['cash_account_id'])
                ->decrement('balance', $validated['amount']);
        });

        return redirect()->route('accounting.transactions')
            ->with('success', 'Dépense enregistrée avec succès.');
    }

    /**
     * Delete a manual expense transaction and reverse the balance.
     */
    public function destroy(AccountingTransaction $transaction): RedirectResponse
    {
        if ($transaction->reference_type !== 'EXPENSE') {
            return back()->withErrors(['delete' => 'Seules les dépenses manuelles peuvent être supprimées.']);
        }

        DB::transaction(function () use ($transaction): void {
            if ($transaction->cash_account_id) {
                CashAccount::where('id', $transaction->cash_account_id)
                    ->increment('balance', $transaction->amount);
            }

            $transaction->delete();
        });

        return back()->with('success', 'Dépense supprimée et solde de caisse restauré.');
    }
}
