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

class Classroom extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'classes';

    protected $fillable = [
        'name',
        'code',
        'capacity',
        'expected_age',
        'active',
        'classroom_type_id',
    ];

    protected $casts = [
        'capacity' => 'integer',
        'expected_age' => 'integer',
        'active' => 'boolean',
    ];

    /**
     * Get the classroom type for this classroom.
     */
    public function type(): BelongsTo
    {
        return $this->belongsTo(ClassroomType::class, 'classroom_type_id');
    }

    /**
     * Alias for type() relationship.
     */
    public function classroomType(): BelongsTo
    {
        return $this->type();
    }

    /**
     * Get all attendances for this class.
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class, 'class_id');
    }

    /**
     * Get all class subjects for this class.
     */
    public function classSubjects(): HasMany
    {
        return $this->hasMany(ClassSubject::class, 'class_id');
    }

    /**
     * Get all evaluations for this class.
     */
    public function evaluations(): HasMany
    {
        return $this->hasMany(Evaluation::class, 'class_id');
    }
}
