<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayRun extends Model
{
    use HasFactory, HasUuids;

    public const DRAFT = 'draft';

    public const VALIDATED = 'validated';

    public const PAID = 'paid';

    public const CANCELLED = 'cancelled';

    protected $fillable = [
        'reference',
        'period_month',
        'period_year',
        'label',
        'status',
        'total_gross',
        'total_deductions',
        'total_net',
        'cash_account_id',
        'notes',
        'validated_at',
        'paid_at',
        'created_by',
    ];

    protected $casts = [
        'period_month' => 'integer',
        'period_year' => 'integer',
        'total_gross' => 'float',
        'total_deductions' => 'float',
        'total_net' => 'float',
        'validated_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }

    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(CashAccount::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Libellé « Juillet 2026 » de la période. */
    public function periodLabel(): string
    {
        $months = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

        return ($months[$this->period_month] ?? $this->period_month).' '.$this->period_year;
    }
}
