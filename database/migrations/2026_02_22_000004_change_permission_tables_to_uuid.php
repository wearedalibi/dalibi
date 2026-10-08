<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Note: les ALTER COLUMN TYPE sont spécifiques à PostgreSQL.
 * Sur SQLite (tests), le type UUID est une chaîne — on saute ces instructions.
 */

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $isSqlite = DB::getDriverName() === 'sqlite';

        // Modifier model_has_permissions pour utiliser UUID
        Schema::table($tableNames['model_has_permissions'], function (Blueprint $table) use ($columnNames) {
            // Supprimer la clé primaire existante
            $table->dropPrimary(['permission_id', $columnNames['model_morph_key'], 'model_type']);

            // Supprimer l'index existant
            $table->dropIndex('model_has_permissions_model_id_model_type_index');
        });

        // ALTER COLUMN TYPE n'est pas supporté par SQLite (UUID = string de toute façon)
        if (! $isSqlite) {
            DB::statement('ALTER TABLE '.$tableNames['model_has_permissions'].' ALTER COLUMN '.$columnNames['model_morph_key'].' TYPE UUID USING '.$columnNames['model_morph_key'].'::text::uuid');
        }

        Schema::table($tableNames['model_has_permissions'], function (Blueprint $table) use ($columnNames) {
            // Recréer l'index
            $table->index([$columnNames['model_morph_key'], 'model_type'], 'model_has_permissions_model_id_model_type_index');

            // Recréer la clé primaire
            $table->primary(['permission_id', $columnNames['model_morph_key'], 'model_type'], 'model_has_permissions_permission_model_type_primary');
        });

        // Modifier model_has_roles pour utiliser UUID
        Schema::table($tableNames['model_has_roles'], function (Blueprint $table) use ($columnNames) {
            // Supprimer la clé primaire existante
            $table->dropPrimary(['role_id', $columnNames['model_morph_key'], 'model_type']);

            // Supprimer l'index existant
            $table->dropIndex('model_has_roles_model_id_model_type_index');
        });

        if (! $isSqlite) {
            DB::statement('ALTER TABLE '.$tableNames['model_has_roles'].' ALTER COLUMN '.$columnNames['model_morph_key'].' TYPE UUID USING '.$columnNames['model_morph_key'].'::text::uuid');
        }

        Schema::table($tableNames['model_has_roles'], function (Blueprint $table) use ($columnNames) {
            // Recréer l'index
            $table->index([$columnNames['model_morph_key'], 'model_type'], 'model_has_roles_model_id_model_type_index');

            // Recréer la clé primaire
            $table->primary(['role_id', $columnNames['model_morph_key'], 'model_type'], 'model_has_roles_role_model_type_primary');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $isSqlite = DB::getDriverName() === 'sqlite';

        // Revenir à bigint pour model_has_permissions
        Schema::table($tableNames['model_has_permissions'], function (Blueprint $table) use ($columnNames) {
            $table->dropPrimary(['permission_id', $columnNames['model_morph_key'], 'model_type']);
            $table->dropIndex('model_has_permissions_model_id_model_type_index');
        });

        if (! $isSqlite) {
            DB::statement('ALTER TABLE '.$tableNames['model_has_permissions'].' ALTER COLUMN '.$columnNames['model_morph_key'].' TYPE BIGINT USING '.$columnNames['model_morph_key'].'::text::bigint');
        }

        Schema::table($tableNames['model_has_permissions'], function (Blueprint $table) use ($columnNames) {
            $table->index([$columnNames['model_morph_key'], 'model_type'], 'model_has_permissions_model_id_model_type_index');
            $table->primary(['permission_id', $columnNames['model_morph_key'], 'model_type'], 'model_has_permissions_permission_model_type_primary');
        });

        // Revenir à bigint pour model_has_roles
        Schema::table($tableNames['model_has_roles'], function (Blueprint $table) use ($columnNames) {
            $table->dropPrimary(['role_id', $columnNames['model_morph_key'], 'model_type']);
            $table->dropIndex('model_has_roles_model_id_model_type_index');
        });

        if (! $isSqlite) {
            DB::statement('ALTER TABLE '.$tableNames['model_has_roles'].' ALTER COLUMN '.$columnNames['model_morph_key'].' TYPE BIGINT USING '.$columnNames['model_morph_key'].'::text::bigint');
        }

        Schema::table($tableNames['model_has_roles'], function (Blueprint $table) use ($columnNames) {
            $table->index([$columnNames['model_morph_key'], 'model_type'], 'model_has_roles_model_id_model_type_index');
            $table->primary(['role_id', $columnNames['model_morph_key'], 'model_type'], 'model_has_roles_role_model_type_primary');
        });
    }
};
