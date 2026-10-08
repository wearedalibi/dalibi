<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Backup extends Model
{
    use HasUuids;

    protected $fillable = [
        'filename', 'path', 'disk', 'format', 'size', 'checksum', 'includes_media',
        'status', 'error', 'scheduled', 'created_by', 'academic_year_id', 'label', 'locked',
    ];

    protected $casts = [
        'size' => 'integer',
        'scheduled' => 'boolean',
        'locked' => 'boolean',
        'includes_media' => 'boolean',
    ];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id');
    }
}
