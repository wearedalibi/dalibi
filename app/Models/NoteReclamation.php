<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NoteReclamation extends Model
{
    use HasUuids;

    protected $fillable = [
        'evaluation_id',
        'student_id',
        'requested_by',
        'reason',
        'original_score',
        'requested_score',
        'status',
        'reviewed_by',
        'reviewed_at',
        'corrected_score',
        'correction_note',
    ];

    protected $casts = [
        'original_score' => 'float',
        'requested_score' => 'float',
        'corrected_score' => 'float',
        'reviewed_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<Evaluation, $this>
     */
    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class);
    }

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
