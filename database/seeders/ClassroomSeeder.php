<?php

namespace Database\Seeders;

use App\Models\Classroom;
use App\Models\ClassroomType;
use Illuminate\Database\Seeder;

class ClassroomSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Récupération des types de classes par leur nom
        $typePrescolaire = ClassroomType::where('name', 'LIKE', '%Maternelle%')->first();
        $typePrimaire = ClassroomType::where('name', 'LIKE', '%Primaire%')->first();
        $typeCollege = ClassroomType::where('name', 'LIKE', '%Collège%')->first();
        $typeLycee = ClassroomType::where('name', 'LIKE', '%Lycée (Secondaire 2)%')->first();

        $classes = [
            // --- MATERNELLE ---
            ['name' => 'Petite Section', 'code' => 'PS', 'capacity' => 25, 'type_id' => $typePrescolaire?->id],
            ['name' => 'Moyenne Section', 'code' => 'MS', 'capacity' => 30, 'type_id' => $typePrescolaire?->id],
            ['name' => 'Grande Section', 'code' => 'GS', 'capacity' => 30, 'type_id' => $typePrescolaire?->id],

            // --- PRIMAIRE ---
            ['name' => 'Cours Préparatoire 1ère année', 'code' => 'CP1', 'capacity' => 50, 'type_id' => $typePrimaire?->id],
            ['name' => 'Cours Préparatoire 2ème année', 'code' => 'CP2', 'capacity' => 50, 'type_id' => $typePrimaire?->id],
            ['name' => 'Cours Élémentaire 1ère année', 'code' => 'CE1', 'capacity' => 50, 'type_id' => $typePrimaire?->id],
            ['name' => 'Cours Élémentaire 2ème année', 'code' => 'CE2', 'capacity' => 50, 'type_id' => $typePrimaire?->id],
            ['name' => 'Cours Moyen 1ère année', 'code' => 'CM1', 'capacity' => 50, 'type_id' => $typePrimaire?->id],
            ['name' => 'Cours Moyen 2ème année', 'code' => 'CM2', 'capacity' => 50, 'type_id' => $typePrimaire?->id],

            // --- COLLÈGE (Secondaire 1) ---
            ['name' => 'Sixième', 'code' => '6ème', 'capacity' => 60, 'type_id' => $typeCollege?->id],
            ['name' => 'Cinquième', 'code' => '5ème', 'capacity' => 60, 'type_id' => $typeCollege?->id],
            ['name' => 'Quatrième', 'code' => '4ème', 'capacity' => 60, 'type_id' => $typeCollege?->id],
            ['name' => 'Troisième', 'code' => '3ème', 'capacity' => 60, 'type_id' => $typeCollege?->id],

            // --- LYCÉE (Secondaire 2 - Enseignement Général) ---
            ['name' => 'Seconde A', 'code' => '2nd A', 'capacity' => 55, 'type_id' => $typeLycee?->id],
            ['name' => 'Seconde S', 'code' => '2nd S', 'capacity' => 55, 'type_id' => $typeLycee?->id],
            ['name' => 'Première A4', 'code' => '1ère A4', 'capacity' => 55, 'type_id' => $typeLycee?->id],
            ['name' => 'Première D', 'code' => '1ère D', 'capacity' => 55, 'type_id' => $typeLycee?->id],
            ['name' => 'Première C', 'code' => '1ère C', 'capacity' => 40, 'type_id' => $typeLycee?->id],
            ['name' => 'Terminale A4', 'code' => 'Tle A4', 'capacity' => 55, 'type_id' => $typeLycee?->id],
            ['name' => 'Terminale D', 'code' => 'Tle D', 'capacity' => 55, 'type_id' => $typeLycee?->id],
            ['name' => 'Terminale C', 'code' => 'Tle C', 'capacity' => 40, 'type_id' => $typeLycee?->id],
        ];

        foreach ($classes as $class) {
            if (! $class['type_id']) {
                continue;
            }

            // Idempotent : on insère seulement si absent (ne pas réécrire l'id existant → FK enrollments)
            if (! Classroom::where('code', $class['code'])->exists()) {
                Classroom::create([
                    'name' => $class['name'],
                    'code' => $class['code'],
                    'capacity' => $class['capacity'],
                    'classroom_type_id' => $class['type_id'],
                    'active' => true,
                ]);
            }
        }
    }
}
