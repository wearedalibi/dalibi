<?php

namespace Database\Seeders;

use App\Models\DocumentTemplate;
use App\Models\School;
use Illuminate\Database\Seeder;

class DocumentTemplateSeeder extends Seeder
{
    /**
     * Jeu standard de modèles de documents, adossés aux mises en page Blade
     * livrées par l'application (source = blade). Idempotent : convertit/actualise
     * les modèles « (standard) » sans toucher aux modèles créés par les écoles.
     */
    public function run(): void
    {
        // category, type (= clé du layout Blade), nom, description
        $standard = [
            ['certificat', 'certificat_scolarite',      'Certificat de scolarité (standard)',      'Modèle officiel de certificat de scolarité.'],
            ['certificat', 'certificat_sortie',         'Certificat de sortie (standard)',         'Délivré lors du départ / radiation de l\'élève.'],
            ['attestation', 'attestation_frequentation', 'Attestation de fréquentation (standard)', 'Atteste de la fréquentation effective de l\'élève.'],
            ['attestation', 'attestation_inscription',   'Attestation d\'inscription (standard)',    'Atteste de l\'inscription de l\'élève pour l\'année.'],
            ['attestation', 'attestation_reussite',      'Attestation de réussite (standard)',      'Atteste de la réussite et du passage en classe supérieure.'],
        ];

        $schools = School::query()->get();

        foreach ($schools as $school) {
            foreach ($standard as [$category, $type, $name, $description]) {
                DocumentTemplate::updateOrCreate(
                    ['school_id' => $school->id, 'type' => $type, 'name' => $name],
                    [
                        'category' => $category,
                        'description' => $description,
                        'source' => 'blade',
                        'layout' => $type,
                        'signatory_title' => 'Le Directeur',
                        'header_enabled' => true,
                        'footer_enabled' => true,
                        'show_signature' => true,
                        'orientation' => 'portrait',
                        'is_default' => true,
                        'is_active' => true,
                    ],
                );
            }
        }
    }
}
