<?php

namespace App\Support\Install;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Throwable;

/**
 * Source de vérité « l'application est-elle installée ? ».
 *
 * La réponse ne doit jamais dépendre d'une base de données joignable : sur un
 * clone neuf, l'assistant d'installation tourne avant toute migration. On se
 * fonde donc sur un fichier-verrou (storage/app/installed.json).
 *
 * Exception de robustesse : si le verrou est absent mais qu'une base existante
 * contient déjà des utilisateurs (mise à niveau d'une installation antérieure
 * à l'assistant), on considère l'app installée et on pose le verrou pour que
 * les vérifications suivantes restent locales et sans accès base.
 *
 * Enregistré en singleton : le résultat est mémoïsé pour toute la requête.
 */
class InstallState
{
    private ?bool $installed = null;

    /** Forçage explicite (tests) ; null = détection normale. */
    private ?bool $override = null;

    public function isInstalled(): bool
    {
        if ($this->override !== null) {
            return $this->override;
        }

        if ($this->installed !== null) {
            return $this->installed;
        }

        // M3 : la base de données fait foi quand elle est joignable ; le fichier-verrou
        // n'est qu'un cache. Une base déjà peuplée = application installée (et on
        // (re)pose le cache si besoin). Un verrou périmé sur une base vide ne bloque
        // donc plus une nouvelle installation légitime.
        if ($this->databaseHasUsers()) {
            if (! File::exists($this->lockPath())) {
                $this->lock(['healed' => true]);
            }

            return $this->installed = true;
        }

        // Repli : base injoignable (clone neuf, ou panne momentanée). On se fie alors
        // au fichier-verrou s'il est présent.
        if (File::exists($this->lockPath())) {
            return $this->installed = true;
        }

        return $this->installed = false;
    }

    /** Force l'état (tests). Passer null pour rétablir la détection normale. */
    public function fake(?bool $installed): void
    {
        $this->override = $installed;
        $this->installed = null;
    }

    /**
     * Pose le verrou d'installation avec quelques métadonnées.
     *
     * @param  array<string, mixed>  $meta
     */
    public function lock(array $meta = []): void
    {
        $payload = array_merge([
            'installed_at' => now()->toIso8601String(),
            'version' => $this->appVersion(),
            'locale' => config('app.locale'),
        ], $meta);

        File::ensureDirectoryExists(dirname($this->lockPath()));
        File::put($this->lockPath(), json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        $this->installed = true;
    }

    /**
     * Métadonnées du verrou, ou null si absent.
     *
     * @return array<string, mixed>|null
     */
    public function meta(): ?array
    {
        if (! File::exists($this->lockPath())) {
            return null;
        }

        $decoded = json_decode((string) File::get($this->lockPath()), true);

        return is_array($decoded) ? $decoded : null;
    }

    /** Retire le verrou (tests / réinstallation volontaire). */
    public function unlock(): void
    {
        File::delete($this->lockPath());
        $this->installed = null;
    }

    /** Chemin absolu du fichier-verrou. */
    public function lockPath(): string
    {
        return storage_path('app/'.config('install.lock_file', 'installed.json'));
    }

    /**
     * Sonde allégée : la table users contient-elle au moins une ligne ?
     *
     * Une seule requête `exists` (indexée, peu coûteuse) exécutée au plus une fois
     * par requête (résultat mémoïsé). Si la table est absente (clone neuf) ou la base
     * injoignable, la requête lève une exception interceptée → false, sans erreur.
     */
    private function databaseHasUsers(): bool
    {
        try {
            return DB::table('users')->exists();
        } catch (Throwable) {
            return false;
        }
    }

    private function appVersion(): string
    {
        $path = base_path('package.json');

        if (File::exists($path)) {
            return (string) (json_decode((string) File::get($path))->version ?? '—');
        }

        return '—';
    }
}
