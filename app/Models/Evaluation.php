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

class Evaluation extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'evaluation_template_id',
        'class_subject_id',
        'date',
        'start_time',
        'status',
        'locked_at',
        'locked_by',
    ];

    protected $casts = [
        'date' => 'date',
        'locked_at' => 'datetime',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(EvaluationTemplate::class, 'evaluation_template_id');
    }

    public function classSubject(): BelongsTo
    {
        return $this->belongsTo(ClassSubject::class);
    }

    public function marks(): HasMany
    {
        return $this->hasMany(Mark::class);
    }

    /**
     * Moyenne de cet examen (pour stats).
     */
    public function averageScore(): ?float
    {
        $scores = $this->marks()->whereNotNull('score')->where('absent', false)->pluck('score');

        return $scores->count() > 0 ? round($scores->avg(), 2) : null;
    }
}
