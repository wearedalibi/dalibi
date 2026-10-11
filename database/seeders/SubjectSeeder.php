<?php

namespace Database\Seeders;

use App\Models\Subject;
use Illuminate\Database\Seeder;

class SubjectSeeder extends Seeder
{
    public function run(): void
    {
        $subjects = [
            // --- MATERNELLE & PRIMAIRE ---
            ['name' => 'Langage et Communication', 'code' => 'LC', 'description' => 'Expression orale et lecture'],
            ['name' => 'Éducation Scientifique et Technologique', 'code' => 'EST', 'description' => 'Calcul et éveil scientifique'],
            ['name' => 'Éducation Civique et Morale', 'code' => 'ECM', 'description' => 'Valeurs citoyennes'],
            ['name' => 'Arts et Culture', 'code' => 'AC', 'description' => 'Dessin, chant et travaux manuels'],
            ['name' => 'Éducation Physique et Sportive', 'code' => 'EPS', 'description' => 'Activités sportives'],

            // --- COLLÈGE & LYCÉE GÉNÉRAL ---
            ['name' => 'Mathématiques', 'code' => 'MATH', 'description' => 'Algèbre et géométrie'],
            ['name' => 'Français', 'code' => 'FRAN', 'description' => 'Grammaire, conjugaison et littérature'],
            ['name' => 'Sciences de la Vie et de la Terre', 'code' => 'SVT', 'description' => 'Biologie et géologie'],
            ['name' => 'Sciences Physiques', 'code' => 'SP', 'description' => 'Physique et Chimie'],
            ['name' => 'Histoire-Géographie', 'code' => 'HG', 'description' => 'Histoire et Géographie du Togo et du monde'],
            ['name' => 'Anglais', 'code' => 'ANG', 'description' => 'Langue vivante 1'],
            ['name' => 'Allemand', 'code' => 'ALL', 'description' => 'Langue vivante 2'],
            ['name' => 'Philosophie', 'code' => 'PHILO', 'description' => 'Réflexion philosophique (Classes de Terminale)'],

            // --- LYCÉE TECHNIQUE (Séries E, F, G, Ti) ---
            ['name' => 'Comptabilité', 'code' => 'COMPTA', 'description' => 'Gestion comptable et financière'],
            ['name' => 'Économie et Organisation des Entreprises', 'code' => 'EOE', 'description' => 'Droit et économie'],
            ['name' => 'Construction Mécanique', 'code' => 'CONSTR_MECA', 'description' => 'Dessin industriel et mécanique'],
            ['name' => 'Électrotechnique', 'code' => 'ELECTROTECH', 'description' => 'Étude des systèmes électriques'],
            ['name' => 'Informatique Industrielle', 'code' => 'INFO_INDUS', 'description' => 'Maintenance et réseaux'],
            ['name' => 'Sténographie', 'code' => 'STENO', 'description' => 'Techniques de secrétariat'],
            ['name' => 'Droit', 'code' => 'DROIT', 'description' => 'Droit civil et commercial'],
        ];

        foreach ($subjects as $subject) {
            Subject::updateOrCreate(
                ['code' => $subject['code']], // Évite les doublons si vous relancez le seeder
                [
                    // NB : pas d'`id` ici — généré à la création, ne pas réécrire (référencé par FK)
                    'name' => $subject['name'],
                    'description' => $subject['description'],
                ]
            );
        }
    }
}
