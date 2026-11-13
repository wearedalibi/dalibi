<?php

namespace App\Constants;

/**
 * Langues prises en charge par l'application (interface).
 *
 * Ajouter une langue = ajouter une entrée ici + les fichiers `lang/{code}/*.php`.
 */
class Locales
{
    /** Code de la langue par défaut. */
    public const DEFAULT = 'fr';

    /**
     * @return array<string, array{label: string, flag: string}>
     */
    public static function all(): array
    {
        return [
            'fr' => ['label' => 'Français', 'flag' => '🇫🇷'],
            'en' => ['label' => 'English', 'flag' => '🇬🇧'],
        ];
    }

    /** Codes valides (pour la validation). */
    public static function codes(): array
    {
        return array_keys(self::all());
    }

    /** Le code est-il une langue prise en charge ? */
    public static function isValid(?string $code): bool
    {
        return $code !== null && array_key_exists($code, self::all());
    }

    /** Libellé lisible d'un code (repli sur le code). */
    public static function label(?string $code): string
    {
        $code = $code ?: self::DEFAULT;

        return self::all()[$code]['label'] ?? $code;
    }

    /**
     * Options prêtes pour un sélecteur côté frontend.
     *
     * @return array<int, array{code: string, label: string, flag: string}>
     */
    public static function options(): array
    {
        $out = [];
        foreach (self::all() as $code => $def) {
            $out[] = ['code' => $code, 'label' => $def['label'], 'flag' => $def['flag']];
        }

        return $out;
    }
}
