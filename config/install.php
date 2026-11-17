<?php

use App\Constants\Currencies;
use App\Constants\Locales;

return [

    /*
    |--------------------------------------------------------------------------
    | Assistant d'installation web
    |--------------------------------------------------------------------------
    |
    | Réglages de l'assistant d'installation façon « première configuration ».
    | Ces valeurs n'interrogent jamais la base : l'assistant doit fonctionner
    | sur un clone neuf, avant toute migration.
    |
    */

    // Prérequis système vérifiés avant l'installation.
    'min_php' => '8.3.0',

    'required_extensions' => [
        'pdo_pgsql',
        'mbstring',
        'openssl',
        'ctype',
        'json',
        'fileinfo',
        'gd',
        'zip',
    ],

    // Dossiers devant être inscriptibles par le serveur web.
    'writable_paths' => [
        'storage',
        'bootstrap/cache',
    ],

    // Fichier-verrou (relatif à storage/app/). Sa présence = application installée.
    'lock_file' => 'installed.json',

    // Forçage HTTPS piloté par l'assistant (écrit FORCE_HTTPS dans .env). Appliqué
    // par AppServiceProvider hors environnement local (en production, HTTPS est déjà
    // forcé). Lu ici pour rester compatible avec `config:cache`.
    'force_https' => (bool) env('FORCE_HTTPS', false),

    // Valeurs par défaut proposées dans l'étape « École ».
    'defaults' => [
        'locale' => Locales::DEFAULT,
        'currency' => Currencies::DEFAULT,
        'timezone' => 'Africa/Lome',
    ],

    // Réglages de sécurité pré-cochés à l'étape « Protocole de sécurité ».
    // La 2FA n'est volontairement PAS imposée (choix laissé à chaque utilisateur).
    'security_defaults' => [
        'force_https' => true,
        'app_debug_off' => true,
        'password_policy' => 'strong',
        'enable_sentry' => false,
    ],
];
