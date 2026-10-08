<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ClassTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $types = [
            [
                'name' => 'Maternelle (Préscolaire)',
                'description' => 'Enseignement destiné aux enfants de 3 à 5 ans, comprenant la Petite, Moyenne et Grande Section.',
                'active' => true,
            ],
            [
                'name' => 'Primaire (EPP)',
                'description' => 'Cycle fondamental de 6 ans (CP1 au CM2) sanctionné par le Certificat d’Études du Premier Degré (CEPD).',
                'active' => true,
            ],
            [
                'name' => 'Collège (Secondaire 1)',
                'description' => 'Premier cycle du secondaire de 4 ans (de la 6ème à la 3ème) débouchant sur le BEPC.',
                'active' => true,
            ],
            [
                'name' => 'Lycée (Secondaire 2)',
                'description' => 'Second cycle du secondaire de 3 ans (Seconde à la Terminale) préparant aux Baccalauréats (Bac I et Bac II).',
                'active' => true,
            ],
            [
                'name' => 'Lycée Technique',
                'description' => 'Enseignement technique et professionnel préparant aux diplômes techniques (séries G, E, F, etc.).',
                'active' => true,
            ],
        ];

        foreach ($types as $type) {
            // Idempotent : on insère seulement si absent (ne jamais réécrire l'id existant,
            // référencé par d'autres tables → FK).
            $exists = DB::table('classroom_types')->where('name', $type['name'])->exists();

            if (! $exists) {
                DB::table('classroom_types')->insert([
                    'id' => (string) Str::uuid(),
                    'name' => $type['name'],
                    'description' => $type['description'],
                    'active' => $type['active'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}
