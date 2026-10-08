<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GradingConfig extends Model
{
    use HasUuids;

    protected $fillable = [
        'school_id',
        'classroom_type_id',
        'name',
        'is_active',
        'passing_score',
        'default_max_score',
        'class_weight',
        'comp_weight',
        'round_precision',
        'mentions',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'passing_score' => 'float',
        'default_max_score' => 'float',
        'class_weight' => 'float',
        'comp_weight' => 'float',
        'round_precision' => 'integer',
        'mentions' => 'array',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    /** Type de classe ciblé (null = configuration par défaut de l'école). */
    public function classroomType(): BelongsTo
    {
        return $this->belongsTo(ClassroomType::class, 'classroom_type_id');
    }

    /** Mentions par défaut (seuils décroissants), incluant les paliers d'avertissement. */
    public static function defaultMentions(): array
    {
        return [
            ['label' => "Tableau d'honneur",      'min' => 18],
            ['label' => 'Félicitations',          'min' => 16],
            ['label' => 'Encouragements',         'min' => 14],
            ['label' => 'Passable',               'min' => 10],
            ['label' => 'Insuffisant',            'min' => 8],
            ['label' => 'Avertissement (travail)', 'min' => 0],
        ];
    }

    /**
     * Résout la configuration applicable : config active spécifique au type de classe,
     * sinon config active « par défaut école » (classroom_type_id null).
     */
    public static function resolveFor(?School $school, ?ClassroomType $type): ?self
    {
        if (! $school) {
            return null;
        }

        $base = static::where('school_id', $school->id)->where('is_active', true);

        if ($type) {
            $specific = (clone $base)->where('classroom_type_id', $type->id)->first();
            if ($specific) {
                return $specific;
            }
        }

        return (clone $base)->whereNull('classroom_type_id')->first();
    }

    /**
     * Comme resolveFor(), mais renvoie toujours une configuration (transitoire si rien en base),
     * pour que les calculs disposent de valeurs cohérentes.
     */
    public static function resolveOrDefault(?School $school, ?ClassroomType $type): self
    {
        return static::resolveFor($school, $type) ?? new self([
            'name' => 'Par défaut',
            'passing_score' => 10,
            'default_max_score' => 20,
            'class_weight' => 1,
            'comp_weight' => 1,
            'round_precision' => 2,
            'mentions' => static::defaultMentions(),
        ]);
    }

    /** Mention correspondant à une moyenne, selon les seuils configurés. */
    public function mentionFor(?float $average): ?string
    {
        if ($average === null) {
            return null;
        }

        $mentions = collect($this->mentions ?: static::defaultMentions())
            ->sortByDesc(fn ($m) => (float) ($m['min'] ?? 0));

        foreach ($mentions as $mention) {
            if ($average >= (float) ($mention['min'] ?? 0)) {
                return $mention['label'] ?? null;
            }
        }

        return null;
    }
}
