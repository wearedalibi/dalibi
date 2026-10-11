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
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Enrollment extends Model
{
    use Auditable, HasFactory, HasUuids;

    protected $fillable = [
        'school_id',
        'student_id',
        'class_id',
        'academic_year_id',
        'enrollment_code',
        'enrolled_by',
        'enrollment_date',
        'status',
        'academic_status',
        'status_reason',
        'status_changed_at',
    ];

    protected $casts = [
        'enrollment_date' => 'date',
        'status_changed_at' => 'datetime',
    ];

    /**
     * Statuts d'inscription, en MAJUSCULES — la base impose la contrainte
     * `status IN ('PENDING','ACTIVE','CANCELLED')`. Comparer à 'active' en
     * minuscules ne remonte aucune ligne : passez toujours par ces constantes
     * ou par le scope `active()`.
     */
    public const STATUS_PENDING = 'PENDING';

    public const STATUS_ACTIVE = 'ACTIVE';

    public const STATUS_CANCELLED = 'CANCELLED';

    public const STATUSES = [self::STATUS_PENDING, self::STATUS_ACTIVE, self::STATUS_CANCELLED];

    /** Inscriptions actives. */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where($query->qualifyColumn('status'), self::STATUS_ACTIVE);
    }

    /** Statuts académiques (distincts du statut de paiement). */
    public const ACADEMIC_STATUSES = [
        'en_cours' => 'En cours',
        'valide' => 'Validé',
        'non_valide' => 'Non validé',
        'abandon' => 'Abandon',
        'transfere' => 'Transféré',
    ];

    /** Statuts considérés comme « scolarité active » (présents à l'appel). */
    public const ACTIVE_ACADEMIC_STATUSES = ['en_cours', 'valide', 'non_valide'];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class, 'class_id');
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id');
    }

    public function enrolledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'enrolled_by');
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }
}
