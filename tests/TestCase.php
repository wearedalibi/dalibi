<?php

namespace Tests;

use App\Support\Install\InstallState;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Les tests portent sur le backend : ils n'ont pas à dépendre d'un build
        // Vite (manifeste absent en CI, ou périmé en local). La directive @vite
        // est neutralisée, ce qui n'affecte aucune assertion Inertia.
        $this->withoutVite();

        // Par défaut, l'application est considérée installée pour que le middleware
        // d'installation reste transparent. Les tests de l'assistant forcent l'état
        // « non installé » via InstallState::fake(false).
        $this->app->make(InstallState::class)->fake(true);
    }

    /**
     * Exécuté avant chaque migrate:fresh dans RefreshDatabase.
     * Désactive les FK SQLite pour permettre les dropColumn dans les migrations.
     */
    protected function beforeRefreshingDatabase()
    {
        if (config('database.connections.'.config('database.default').'.driver') === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF');
        }
    }
}
