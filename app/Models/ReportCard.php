<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportCard extends Model
{
    use Auditable, HasUuids;

    protected $fillable = [
        'student_id',
        'academic_period_id',
        'class_id',
        'academic_year_id',
        'reference',
        'average',
        'rank',
        'mention',
        'payload',
        'locked_at',
        'generated_by',
    ];

    protected $casts = [
        'payload' => 'array',
        'average' => 'float',
        'rank' => 'integer',
        'locked_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function academicPeriod(): BelongsTo
    {
        return $this->belongsTo(AcademicPeriod::class);
    }

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class, 'class_id');
    }

    public function generatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
