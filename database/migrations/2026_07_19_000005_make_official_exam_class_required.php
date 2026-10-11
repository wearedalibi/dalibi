<?php

use App\Models\Classroom;
use App\Models\OfficialExam;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1) Backfill des examens sans classe (au mieux, par type ; repli = 1re classe).
        $classes = Classroom::orderBy('name')->get(['id', 'name']);
        if ($classes->isNotEmpty()) {
            $patterns = [
                'cepd' => '/cm\s*2/i',
                'bepc' => '/3\s*(e|è)|troisi/i',
                'bac' => '/t(le|erminale)|term/i',
            ];
            OfficialExam::whereNull('class_id')->get()->each(function (OfficialExam $exam) use ($classes, $patterns): void {
                $match = isset($patterns[$exam->type])
                    ? $classes->first(fn ($c) => preg_match($patterns[$exam->type], $c->name) === 1)
                    : null;
                $exam->class_id = ($match ?? $classes->first())->id;
                $exam->saveQuietly();
            });
        }

        // 2) Rendre la colonne obligatoire (uniquement si toutes les lignes ont une classe).
        //    La FK passe de nullOnDelete à restrictOnDelete (incompatible avec NOT NULL).
        if (OfficialExam::whereNull('class_id')->doesntExist()) {
            Schema::table('official_exams', function (Blueprint $table): void {
                $table->dropForeign(['class_id']);
            });
            Schema::table('official_exams', function (Blueprint $table): void {
                $table->uuid('class_id')->nullable(false)->change();
                $table->foreign('class_id')->references('id')->on('classes')->restrictOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::table('official_exams', function (Blueprint $table): void {
            $table->dropForeign(['class_id']);
        });
        Schema::table('official_exams', function (Blueprint $table): void {
            $table->uuid('class_id')->nullable()->change();
            $table->foreign('class_id')->references('id')->on('classes')->nullOnDelete();
        });
    }
};
