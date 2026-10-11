<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'enrollment_id',
        'invoice_number',
        'subtotal',
        'discount_amount',
        'total',
        'amount_paid',
        'amount_remaining',
        'status',
        'issued_at',
        'due_date',
        'notes',
    ];

    protected $casts = [
        'subtotal' => 'float',
        'discount_amount' => 'float',
        'total' => 'float',
        'amount_paid' => 'float',
        'amount_remaining' => 'float',
        'issued_at' => 'date',
        'due_date' => 'date',
    ];

    /* ------------------------------------------------------------------ */
    /* Relations */
    /* ------------------------------------------------------------------ */

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class)->orderBy('sort_order');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->latest('paid_at');
    }

    /* ------------------------------------------------------------------ */
    /* Business logic */
    /* ------------------------------------------------------------------ */

    /**
     * Recalcule tous les totaux et met à jour le statut de la facture.
     */
    public function recalculate(): void
    {
        $this->subtotal = (float) $this->items()->where('type', 'FEE')->sum('amount');
        $this->discount_amount = (float) $this->items()->where('type', 'DISCOUNT')->sum('amount');
        $this->total = max(0, $this->subtotal - $this->discount_amount);
        $this->amount_paid = (float) $this->payments()->sum('amount');
        $this->amount_remaining = max(0, $this->total - $this->amount_paid);

        if ($this->amount_paid <= 0) {
            $this->status = 'ISSUED';
        } elseif ($this->amount_remaining <= 0) {
            $this->status = 'PAID';
        } else {
            $this->status = 'PARTIALLY_PAID';
        }

        $this->save();
    }

    /**
     * Pourcentage payé (0-100).
     */
    public function paidPercentage(): float
    {
        if ($this->total <= 0) {
            return 100.0;
        }

        return min(100.0, round($this->amount_paid / $this->total * 100, 1));
    }
}
