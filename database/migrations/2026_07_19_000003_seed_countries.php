<?php

use Database\Seeders\CountrySeeder;
use Illuminate\Database\Migrations\Migration;

// Peuple / normalise la table `countries` en production (le déploiement exécute
// `migrate`, pas `db:seed`). Le seeder est idempotent (upsert par code), donc
// cette migration est sûre à rejouer.
return new class extends Migration
{
    public function up(): void
    {
        (new CountrySeeder)->run();
    }

    public function down(): void
    {
        // Données de référence : pas de rollback destructif.
    }
};
