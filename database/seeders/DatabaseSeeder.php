<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Seeder GLOBAL (démonstration / développement).
 *
 * = Données de référence (ReferenceDataSeeder) + données de démo (comptes de test,
 *   modèles de documents, élèves fictifs).
 *
 * ⚠️ Les seeders de démonstration sont AUTOMATIQUEMENT IGNORÉS en production.
 *    Pour une instance réelle, utilisez `ReferenceDataSeeder` :
 *    `php artisan db:seed --class=ReferenceDataSeeder`
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1) Données de référence (rôles/permissions + catalogues prod-safe)
        $this->call(ReferenceDataSeeder::class);

        // 2) Données de démonstration — jamais en production
        if (app()->environment('production')) {
            $this->command?->warn(
                'Données de démonstration ignorées (environnement de production). '
                .'Seules les données de référence ont été installées.'
            );

            return;
        }

        $this->call(DefaultUsersSeeder::class);     // comptes de test (1 par rôle) + école par défaut
        $this->call(DocumentTemplateSeeder::class); // modèles de documents (requiert une école)
        $this->call(StudentTestSeeder::class);      // élèves fictifs (dev)
    }
}
