<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            // Pays de l'établissement (code ISO 3166-1 alpha-2, ex. « TG » pour le Togo).
            // Défaut Togo, cohérent avec le reste des valeurs par défaut (Africa/Lome, XOF).
            if (! Schema::hasColumn('schools', 'country')) {
                $table->string('country', 2)->default('TG')->after('region');
            }
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            if (Schema::hasColumn('schools', 'country')) {
                $table->dropColumn('country');
            }
        });
    }
};
