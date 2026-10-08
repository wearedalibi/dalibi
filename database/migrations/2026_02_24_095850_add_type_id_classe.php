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
        Schema::table('classes', function (Blueprint $table) {
            if (! Schema::hasColumn('classes', 'classroom_type_id')) {
                $table->uuid('classroom_type_id')->nullable()->after('capacity');
                $table->foreign('classroom_type_id')
                    ->references('id')
                    ->on('classroom_types')
                    ->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('classes', function (Blueprint $table) {
            if (Schema::hasColumn('classes', 'classroom_type_id')) {
                $table->dropForeign(['classroom_type_id']);
                $table->dropColumn('classroom_type_id');
            }
        });
    }
};
