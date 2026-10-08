<?php

namespace Database\Seeders;

use App\Models\BulletinTemplate;
use App\Models\School;
use Illuminate\Database\Seeder;

class BulletinTemplateSeeder extends Seeder
{
    /** Modèle de bulletin par défaut pour chaque école qui n'en a pas. Idempotent. */
    public function run(): void
    {
        School::query()->each(function (School $school): void {
            $exists = BulletinTemplate::where('school_id', $school->id)
                ->whereNull('classroom_type_id')->exists();

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
        });
    }
}
