<?php

use App\Models\AcademicPeriod;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            $table->foreignUuid('academic_period_id')->nullable()->after('class_subject_id')
                ->constrained('academic_periods')->nullOnDelete();
        });

        // term devient un repli optionnel (la clé devient academic_period_id)
        Schema::table('grades', function (Blueprint $table) {
            $table->string('term')->nullable()->default(null)->change();
        });

        // Backfill best-effort : term1/2/3 -> période correspondante selon le type de classe
        $this->backfill();

        // Nouvelle clé d'unicité par période
        Schema::table('grades', function (Blueprint $table) {
            $table->unique(['student_id', 'class_subject_id', 'academic_period_id'], 'grades_student_subject_period_unique');
        });
    }

    private function backfill(): void
    {
        $termIndex = ['term1' => 0, 'term2' => 1, 'term3' => 2];
        $cache = [];

        foreach (DB::table('grades')->whereNotNull('term')->get() as $grade) {
            $cs = DB::table('class_subjects')->where('id', $grade->class_subject_id)->first();
            if (! $cs) {
                continue;
            }

            $class = DB::table('classes')->where('id', $cs->class_id)->first();
            $yearId = $cs->academic_year_id ?? null;
            $classTypeId = $class->classroom_type_id ?? null;

            $key = ($yearId ?? 'null').'|'.($classTypeId ?? 'null');
            $periods = $cache[$key] ??= AcademicPeriod::forClassType($yearId, $classTypeId)->values();

            $idx = $termIndex[$grade->term] ?? null;
            $period = $idx !== null ? ($periods[$idx] ?? null) : null;

            if ($period) {
                DB::table('grades')->where('id', $grade->id)->update(['academic_period_id' => $period->id]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            $table->dropUnique('grades_student_subject_period_unique');
            $table->dropConstrainedForeignId('academic_period_id');
        });
    }
};
