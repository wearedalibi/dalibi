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
        // Add unique index to natricule column in users table
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'natricule')) {
            Schema::table('users', function (Blueprint $table) {
                // Check if index doesn't already exist
                if (! Schema::hasIndex('users', 'users_natricule_unique')) {
                    $table->unique('natricule')->index();
                }
            });
        }

        // Add unique index to registration_number column in students table
        if (Schema::hasTable('students') && Schema::hasColumn('students', 'registration_number')) {
            Schema::table('students', function (Blueprint $table) {
                if (! Schema::hasIndex('students', 'students_registration_number_unique')) {
                    $table->unique('registration_number')->index();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_natricule_unique');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropUnique('students_registration_number_unique');
        });
    }
};
