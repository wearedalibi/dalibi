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
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClassroomType extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'description',
        'period_system',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    /** Systèmes de périodes disponibles + nombre de périodes. */
    public const PERIOD_SYSTEMS = [
        'trimestre' => 'Trimestre (3 périodes)',
        'semestre' => 'Semestre (2 périodes)',
    ];

    public const PERIOD_COUNT = [
        'trimestre' => 3,
        'semestre' => 2,
    ];

    public function periodsCount(): int
    {
        return self::PERIOD_COUNT[$this->period_system] ?? 3;
    }

    /**
     * Get all classrooms with this type.
     */
    public function classrooms(): HasMany
    {
        return $this->hasMany(Classroom::class, 'classroom_type_id');
    }

    /** Écoles qui proposent ce type de classe. */
    public function schools(): BelongsToMany
    {
        return $this->belongsToMany(School::class, 'class_type_school');
    }
}
