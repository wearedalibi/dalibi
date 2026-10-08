<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalaryComponent extends Model
{
    use HasFactory, HasUuids;

    public const EARNING = 'earning';

    public const DEDUCTION = 'deduction';

    protected $fillable = [
        'name',
        'code',
        'type',
        'default_amount',
        'is_default',
        'active',
        'sort_order',
    ];

    protected $casts = [
        'default_amount' => 'float',
        'is_default' => 'boolean',
        'active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
