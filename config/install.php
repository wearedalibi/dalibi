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

    // Valeurs par défaut proposées dans l'étape « École ».
    'defaults' => [
        'locale' => Locales::DEFAULT,
        'currency' => Currencies::DEFAULT,
        'timezone' => 'Africa/Lome',
    ],

    // Réglages de sécurité pré-cochés à l'étape « Protocole de sécurité ».
    // (Appliqués en Phase 2 ; ici ils alimentent l'écran.)
    'security_defaults' => [
        'force_2fa' => true,
        'force_https' => true,
        'app_debug_off' => true,
        'password_policy' => 'strong',
        'enable_sentry' => false,
    ],
];
