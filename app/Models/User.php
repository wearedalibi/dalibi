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

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Concerns\Auditable;
use App\Constants\Roles;
use App\Services\MatriculeService;
use App\Traits\HasMatricule;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use Auditable, HasFactory, HasMatricule, HasRoles, HasUuids, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'natricule',
        'firstname',
        'lastname',
        'gender',
        'birth_date',
        'telephone',
        'profile',
        'email',
        'address',
        'password',
        'is_demo',
        'must_change_password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Accesseurs ajoutés à la sérialisation (le nom complet est calculé).
     *
     * @var list<string>
     */
    protected $appends = [
        'name',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'birth_date' => 'date',
            'is_demo' => 'boolean',
            'must_change_password' => 'boolean',
        ];
    }

    /**
     * Get the user's full name
     */
    protected function name(): Attribute
    {
        return Attribute::make(
            get: fn () => "{$this->firstname} {$this->lastname}",
        );
    }

    /** Profil RH (paie) de l'utilisateur, s'il est employé. */
    public function employeeProfile(): HasOne
    {
        return $this->hasOne(EmployeeProfile::class);
    }

    /** Affectations matières où l'utilisateur est l'enseignant. */
    public function subjectAssignments(): HasMany
    {
        return $this->hasMany(SubjectAssignment::class, 'teacher_id');
    }

    /** Créneaux d'emploi du temps où l'utilisateur est l'enseignant. */
    public function timetableSlots(): HasMany
    {
        return $this->hasMany(TimetableSlot::class, 'teacher_id');
    }

    public function isAdministrator(): bool
    {
        return $this->hasRole(Roles::ADMINISTRATOR);
    }

    public function isDirector(): bool
    {
        return $this->hasRole(Roles::DIRECTOR);
    }

    public function isTeacher(): bool
    {
        return $this->hasRole(Roles::TEACHER);
    }

    public function isAccounting(): bool
    {
        return $this->hasRole(Roles::ACCOUNTING);
    }

    public function isSecretariat(): bool
    {
        return $this->hasRole(Roles::SECRETARIAT);
    }

    /**
     * Générer un matricule pour cet utilisateur basé sur son rôle
     */
    public function generateMatricule(): string
    {
        $matriculeService = app(MatriculeService::class);

        // Obtenir le rôle principal de l'utilisateur
        $role = $this->roles?->first()?->name;

        if ($role) {
            return $matriculeService->generateUserMatricule($role);
        }

        // Fallback si pas de rôle assigné
        return $matriculeService->generateUserMatricule('administrator');
    }
}
