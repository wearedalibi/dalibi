<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payslip extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'pay_run_id',
        'employee_profile_id',
        'reference',
        'gross',
        'total_deductions',
        'net',
        'payload',
        'accounting_transaction_id',
    ];

    protected $casts = [
        'gross' => 'float',
        'total_deductions' => 'float',
        'net' => 'float',
        'payload' => 'array',
    ];

    public function payRun(): BelongsTo
    {
        return $this->belongsTo(PayRun::class);
    }

    public function employeeProfile(): BelongsTo
    {
        return $this->belongsTo(EmployeeProfile::class);
    }
}
