<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfficialExamRegistration extends Model
{
    use HasUuids;

    protected $fillable = [
        'official_exam_id', 'student_id', 'registration_number', 'serie', 'status', 'average', 'mention',
    ];

    protected $casts = [
        'average' => 'decimal:2',
    ];

    public const STATUSES = [
        'inscrit' => 'Inscrit',
        'admis' => 'Admis',
        'echoue' => 'Échoué',
        'absent' => 'Absent',
    ];

    public const MENTIONS = [
        'passable' => 'Passable',
        'assez_bien' => 'Assez bien',
        'bien' => 'Bien',
        'tres_bien' => 'Très bien',
    ];

    public function officialExam(): BelongsTo
    {
        return $this->belongsTo(OfficialExam::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
