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
        'description' => 'School identity and starting year',
        'name' => 'School name',
        'code' => 'Code',
        'currency' => 'Currency',
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
        'force_2fa' => 'Two-factor authentication required at first login',
        'app_debug_off' => 'Debug mode disabled (production)',
        'force_https' => 'Force HTTPS',
        'password_policy' => 'Password policy: strong',
        'enable_sentry' => 'Error logging (Sentry)',
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
