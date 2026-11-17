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
        'description' => 'Dernière étape : l\'identité de l\'école, puis l\'installation démarre',
        'group_identity' => 'Identité',
        'group_contact' => 'Direction & contact',
        'group_location' => 'Localisation',
        'group_pedagogy' => 'Organisation pédagogique',
        'name' => 'Nom de l\'école',
        'levels' => 'Niveaux proposés',
        'levels_hint' => 'Cochez un ou plusieurs cycles enseignés par l\'établissement.',
        'level_options' => [
            'maternelle' => 'Maternelle',
            'primaire' => 'Primaire',
            'college' => 'Collège',
            'lycee' => 'Lycée',
            'lycee_technique' => 'Lycée technique',
        ],
        'code' => 'Code',
        'devise' => 'Devise (slogan)',
        'devise_ph' => 'Ex : Travail - Liberté - Patrie',
        'currency' => 'Monnaie',
        'principal' => 'Directeur / Chef d\'établissement',
        'email' => 'Email',
        'phone' => 'Téléphone',
        'address' => 'Adresse',
        'city' => 'Ville',
        'region' => 'Région',
        'country' => 'Pays',
        'po_box' => 'Boîte postale',
        'description' => 'Description',
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
        'app_debug_off' => 'Mode debug désactivé (production)',
        'force_https' => 'HTTPS forcé (hors environnement local)',
        'password_policy' => 'Politique de mot de passe : fort',
        'enable_sentry' => 'Journalisation des erreurs (Sentry)',
        'two_factor_note' => 'La double authentification reste facultative, activable par chaque utilisateur dans ses réglages.',
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
        'working' => 'Veuillez patienter, ne fermez pas cette page…',
        'error' => 'L\'installation a échoué. Vérifiez la base de données et les droits, puis réessayez.',
        'retry' => 'Réessayer',
        'done' => 'Installation terminée. Connectez-vous avec le compte administrateur.',
    ],
];
