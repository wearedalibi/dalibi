<?php

namespace App\Constants;

/**
 * Rôles disponibles dans l'application
 */
class Roles
{
    public const ADMINISTRATOR = 'administrateur';

    public const DIRECTOR = 'directeur';

    public const TEACHER = 'enseignant';

    public const ACCOUNTING = 'comptabilité';

    public const SECRETARIAT = 'secrétariat';

    /**
     * Get all available roles
     */
    public static function all(): array
    {
        return [
            self::ADMINISTRATOR,
            self::DIRECTOR,
            self::TEACHER,
            self::ACCOUNTING,
            self::SECRETARIAT,
        ];
    }

    /**
     * Get role labels
     */
    public static function labels(): array
    {
        return [
            self::ADMINISTRATOR => 'Administrateur',
            self::DIRECTOR => 'Directeur',
            self::TEACHER => 'Enseignant',
            self::ACCOUNTING => 'Comptabilité',
            self::SECRETARIAT => 'Secrétariat',
        ];
    }

    /**
     * Get role label by key
     */
    public static function label(string $role): string
    {
        return self::labels()[$role] ?? $role;
    }
}
