<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalaryGrade extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'category',
        'echelon',
        'base_amount',
        'active',
        'sort_order',
    ];

    protected $casts = [
        'base_amount' => 'float',
        'echelon' => 'integer',
        'active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function employeeProfiles(): HasMany
    {
        return $this->hasMany(EmployeeProfile::class);
    }
}
