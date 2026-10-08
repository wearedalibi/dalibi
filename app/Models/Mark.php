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

class Mark extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'evaluation_id',
        'student_id',
        'score',
        'absent',
        'comments',
        'created_by',
    ];

    protected $casts = [
        'score' => 'decimal:2',
        'absent' => 'boolean',
    ];

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
