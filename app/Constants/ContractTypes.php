<?php

namespace App\Constants;

/**
 * Types de contrat du personnel (contexte togolais).
 */
class ContractTypes
{
    /** @var array<string, string> */
    public const ALL = [
        'CDI' => 'CDI (permanent)',
        'CDD' => 'CDD (durée déterminée)',
        'VACATAIRE' => 'Vacataire (payé à l\'heure)',
        'STAGIAIRE' => 'Stagiaire',
    ];

    public static function keys(): array
    {
        return array_keys(self::ALL);
    }

    public static function label(?string $key): ?string
    {
        return $key !== null ? (self::ALL[$key] ?? null) : null;
    }

    /** @return array<int, array{value:string, label:string}> */
    public static function options(): array
    {
        return array_map(
            fn (string $k, string $l) => ['value' => $k, 'label' => $l],
            array_keys(self::ALL),
            array_values(self::ALL),
        );
    }
}
