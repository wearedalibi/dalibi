<?php

return [
    'brand' => 'Dalibi setup',
    'hero_title' => 'Welcome to Dalibi',
    'hero_subtitle' => 'Let\'s set up your school in a few steps',

    'steps' => [
        'language' => 'Language',
        'school' => 'School',
        'admin' => 'Administrator',
        'security' => 'Security',
    ],

    'common' => [
        'back' => 'Back',
        'continue' => 'Continue',
        'install' => 'Install',
        'optional' => 'optional',
    ],

    'welcome' => [
        'title' => 'Choose a language',
        'description' => 'Select the application language',
    ],

    'school' => [
        'title' => 'Your school',
        'description' => 'Final step: your school identity, then installation starts',
        'name' => 'School name',
        'level' => 'Level',
        'level_primary' => 'Primary',
        'level_college' => 'Middle school',
        'level_high' => 'High school',
        'code' => 'Code',
        'currency' => 'Currency',
        'principal' => 'Principal / Head',
        'email' => 'Email',
        'phone' => 'Phone',
        'address' => 'Address',
        'city' => 'City',
        'region' => 'Region',
        'description' => 'Description',
        'timezone' => 'Timezone',
        'academic_year_start' => 'Academic year — start',
        'period_type' => 'Period breakdown',
        'period_trimester' => 'Trimesters',
        'period_semester' => 'Semesters',
    ],

    'admin' => [
        'title' => 'Administrator account',
        'description' => 'The main management account',
        'firstname' => 'First name',
        'lastname' => 'Last name',
        'email' => 'Email',
        'password' => 'Password',
        'password_confirmation' => 'Confirmation',
    ],

    'security' => [
        'title' => 'Security protocol',
        'description' => 'Recommended settings — adjustable',
        'app_debug_off' => 'Debug mode disabled (production)',
        'force_https' => 'Force HTTPS (outside local)',
        'password_policy' => 'Password policy: strong',
        'enable_sentry' => 'Error logging (Sentry)',
        'two_factor_note' => 'Two-factor authentication stays optional — each user can enable it in their settings.',
        'lock_note' => 'The installer locks itself after installation.',
    ],

    'requirements' => [
        'title' => 'System requirements',
        'description' => 'Some requirements must be met before installing',
        'recheck' => 'Re-check',
        'all_good' => 'All requirements are satisfied.',
    ],

    'running' => [
        'title' => 'Installation in progress',
        'description' => 'Migration, reference data and account creation',
        'working' => 'Please wait, do not close this page…',
        'error' => 'Installation failed. Check the database and permissions, then try again.',
        'retry' => 'Try again',
        'done' => 'Installation complete. Sign in with the administrator account.',
    ],
];
