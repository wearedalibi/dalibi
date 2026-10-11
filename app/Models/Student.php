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
use App\Concerns\HasResetToken;
use App\Services\MatriculeService;
use Illuminate\Auth\Authenticatable as AuthenticatableTrait;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;

class Student extends Model implements AuthenticatableContract
{
    use Auditable, AuthenticatableTrait, HasApiTokens, HasFactory, HasResetToken, HasUuids, SoftDeletes;

    protected $fillable = [
        'user_id',
        'matricule',
        'firstname',
        'lastname',
        'gender',
        'birth_date',
        'place_of_birth',
        'nationality',
        'address',
        'city',
        'region',
        'prefecture',
        'phone',
        'email',
        'profile_photo',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
        'birth_date' => 'date',
        'portal_active' => 'boolean',
        'email_verified_at' => 'datetime',
        'reset_expires_at' => 'datetime',
        'password' => 'hashed',
    ];

    protected $hidden = [
        'password',
        'reset_token',
    ];

    /** Tuteurs liés à cet élève. */
    public function guardians(): BelongsToMany
    {
        return $this->belongsToMany(Guardian::class, 'guardian_student')->withPivot('relationship');
    }

    /** Inscriptions de l'élève. */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    /**
     * Get the user account for this student.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all attendances for this student.
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /**
     * Get all grades for this student.
     */
    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    /**
     * Informations administratives de l'élève.
     */
    public function information(): HasOne
    {
        return $this->hasOne(StudentInformation::class);
    }

    /**
     * Informations parentales de l'élève.
     */
    public function parentInfo(): HasOne
    {
        return $this->hasOne(StudentParent::class);
    }

    /**
     * Informations médicales de l'élève.
     */
    public function medicalInfo(): HasOne
    {
        return $this->hasOne(StudentMedicalInfo::class);
    }

    /**
     * Get all scholarships for this student.
     */
    public function scholarships(): HasMany
    {
        return $this->hasMany(StudentScholarship::class);
    }

    /**
     * Get all documents (pièces justificatives) for this student.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(StudentDocument::class);
    }

    /** Dossier de stockage privé propre à l'élève. */
    public function storageFolder(): string
    {
        return 'students/'.$this->id;
    }

    /**
     * Générer un matricule pour cet élève
     */
    public function generateMatricule(): string
    {
        $matriculeService = app(MatriculeService::class);

        return $matriculeService->generateStudentMatricule();
    }

    protected static function booted(): void
    {
        static::creating(function (self $student): void {
            if (empty($student->matricule)) {
                $student->matricule = $student->generateMatricule();
            }

            if (empty($student->user_id)) {
                $student->user_id = auth()->id();
            }
        });
    }
}
