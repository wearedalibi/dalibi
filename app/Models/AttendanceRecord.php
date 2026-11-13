<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceRecord extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'attendance_id',
        'student_id',
        'status',
        'permission_id',
        'minutes_late',
        'comment',
    ];

    protected $casts = [
        'minutes_late' => 'integer',
    ];

    /**
     * @return BelongsTo<Attendance, $this>
     */
    public function attendance(): BelongsTo
    {
        return $this->belongsTo(Attendance::class);
    }

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * @return BelongsTo<AbsencePermission, $this>
     */
    public function permission(): BelongsTo
    {
        return $this->belongsTo(AbsencePermission::class, 'permission_id');
    }
}
