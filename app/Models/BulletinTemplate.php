<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BulletinTemplate extends Model
{
    use HasUuids;

    protected $fillable = [
        'school_id',
        'classroom_type_id',
        'name',
        'is_active',
        'columns',
        'options',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'columns' => 'array',
        'options' => 'array',
    ];

    /** Types de colonnes disponibles. */
    public const COLUMN_TYPES = [
        'subject' => 'Matière',
        'note' => 'Note',
        'coefficient' => 'Coefficient',
        'definitive' => 'Note définitive (moyenne × coef)',
        'rang' => 'Rang',
        'appreciation' => 'Appréciation',
        'teacher' => 'Professeur',
        'signature' => 'Signature',
        'text' => 'Texte libre',
    ];

    /** Sources fixes pour les colonnes de type « note ». */
    public const NOTE_SOURCES = [
        'classe' => 'Note de classe',
        'composition' => 'Composition',
        'moyenne' => 'Moyenne de période',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function classroomType(): BelongsTo
    {
        return $this->belongsTo(ClassroomType::class, 'classroom_type_id');
    }

    /** Colonnes par défaut (équivalent du bulletin Classe/Compo classique). */
    public static function defaultColumns(): array
    {
        return [
            ['key' => 'subject',      'label' => 'Matières',      'width' => 24, 'type' => 'subject',      'source' => null],
            ['key' => 'classe',       'label' => 'Devoir',        'width' => 9,  'type' => 'note',         'source' => 'classe'],
            ['key' => 'compo',        'label' => 'Compo',         'width' => 9,  'type' => 'note',         'source' => 'composition'],
            ['key' => 'coef',         'label' => 'Coef',          'width' => 6,  'type' => 'coefficient',  'source' => null],
            ['key' => 'moyenne',      'label' => 'Moy. {periode}', 'width' => 10, 'type' => 'note',        'source' => 'moyenne'],
            ['key' => 'rang',         'label' => 'Rang',          'width' => 7,  'type' => 'rang',         'source' => null],
            ['key' => 'appreciation', 'label' => 'Appréciations', 'width' => 18, 'type' => 'appreciation', 'source' => null],
            ['key' => 'teacher',      'label' => 'Professeur',    'width' => 17, 'type' => 'teacher',      'source' => null],
        ];
    }

    public static function defaultOptions(): array
    {
        return [
            'show_class_stats' => true,
            'show_period_recap' => false,
            'show_discipline' => false,
            'nb_text' => "Il n'est délivré qu'un seul bulletin.",
            'signataire_titulaire' => 'Le Titulaire',
            'signataire_chef' => "Le Chef d'Établissement",
        ];
    }

    /**
     * Résout le modèle applicable (spécifique au type de classe → défaut école → modèle par défaut transitoire).
     */
    public static function resolveOrDefault(?School $school, ?ClassroomType $type): self
    {
        if ($school) {
            $base = static::where('school_id', $school->id)->where('is_active', true);

            if ($type) {
                $specific = (clone $base)->where('classroom_type_id', $type->id)->first();
                if ($specific) {
                    return $specific;
                }
            }

            $default = (clone $base)->whereNull('classroom_type_id')->first();
            if ($default) {
                return $default;
            }
        }

        return new self([
            'name' => 'Par défaut',
            'columns' => static::defaultColumns(),
            'options' => static::defaultOptions(),
        ]);
    }

    /** Identifiants de types d'évaluation référencés par les colonnes (sources « type:<id> »). */
    public function referencedEvaluationTypeIds(): array
    {
        return collect($this->columns ?? [])
            ->pluck('source')
            ->filter(fn ($s) => is_string($s) && str_starts_with($s, 'type:'))
            ->map(fn ($s) => substr($s, 5))
            ->unique()->values()->all();
    }
}
