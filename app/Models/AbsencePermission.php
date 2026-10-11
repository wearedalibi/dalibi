<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class AbsencePermission extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'student_id',
        'requested_by',
        'reviewed_by',
        'start_date',
        'end_date',
        'reason',
        'description',
        'status',
        'review_comment',
        'reviewed_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'reviewed_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class, 'permission_id');
    }

    /**
     * Approuve la permission et marque automatiquement les records de présence
     * correspondant à la période comme "excused".
     */
    public function approve(string $reviewerId, ?string $comment = null): void
    {
        DB::transaction(function () use ($reviewerId, $comment): void {
            $this->update([
                'status' => 'approved',
                'reviewed_by' => $reviewerId,
                'review_comment' => $comment,
                'reviewed_at' => now(),
            ]);

            // Marque auto les appels existants dans la plage de dates
            AttendanceRecord::where('student_id', $this->student_id)
                ->whereHas('attendance', function ($q): void {
                    $q->whereBetween('date', [$this->start_date, $this->end_date]);
                })
                ->whereIn('status', ['absent'])
                ->update([
                    'status' => 'excused',
                    'permission_id' => $this->id,
                ]);
        });
    }

    /**
     * Rejette la permission.
     */
    public function reject(string $reviewerId, ?string $comment = null): void
    {
        $this->update([
            'status' => 'rejected',
            'reviewed_by' => $reviewerId,
            'review_comment' => $comment,
            'reviewed_at' => now(),
        ]);
    }
}
