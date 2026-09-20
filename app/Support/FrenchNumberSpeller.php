<?php

namespace App\Support;

use App\Constants\Currencies;

/**
 * Conversion d'un entier en toutes lettres (français), pour les documents
 * officiels — reçus et factures — où le montant doit apparaître en lettres.
 *
 * Gère les particularités françaises : « et un » (21, 71), « quatre-vingts »
 * pluriel uniquement en fin de nombre, « cent(s) » pluriel seulement s'il n'est
 * suivi d'aucun autre mot-nombre, et « mille » invariable.
 *
 * Aucune dépendance (n'utilise pas ext-intl) afin de rester déterministe et
 * disponible quel que soit l'environnement.
 */
class FrenchNumberSpeller
{
    /** 0 à 19 en toutes lettres. */
    private const UNITS = [
        'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
        'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
        'dix-sept', 'dix-huit', 'dix-neuf',
    ];

    /** Dizaines à racine simple (20 à 60). */
    private const TENS = [
        2 => 'vingt', 3 => 'trente', 4 => 'quarante', 5 => 'cinquante', 6 => 'soixante',
    ];

    /**
     * Nom de la monnaie au pluriel, pour la mention « en lettres ».
     * Repli : le symbole d'affichage de la monnaie.
     */
    private const CURRENCY_WORDS = [
        'XOF' => 'francs CFA',
        'XAF' => 'francs CFA',
        'GNF' => 'francs guinéens',
        'EUR' => 'euros',
        'USD' => 'dollars américains',
        'GHS' => 'cedis',
        'NGN' => 'nairas',
    ];

    /** Montant en toutes lettres suivi de la monnaie, ex. « Douze mille francs CFA ». */
    public static function money(float|int $amount, ?string $currencyCode = null): string
    {
        $code  = $currencyCode ?: Currencies::DEFAULT;
        $words = self::spell((int) round($amount));
        $unit  = self::CURRENCY_WORDS[$code] ?? Currencies::symbol($code);

        return ucfirst(trim($words . ' ' . $unit));
    }

    /** Entier positif en toutes lettres (français), sans monnaie. */
    public static function spell(int $number): string
    {
        if ($number < 0) {
            return 'moins ' . self::spell(-$number);
        }

        if ($number === 0) {
            return 'zéro';
        }

        $millions  = intdiv($number, 1_000_000);
        $thousands = intdiv($number % 1_000_000, 1000);
        $rest      = $number % 1000;

        $parts = [];

        if ($millions > 0) {
            $parts[] = self::chunk($millions, true) . ' million' . ($millions > 1 ? 's' : '');
        }

        if ($thousands > 0) {
            // « mille » est invariable et ne prend jamais de pluriel ni ne fait
            // fléchir vingt/cent qui le précèdent → dernier segment = false.
            $parts[] = $thousands === 1 ? 'mille' : self::chunk($thousands, false) . ' mille';
        }

        if ($rest > 0) {
            $parts[] = self::chunk($rest, true);
        }

        return implode(' ', $parts);
    }

    /**
     * Groupe de 0 à 999 en lettres.
     *
     * @param  bool  $isFinal  vrai si ce groupe termine le nombre : conditionne le
     *                         pluriel de « quatre-vingts » et de « cents ».
     */
    private static function chunk(int $n, bool $isFinal): string
    {
        $hundreds = intdiv($n, 100);
        $tens     = $n % 100;

        $out = '';

        if ($hundreds > 0) {
            $out = $hundreds === 1 ? 'cent' : self::UNITS[$hundreds] . ' cent';
            // « cents » ne prend l's que multiplié et non suivi d'un autre nombre.
            if ($hundreds > 1 && $tens === 0 && $isFinal) {
                $out .= 's';
            }
        }

        if ($tens > 0) {
            $out .= ($out !== '' ? ' ' : '') . self::tens($tens, $isFinal);
        }

        return $out;
    }

    /** Nombre de 1 à 99 en lettres. */
    private static function tens(int $n, bool $isFinal): string
    {
        if ($n < 20) {
            return self::UNITS[$n];
        }

        $unit = $n % 10;
        $base = $n - $unit;

        return match ($base) {
            20, 30, 40, 50, 60 => self::simpleTens(self::TENS[intdiv($base, 10)], $unit),
            70 => match ($unit) {
                0       => 'soixante-dix',
                1       => 'soixante-et-onze',
                default => 'soixante-' . self::UNITS[10 + $unit],
            },
            80 => $unit === 0
                ? ($isFinal ? 'quatre-vingts' : 'quatre-vingt')
                : 'quatre-vingt-' . self::UNITS[$unit],
            90 => 'quatre-vingt-' . self::UNITS[10 + $unit],
            default => self::UNITS[$n], // inatteignable, garde-fou
        };
    }

    /** Dizaine simple (vingt…soixante) + unité, avec « et un » pour 21/31/…/61. */
    private static function simpleTens(string $base, int $unit): string
    {
        return match (true) {
            $unit === 0 => $base,
            $unit === 1 => $base . '-et-un',
            default     => $base . '-' . self::UNITS[$unit],
        };
    }
}
