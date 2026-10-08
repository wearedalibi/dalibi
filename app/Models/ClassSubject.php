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
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClassSubject extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'class_id',
        'subject_id',
        'coefficient',
        'group',
        'academic_year_id',
    ];

    protected $casts = [
        'coefficient' => 'decimal:2',
    ];

    /** Groupes de matières (bulletin). */
    public const GROUPS = [
        'obligatoire' => 'Matières obligatoires',
        'facultatif' => 'Matières facultatives',
    ];

    /**
     * Get the class this assignment belongs to.
     */
    public function class(): BelongsTo
    {
        return $this->belongsTo(Classroom::class, 'class_id');
    }

    /**
     * Get the subject for this assignment.
     */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Get the academic year for this class-subject assignment.
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    /**
     * Get all grades for this class-subject combination.
     */
    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    /**
     * Get all evaluations for this class-subject combination.
     */
    public function evaluations(): HasMany
    {
        return $this->hasMany(Evaluation::class);
    }

    /**
     * Calcule la moyenne d'un élève pour cette matière sur une période donnée.
     */
    public function studentAverage(string $studentId, string $academicPeriodId): ?float
    {
        $evaluations = $this->evaluations()
            ->whereHas('template', fn ($q) => $q->where('academic_period_id', $academicPeriodId))
            ->with(['template:id,coefficient', 'marks' => fn ($q) => $q->where('student_id', $studentId)])
            ->get();

        $totalCoeff = 0;
        $weightedSum = 0;
        $hasAny = false;

        foreach ($evaluations as $eval) {
            $mark = $eval->marks->first();
            if ($mark && ! $mark->absent && $mark->score !== null) {
                $coeff = (float) $eval->template->coefficient;
                $totalCoeff += $coeff;
                $weightedSum += (float) $mark->score * $coeff;
                $hasAny = true;
            }
        }

        return ($hasAny && $totalCoeff > 0) ? round($weightedSum / $totalCoeff, 2) : null;
    }
}
