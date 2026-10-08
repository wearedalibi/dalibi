<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class DocumentHeader extends Model
{
    use HasUuids;

    protected $fillable = [
        'school_id',
        'preset',
        'layout',
        'watermark',
    ];

    /** Préréglages d'en-tête disponibles. */
    public const PRESETS = [
        'ministeriel' => 'Ministériel (officiel)',
        'personnalise' => 'Personnalisé (glisser-déposer)',
    ];

    protected $casts = [
        'layout' => 'array',
        'watermark' => 'array',
    ];

    /** Largeur de référence du canevas = largeur utile d'une page A4 portrait (px @96dpi). */
    public const CANVAS_WIDTH = 760;

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    /**
     * Disposition par défaut générée à partir des champs de l'école.
     * Sert au bouton « Réinitialiser » et au seeder.
     *
     * @return array{layout: array<string, mixed>, watermark: array<string, mixed>}
     */
    public static function defaultLayout(School $school): array
    {
        $w = self::CANVAS_WIDTH;

        $elements = [
            // Bandeau supérieur : terme à gauche, devise à droite
            self::textElement(20, 8, $w - 40, '{{ecole.terme}}', 13, true, 'left'),
            self::textElement(20, 8, $w - 40, '{{ecole.devise}}', 10, false, 'right', '#444444', true),
            // Logo à gauche
            self::el('logo', 24, 40, 70, '', 0, false, 'left'),
            // Identité école au centre
            self::textElement(110, 44, $w - 220, '{{ecole.nom}}', 16, true, 'center'),
            self::textElement(110, 74, $w - 220, '{{ecole.bp}} – {{ecole.ville}} – {{ecole.telephone}}', 10, false, 'center', '#555555'),
        ];

        return [
            'layout' => [
                'width' => $w,
                'height' => 130,
                'elements' => $elements,
            ],
            'watermark' => [
                'enabled' => false,
                'type' => 'text',
                'text' => $school->name ?? '',
                'image_path' => null,
                'opacity' => 8,
                'size' => 60,
                'rotation' => -30,
                'color' => '#1a1a1a',
            ],
        ];
    }

    /** @return array<string, mixed> */
    private static function textElement(
        int $x,
        int $y,
        int $w,
        string $content,
        int $fontSize,
        bool $bold,
        string $align,
        string $color = '#1a1a1a',
        bool $italic = false,
    ): array {
        return self::el('text', $x, $y, $w, $content, $fontSize, $bold, $align, $color, $italic);
    }

    /** @return array<string, mixed> */
    private static function el(
        string $type,
        int $x,
        int $y,
        int $w,
        string $content,
        int $fontSize,
        bool $bold,
        string $align,
        string $color = '#1a1a1a',
        bool $italic = false,
    ): array {
        return [
            'id' => (string) Str::uuid(),
            'type' => $type,
            'x' => $x,
            'y' => $y,
            'w' => $w,
            'content' => $content,
            'fontSize' => $fontSize,
            'bold' => $bold,
            'italic' => $italic,
            'align' => $align,
            'color' => $color,
        ];
    }
}
