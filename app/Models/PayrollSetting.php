<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class PayrollSetting extends Model
{
    use HasUuids;

    protected $fillable = [
        'seniority_enabled',
        'seniority_rate_per_year',
        'seniority_cap_percent',
        'cnss_enabled',
        'cnss_employee_rate',
        'cnss_employer_rate',
        'cnss_ceiling',
        'its_enabled',
        'its_brackets',
    ];

    protected $casts = [
        'seniority_enabled' => 'boolean',
        'seniority_rate_per_year' => 'float',
        'seniority_cap_percent' => 'float',
        'cnss_enabled' => 'boolean',
        'cnss_employee_rate' => 'float',
        'cnss_employer_rate' => 'float',
        'cnss_ceiling' => 'float',
        'its_enabled' => 'boolean',
        'its_brackets' => 'array',
    ];

    /** Réglages courants (singleton) — créés avec les valeurs par défaut si absents. */
    public static function current(): self
    {
        return static::firstOrCreate([]);
    }
}
