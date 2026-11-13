<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

class DocumentTag extends Model
{
    use HasUuids;

    protected $fillable = ['name', 'slug', 'color'];

    /**
     * @return BelongsToMany<ArchivedDocument, $this>
     */
    public function documents(): BelongsToMany
    {
        return $this->belongsToMany(ArchivedDocument::class, 'archived_document_tag');
    }

    /** Récupère (ou crée) un tag à partir d'un nom libre. */
    public static function resolve(string $name, string $color = '#64748b'): self
    {
        $slug = Str::slug($name);

        return static::firstOrCreate(
            ['slug' => $slug],
            ['name' => trim($name), 'color' => $color],
        );
    }
}
