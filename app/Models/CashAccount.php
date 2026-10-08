<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashAccount extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'type',
        'balance',
        'active',
        'description',
    ];

    protected $casts = [
        'balance' => 'float',
        'active' => 'boolean',
    ];

    /* ------------------------------------------------------------------ */
    /* Relations */
    /* ------------------------------------------------------------------ */

    public function transactions(): HasMany
    {
        return $this->hasMany(AccountingTransaction::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /* ------------------------------------------------------------------ */
    /* Helpers */
    /* ------------------------------------------------------------------ */

    public function typeLabel(): string
    {
        return match ($this->type) {
            'CASH' => 'Espèces',
            'MOBILE_MONEY' => 'Mobile Money',
            'BANK' => 'Banque',
            default => $this->type,
        };
    }
}
