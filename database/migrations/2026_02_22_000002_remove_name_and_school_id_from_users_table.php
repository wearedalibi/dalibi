<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Drop school_id foreign key and column if exists
            if (Schema::hasColumn('users', 'school_id')) {
                $table->dropForeign(['school_id']);
                $table->dropColumn('school_id');
            }

            // Drop name column if exists (drop unique index first for SQLite compatibility)
            if (Schema::hasColumn('users', 'name')) {
                $table->dropUnique('users_name_unique');
                $table->dropColumn('name');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Restore name column
            if (! Schema::hasColumn('users', 'name')) {
                $table->string('name')->unique()->nullable()->after('lastname');
            }

            // Restore school_id foreign key
            if (! Schema::hasColumn('users', 'school_id')) {
                $table->uuid('school_id')->nullable()->after('address');
                $table->foreign('school_id')->references('id')->on('schools')->onDelete('set null');
            }
        });
    }
};
