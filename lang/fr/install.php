<?php

return [
    'brand' => 'Installation de Dalibi',
    'hero_title' => 'Bienvenue sur Dalibi',
    'hero_subtitle' => 'Configurons votre établissement en quelques étapes',

    'steps' => [
        'language' => 'Langue',
        'school' => 'École',
        'admin' => 'Administrateur',
        'security' => 'Sécurité',
    ],

    'common' => [
        'back' => 'Retour',
        'continue' => 'Continuer',
        'install' => 'Installer',
        'optional' => 'optionnel',
    ],

    'welcome' => [
        'title' => 'Choix de la langue',
        'description' => 'Sélectionnez la langue de l\'application',
    ],

    'school' => [
        'title' => 'Votre établissement',
        'description' => 'Identité de l\'école et année de départ',
        'name' => 'Nom de l\'école',
        'code' => 'Code',
        'currency' => 'Devise',
        'timezone' => 'Fuseau horaire',
        'academic_year_start' => 'Année académique — début',
        'period_type' => 'Découpage des périodes',
        'period_trimester' => 'Trimestres',
        'period_semester' => 'Semestres',
    ],

    'admin' => [
        'title' => 'Compte administrateur',
        'description' => 'Le compte principal de gestion',
        'firstname' => 'Prénom',
        'lastname' => 'Nom',
        'email' => 'Email',
        'password' => 'Mot de passe',
        'password_confirmation' => 'Confirmation',
    ],

    'security' => [
        'title' => 'Protocole de sécurité',
        'description' => 'Réglages recommandés — ajustables',
        'force_2fa' => 'Double authentification imposée à la 1re connexion',
        'app_debug_off' => 'Mode debug désactivé (production)',
        'force_https' => 'HTTPS forcé',
        'password_policy' => 'Politique de mot de passe : fort',
        'enable_sentry' => 'Journalisation des erreurs (Sentry)',
        'lock_note' => 'L\'assistant se verrouille après l\'installation.',
    ],

    'requirements' => [
        'title' => 'Prérequis système',
        'description' => 'Certains prérequis doivent être satisfaits avant l\'installation',
        'recheck' => 'Revérifier',
        'all_good' => 'Tous les prérequis sont satisfaits.',
    ],

    'running' => [
        'title' => 'Installation en cours',
        'description' => 'Migration, données de référence et création des comptes',
        'phase_note' => 'Phase 1 — écran de démonstration. L\'exécution réelle sera branchée en Phase 2.',
        'to_login' => 'Aller à la connexion',
    ],
];
