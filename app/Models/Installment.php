<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Installment extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'fee_structure_id',
        'name',
        'installment_number',
        'amount',
        'due_date',
        'academic_period_id',
    ];

    protected $casts = [
        'amount' => 'float',
        'installment_number' => 'integer',
        'due_date' => 'date',
    ];

    /* ------------------------------------------------------------------ */
    /* Relations */
    /* ------------------------------------------------------------------ */

    public function feeStructure(): BelongsTo
    {
        return $this->belongsTo(FeeStructure::class);
    }

    public function academicPeriod(): BelongsTo
    {
        return $this->belongsTo(AcademicPeriod::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /* ------------------------------------------------------------------ */
    /* Computed helpers */
    /* ------------------------------------------------------------------ */

    public function amountPaid(): float
    {
        return (float) $this->payments()->sum('amount');
    }

    public function amountRemaining(): float
    {
        return max(0.0, $this->amount - $this->amountPaid());
    }

    public function isPaid(): bool
    {
        return $this->amountRemaining() <= 0.0;
    }

    public function isOverdue(): bool
    {
        return $this->due_date !== null
            && $this->due_date->isPast()
            && ! $this->isPaid();
    }

    /**
     * Returns: PAID | OVERDUE | DUE | PENDING
     */
    public function status(): string
    {
        if ($this->isPaid()) {
            return 'PAID';
        }

        if ($this->isOverdue()) {
            return 'OVERDUE';
        }

        return $this->due_date !== null && $this->due_date->isToday() ? 'DUE' : 'PENDING';
    }
}
