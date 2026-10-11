<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountingTransaction extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'accounting_transactions';

    protected $fillable = [
        'type',             // INCOME | EXPENSE
        'amount',
        'description',
        'reference_type',   // PAYMENT | SCHOLARSHIP | EXPENSE | CANCELLATION
        'category',         // clé ExpenseCategories (dépenses uniquement, nullable)
        'reference_id',
        'cash_account_id',
        'created_by',
        'transaction_date',
    ];

    protected $casts = [
        'amount' => 'float',
        'transaction_date' => 'datetime',
    ];

    /* ------------------------------------------------------------------ */
    /* Relations */
    /* ------------------------------------------------------------------ */

    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(CashAccount::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
