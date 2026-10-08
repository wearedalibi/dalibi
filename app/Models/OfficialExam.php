<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OfficialExam extends Model
{
    use HasUuids;

    protected $fillable = [
        'school_id', 'academic_year_id', 'class_id', 'type', 'name', 'year', 'session', 'exam_date', 'center', 'status',
    ];

    protected $casts = [
        'exam_date' => 'date',
        'year' => 'integer',
    ];

    public const TYPES = [
        'cepd' => 'CEPD (Certificat d\'Études du Premier Degré)',
        'bepc' => 'BEPC (Brevet d\'Études du Premier Cycle)',
        'bac' => 'Baccalauréat',
    ];

    public const SESSIONS = [
        'normale' => 'Session normale',
        'rattrapage' => 'Session de rattrapage',
    ];

    public const STATUSES = [
        'ouvert' => 'Inscriptions ouvertes',
        'clos' => 'Inscriptions closes',
        'termine' => 'Terminé',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class, 'class_id');
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(OfficialExamRegistration::class);
    }

    public function typeLabel(): string
    {
        return self::TYPES[$this->type] ?? $this->type;
    }
}
