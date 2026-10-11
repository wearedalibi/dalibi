<?php

namespace App\Constants;

/**
 * Catégories de dépenses de l'établissement (liste fixe).
 * La clé est stockée en base (accounting_transactions.category) ; le libellé et
 * l'emoji ne servent qu'à l'affichage. Le front consomme self::options().
 */
class ExpenseCategories
{
    /** @var array<string, array{label: string, emoji: string}> */
    public const ALL = [
        'RENT' => ['label' => 'Loyer',         'emoji' => '🏠'],
        'ELECTRICITY' => ['label' => 'Électricité',   'emoji' => '⚡'],
        'WATER' => ['label' => 'Eau',           'emoji' => '💧'],
        'SUPPLIES' => ['label' => 'Fournitures',   'emoji' => '📦'],
        'SALARY' => ['label' => 'Personnel',     'emoji' => '👤'],
        'MAINTENANCE' => ['label' => 'Entretien',     'emoji' => '🔧'],
        'TRANSPORT' => ['label' => 'Transport',     'emoji' => '🚗'],
        'COMMUNICATION' => ['label' => 'Communication', 'emoji' => '📞'],
        'HEALTH' => ['label' => 'Santé',         'emoji' => '💊'],
        'FOOD' => ['label' => 'Alimentation',  'emoji' => '🍽️'],
        'TAX' => ['label' => 'Taxes & impôts', 'emoji' => '🧾'],
        'OTHER' => ['label' => 'Autre',         'emoji' => '📌'],
    ];

    /** Clés valides (pour la validation). */
    public static function keys(): array
    {
        return array_keys(self::ALL);
    }

    /** Libellé lisible d'une catégorie, ou null si inconnue. */
    public static function label(?string $key): ?string
    {
        return $key !== null ? (self::ALL[$key]['label'] ?? null) : null;
    }

    /** Liste pour les sélecteurs du front : [{value, label, emoji}]. */
    public static function options(): array
    {
        return array_map(
            fn (string $key, array $c) => ['value' => $key, 'label' => $c['label'], 'emoji' => $c['emoji']],
            array_keys(self::ALL),
            array_values(self::ALL),
        );
    }
}
