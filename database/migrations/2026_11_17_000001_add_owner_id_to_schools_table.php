<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Propriétaire de l'établissement : l'utilisateur à l'origine de l'installation
     * (administrateur principal). Nullable pour ne pas contraindre les écoles
     * existantes ; renseigné par l'assistant d'installation.
     */
    public function up(): void
    {
        if (Schema::hasColumn('schools', 'owner_id')) {
            return;
        }

        Schema::table('schools', function (Blueprint $table) {
            $table->uuid('owner_id')->nullable()->after('active');
            $table->foreign('owner_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('schools', 'owner_id')) {
            return;
        }

        Schema::table('schools', function (Blueprint $table) {
            $table->dropForeign(['owner_id']);
            $table->dropColumn('owner_id');
        });
    }
};
