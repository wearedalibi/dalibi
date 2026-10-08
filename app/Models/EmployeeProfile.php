<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmployeeProfile extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'employee_number',
        'job_title',
        'department',
        'contract_type',
        'salary_grade_id',
        'hire_date',
        'end_date',
        'base_salary',
        'payment_method',
        'bank_name',
        'bank_account',
        'momo_number',
        'cnss_number',
        'status',
        'notes',
    ];

    protected $casts = [
        'base_salary' => 'float',
        'hire_date' => 'date',
        'end_date' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }

    public function salaryGrade(): BelongsTo
    {
        return $this->belongsTo(SalaryGrade::class);
    }

    /** Primes / retenues récurrentes propres à l'employé (tracées). */
    public function allowances(): HasMany
    {
        return $this->hasMany(EmployeeAllowance::class);
    }

    /** Nom complet de l'employé (via le compte utilisateur). */
    public function fullName(): string
    {
        return trim(($this->user?->firstname ?? '').' '.($this->user?->lastname ?? ''));
    }

    /**
     * Salaire de base effectif : la grille prime ; à défaut, le montant saisi
     * manuellement (repli pour un employé pas encore classé).
     */
    public function effectiveBaseSalary(): float
    {
        return (float) ($this->salaryGrade?->base_amount ?? $this->base_salary);
    }
}
