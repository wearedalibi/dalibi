<?php

/**
 * Projet : Système de Gestion Scolaire (SIGE) - Togo
 * Copyright (c) 2026 Kudayah Sassou Horacio Herve. GPL v3.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EvaluationTemplate extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'academic_period_id',
        'evaluation_type_id',
        'class_type_id',
        'name',
        'description',
        'coefficient',
        'max_score',
        'date',
    ];

    protected $casts = [
        'coefficient' => 'decimal:2',
        'max_score' => 'decimal:2',
        'date' => 'date',
    ];

    /**
     * @return BelongsTo<AcademicPeriod, $this>
     */
    public function academicPeriod(): BelongsTo
    {
        return $this->belongsTo(AcademicPeriod::class);
    }

    /**
     * @return BelongsTo<ClassroomType, $this>
     */
    public function classType(): BelongsTo
    {
        return $this->belongsTo(ClassroomType::class, 'class_type_id');
    }

    /**
     * @return BelongsTo<EvaluationType, $this>
     */
    public function evaluationType(): BelongsTo
    {
        return $this->belongsTo(EvaluationType::class);
    }

    /**
     * @return HasMany<Evaluation, $this>
     */
    public function evaluations(): HasMany
    {
        return $this->hasMany(Evaluation::class);
    }
}
