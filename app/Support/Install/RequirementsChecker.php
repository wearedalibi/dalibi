<?php

namespace App\Support\Install;

use Illuminate\Support\Facades\File;

/**
 * Vérifie les prérequis système nécessaires à l'installation.
 *
 * Purement local : version de PHP, extensions chargées, dossiers inscriptibles,
 * clé d'application présente. Aucun accès base.
 */
class RequirementsChecker
{
    /**
     * @return list<array{key: string, label: string, ok: bool, hint: string}>
     */
    public function check(): array
    {
        return [
            ...$this->phpRequirement(),
            ...$this->extensionRequirements(),
            ...$this->writableRequirements(),
            ...$this->appKeyRequirement(),
        ];
    }

    public function passes(): bool
    {
        foreach ($this->check() as $requirement) {
            if (! $requirement['ok']) {
                return false;
            }
        }

        return true;
    }

    /** @return list<array{key: string, label: string, ok: bool, hint: string}> */
    private function phpRequirement(): array
    {
        $min = (string) config('install.min_php', '8.3.0');
        $ok = version_compare(PHP_VERSION, $min, '>=');

        return [[
            'key' => 'php',
            'label' => 'PHP >= '.$min,
            'ok' => $ok,
            'hint' => $ok ? PHP_VERSION : 'Version actuelle : '.PHP_VERSION,
        ]];
    }

    /** @return list<array{key: string, label: string, ok: bool, hint: string}> */
    private function extensionRequirements(): array
    {
        $out = [];

        foreach ((array) config('install.required_extensions', []) as $ext) {
            $ok = extension_loaded($ext);
            $out[] = [
                'key' => 'ext:'.$ext,
                'label' => 'Extension '.$ext,
                'ok' => $ok,
                'hint' => $ok ? 'Chargée' : 'Manquante',
            ];
        }

        return $out;
    }

    /** @return list<array{key: string, label: string, ok: bool, hint: string}> */
    private function writableRequirements(): array
    {
        $out = [];

        foreach ((array) config('install.writable_paths', []) as $path) {
            $full = base_path($path);
            $ok = File::isDirectory($full) && File::isWritable($full);
            $out[] = [
                'key' => 'writable:'.$path,
                'label' => $path.' inscriptible',
                'ok' => $ok,
                'hint' => $ok ? 'OK' : 'Donnez les droits en écriture',
            ];
        }

        return $out;
    }

    /** @return list<array{key: string, label: string, ok: bool, hint: string}> */
    private function appKeyRequirement(): array
    {
        $ok = (string) config('app.key') !== '';

        return [[
            'key' => 'app_key',
            'label' => 'Clé d\'application (APP_KEY)',
            'ok' => $ok,
            'hint' => $ok ? 'Définie' : 'Lancez : php artisan key:generate',
        ]];
    }
}
