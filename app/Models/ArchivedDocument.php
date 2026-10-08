<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ArchivedDocument extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'reference', 'title', 'description', 'category',
        'path', 'disk', 'original_name', 'mime', 'size',
        'documentable_type', 'documentable_id',
        'retention_until', 'archived_by', 'archived_at',
    ];

    protected $casts = [
        'size' => 'integer',
        'retention_until' => 'date',
        'archived_at' => 'datetime',
    ];

    /** Catégories d'archivage (clé => libellé). */
    public const CATEGORIES = [
        'administratif' => 'Administratif',
        'rh' => 'Ressources humaines',
        'comptable' => 'Comptable',
        'juridique' => 'Juridique',
        'courrier' => 'Courrier',
        'pedagogique' => 'Pédagogique',
        'autre' => 'Autre',
    ];

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(DocumentTag::class, 'archived_document_tag');
    }

    public function archivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'archived_by');
    }

    public function documentable(): MorphTo
    {
        return $this->morphTo();
    }

    /** Génère une référence séquentielle ARC-AAAA-0001. */
    public static function nextReference(): string
    {
        $year = now()->year;
        $count = static::withTrashed()->whereYear('archived_at', $year)->count() + 1;

        return sprintf('ARC-%d-%04d', $year, $count);
    }
}
