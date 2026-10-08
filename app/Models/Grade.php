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

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Grade extends Model
{
    use Auditable, HasFactory, HasUuids;

    protected $fillable = [
        'student_id',
        'class_subject_id',
        'academic_period_id',
        'term',
        'score',
        'comments',
    ];

    protected $casts = [
        'score' => 'decimal:2',
    ];

    /**
     * Get the student for this grade.
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * Get the class subject for this grade.
     */
    public function classSubject(): BelongsTo
    {
        return $this->belongsTo(ClassSubject::class);
    }

    /**
     * Get the academic period for this grade.
     */
    public function academicPeriod(): BelongsTo
    {
        return $this->belongsTo(AcademicPeriod::class);
    }
}
