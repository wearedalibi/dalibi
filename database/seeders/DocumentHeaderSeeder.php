<?php

namespace Database\Seeders;

use App\Models\DocumentHeader;
use App\Models\School;
use Illuminate\Database\Seeder;

class DocumentHeaderSeeder extends Seeder
{
    /** Crée un en-tête par défaut pour chaque école qui n'en a pas. Idempotent. */
    public function run(): void
    {
        School::query()->each(function (School $school): void {
            if ($school->documentHeader) {
                return;
            }

            $config = DocumentHeader::defaultLayout($school);

            DocumentHeader::create([
                'school_id' => $school->id,
                'layout' => $config['layout'],
                'watermark' => $config['watermark'],
            ]);
        });
    }
}
