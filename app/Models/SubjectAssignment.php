<?php

/**
 * Projet : Système de Gestion Scolaire (SIGE) - Togo
 * Description : Gestion des élèves, des notes et des bulletins.
 * * Copyright (c) 2026 Kudayah Sassou Horacio Herve.
 * * Ce programme est un logiciel libre : vous pouvez le redistribuer et/ou le modifier
 * selon les termes de la Licence Publique Générale GNU (GPL v3) telle que publiée
 * par la Free Software Foundation.
 * * Ce programme est distribué dans l'espoir qu'il sera utile, mais SANS AUCUNE GARANTIE ;
 * sans même la garantie implicite de COMMERCIALISATION ou d'ADÉQUATION À UN BUT PARTICULIER.
 * Consultez la Licence Publique Générale GNU pour plus de détails.
 * * Vous devriez avoir reçu une copie de la Licence Publique Générale GNU
 * avec ce programme. Sinon, voir <https://www.gnu.org/licenses/>.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubjectAssignment extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'subject_id',
        'teacher_id',
        'academic_year_id',
        'class_id',
        'active',
        'notes',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    /**
     * Get the subject for this assignment.
     */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Get the teacher (user) for this assignment.
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * Get the academic year for this assignment.
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    /**
     * Get the class (classroom) for this assignment.
     */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class, 'class_id');
    }
}
