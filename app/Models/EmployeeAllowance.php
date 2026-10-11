<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeAllowance extends Model
{
    use HasFactory, HasUuids;

    public const MODE_FIXED = 'fixed';

    public const MODE_PERCENT_BASE = 'percent_base';

    protected $fillable = [
        'employee_profile_id',
        'type',            // earning | deduction
        'label',
        'mode',            // fixed | percent_base
        'amount',
        'reason',
        'starts_on',
        'ends_on',
        'active',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'float',
        'starts_on' => 'date',
        'ends_on' => 'date',
        'active' => 'boolean',
    ];

    public function employeeProfile(): BelongsTo
    {
        return $this->belongsTo(EmployeeProfile::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Vrai si la prime s'applique à la période (mois/année) donnée. */
    public function appliesTo(int $month, int $year): bool
    {
        if (! $this->active) {
            return false;
        }

        // Dernier jour du mois de la période.
        $periodEnd = Carbon::create($year, $month, 1)->endOfMonth();
        $periodStart = $periodEnd->copy()->startOfMonth();

        if ($this->starts_on && $this->starts_on->gt($periodEnd)) {
            return false;
        }
        if ($this->ends_on && $this->ends_on->lt($periodStart)) {
            return false;
        }

        return true;
    }

    /** Montant effectif pour un salaire de base donné (gère le mode %). */
    public function computeAmount(float $base): float
    {
        return $this->mode === self::MODE_PERCENT_BASE
            ? round($base * $this->amount / 100, 2)
            : (float) $this->amount;
    }
}
