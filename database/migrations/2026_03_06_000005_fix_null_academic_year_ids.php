<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, check if there are any academic years
        $academicYears = DB::table('academic_years')->get();

        if ($academicYears->isEmpty()) {
            // No academic years exist, skip
            return;
        }

        // Get the active academic year, or fall back to the most recent one
        $targetYear = DB::table('academic_years')
            ->where('active', true)
            ->orderBy('start_date', 'desc')
            ->first();

        if (! $targetYear) {
            $targetYear = DB::table('academic_years')
                ->orderBy('start_date', 'desc')
                ->first();
        }

        if ($targetYear) {
            // Update all NULL academic_year_id records
            DB::table('class_subjects')
                ->whereNull('academic_year_id')
                ->update(['academic_year_id' => $targetYear->id]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration is for data fixing, we don't need to revert
    }
};
