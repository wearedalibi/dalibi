<?php

namespace Database\Seeders;

use App\Models\FeeCategorie;
use Illuminate\Database\Seeder;

class FeeCategorieSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Inscription',
                'description' => 'Frais d\'inscription pour l\'année scolaire',
            ],
            [
                'name' => 'Réinscription',
                'description' => 'Frais de réinscription pour l\'année scolaire',
            ],
            [
                'name' => 'Écolage',
                'description' => 'Frais de scolarité mensuels ou annuels',
            ],
            [
                'name' => 'Tenue scolaire',
                'description' => 'Frais pour l\'uniforme et les tenues scolaires',
            ],
            [
                'name' => 'Transport',
                'description' => 'Frais de transport scolaire',
            ],
            [
                'name' => 'Cantine',
                'description' => 'Frais de restauration et de cantine',
            ],
            [
                'name' => 'Activité scolaire',
                'description' => 'Frais pour les activités extrascolaires et parascolaires',
            ],
            [
                'name' => 'Frais d\'examen',
                'description' => 'Frais pour les examens et les évaluations',
            ],
        ];

        foreach ($categories as $category) {
            FeeCategorie::firstOrCreate(['name' => $category['name']], $category);
        }
    }
}
