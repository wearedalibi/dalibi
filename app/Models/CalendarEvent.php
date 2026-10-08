<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalendarEvent extends Model
{
    use Auditable, HasUuids;

    protected $fillable = [
        'title',
        'description',
        'type',
        'start_date',
        'end_date',
        'all_day',
        'start_time',
        'end_time',
        'color',
        'academic_year_id',
        'created_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'all_day' => 'boolean',
    ];

    /** Types d'événements (clé => libellé). */
    public const TYPES = [
        'holiday' => 'Congé / vacances',
        'exam' => 'Examen',
        'meeting' => 'Réunion',
        'event' => 'Événement',
        'other' => 'Autre',
    ];

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
