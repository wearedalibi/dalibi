<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Si la colonne existe déjà et n'est pas nullable, la modifier
        if (Schema::hasColumn('users', 'birth_date')) {
            DB::statement('ALTER TABLE users ALTER COLUMN birth_date DROP NOT NULL');
        } else {
            // Sinon, créer la colonne comme nullable
            Schema::table('users', function (Blueprint $table) {
                $table->date('birth_date')->nullable()->after('gender');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'birth_date')) {
                $table->dropColumn('birth_date');
            }
        });
    }
};
