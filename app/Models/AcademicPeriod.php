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
use Illuminate\Support\Collection;

class AcademicPeriod extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'description',
        'start_date',
        'end_date',
        'type',
        'order',
        'weight',
        'is_current',
        'academic_year_id',
        'class_type_id',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_current' => 'boolean',
        'weight' => 'decimal:2',
    ];

    /**
     * Get the academic year that owns the period.
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    /**
     * Get the class type this period is scoped to (null = toutes les classes).
     */
    public function classType(): BelongsTo
    {
        return $this->belongsTo(ClassroomType::class, 'class_type_id');
    }

    /**
     * Get evaluations attached to this academic period.
     */
    public function evaluations(): HasMany
    {
        return $this->hasMany(Evaluation::class, 'academic_period_id');
    }

    /**
     * Périodes applicables à un type de classe pour une année donnée.
     * Priorité aux périodes spécifiques au type ; sinon, périodes globales (class_type_id null).
     *
     * @return Collection<int, AcademicPeriod>
     */
    public static function forClassType(?string $academicYearId, ?string $classTypeId)
    {
        $query = static::query()
            ->when($academicYearId, fn ($q) => $q->where('academic_year_id', $academicYearId))
            ->orderBy('order');

        $specific = (clone $query)->where('class_type_id', $classTypeId)->get();

        if ($classTypeId && $specific->isNotEmpty()) {
            return $specific;
        }

        // Fallback : périodes globales (non rattachées à un type)
        return (clone $query)->whereNull('class_type_id')->get();
    }
}
