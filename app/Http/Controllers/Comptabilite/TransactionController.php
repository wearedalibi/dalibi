<?php

namespace App\Http\Controllers\Comptabilite;

use App\Constants\ExpenseCategories;
use App\Http\Controllers\Controller;
use App\Models\AccountingTransaction;
use App\Models\CashAccount;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TransactionController extends Controller
{
    public function index(Request $request): Response
    {
        $query = AccountingTransaction::query()
            ->with(['cashAccount:id,name,type', 'createdBy:id,firstname,lastname'])
            ->when($request->type, fn ($q) => $q->where('type', $request->type))
            ->when($request->reference_type, fn ($q) => $q->where('reference_type', $request->reference_type))
            ->when($request->category, fn ($q) => $q->where('category', $request->category))
            ->when($request->cash_account_id, fn ($q) => $q->where('cash_account_id', $request->cash_account_id))
            ->when($request->date_from, fn ($q) => $q->whereDate('transaction_date', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('transaction_date', '<=', $request->date_to))
            ->orderByDesc('transaction_date');

        $perPage = in_array((int) $request->per_page, [10, 25, 50, 100], true)
            ? (int) $request->per_page
            : 25;

        $transactions = $query->paginate($perPage)->withQueryString();

        // Totaux globaux (sans pagination)
        $totals = AccountingTransaction::query()
            ->when($request->type, fn ($q) => $q->where('type', $request->type))
            ->when($request->reference_type, fn ($q) => $q->where('reference_type', $request->reference_type))
            ->when($request->category, fn ($q) => $q->where('category', $request->category))
            ->when($request->cash_account_id, fn ($q) => $q->where('cash_account_id', $request->cash_account_id))
            ->when($request->date_from, fn ($q) => $q->whereDate('transaction_date', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('transaction_date', '<=', $request->date_to))
            ->selectRaw("
                coalesce(sum(case when type = 'INCOME'  then amount end), 0) as total_income,
                coalesce(sum(case when type = 'EXPENSE' then amount end), 0) as total_expense,
                count(*) as total_count
            ")
            ->first();

        // Solde global des caisses
        $cashSummary = CashAccount::where('active', true)
            ->select('id', 'name', 'type', 'balance')
            ->orderBy('type')
            ->orderBy('name')
            ->get();

        return Inertia::render('Comptabilite/Accounting/Transactions', [
            'transactions' => $transactions,
            'cashAccounts' => CashAccount::where('active', true)->orderBy('name')->get(['id', 'name', 'type']),
            'cashSummary' => $cashSummary,
            'categories' => ExpenseCategories::options(),
            'totals' => $totals,
            'filters' => $request->only(['type', 'reference_type', 'category', 'cash_account_id', 'date_from', 'date_to', 'per_page']),
            'perPage' => $perPage,
        ]);
    }
}
