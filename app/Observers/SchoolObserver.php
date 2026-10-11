<?php

namespace App\Observers;

use App\Models\BulletinTemplate;
use App\Models\DocumentHeader;
use App\Models\School;

/**
 * À la création d'un établissement, provisionne ses réglages par défaut :
 * l'en-tête des documents et le modèle de bulletin.
 *
 * Ces éléments étaient auparavant produits par des seeders (DocumentHeaderSeeder /
 * BulletinTemplateSeeder), qui ne pouvaient rien faire tant qu'aucune école
 * n'existait — notamment sur le chemin de seeding de production. Les seeders
 * restent utiles pour rattraper les écoles existantes ; l'observer couvre les
 * nouvelles, quelle que soit l'origine de la création (UI, seeder, import).
 */
class SchoolObserver
{
    public function created(School $school): void
    {
        $this->ensureDocumentHeader($school);
        $this->ensureBulletinTemplate($school);
    }

    /** En-tête de documents par défaut (idempotent). */
    private function ensureDocumentHeader(School $school): void
    {
        if ($school->documentHeader()->exists()) {
            return;
        }

        $config = DocumentHeader::defaultLayout($school);

        DocumentHeader::create([
            'school_id' => $school->id,
            'layout' => $config['layout'],
            'watermark' => $config['watermark'],
        ]);
    }

    /** Modèle de bulletin par défaut, tous types de classes confondus (idempotent). */
    private function ensureBulletinTemplate(School $school): void
    {
        $exists = BulletinTemplate::where('school_id', $school->id)
            ->whereNull('classroom_type_id')
            ->exists();

        if ($exists) {
            return;
        }

        BulletinTemplate::create([
            'school_id' => $school->id,
            'classroom_type_id' => null,
            'name' => 'Modèle par défaut',
            'is_active' => true,
            'columns' => BulletinTemplate::defaultColumns(),
            'options' => BulletinTemplate::defaultOptions(),
        ]);
    }
}
