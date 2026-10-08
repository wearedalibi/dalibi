<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('file_storage_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        // Valeurs par défaut
        $now = now();
        DB::table('file_storage_settings')->insert([
            ['key' => 'driver',       'value' => 'local', 'created_at' => $now, 'updated_at' => $now],
            ['key' => 's3_key',       'value' => null,    'created_at' => $now, 'updated_at' => $now],
            ['key' => 's3_secret',    'value' => null,    'created_at' => $now, 'updated_at' => $now],
            ['key' => 's3_region',    'value' => null,    'created_at' => $now, 'updated_at' => $now],
            ['key' => 's3_bucket',    'value' => null,    'created_at' => $now, 'updated_at' => $now],
            ['key' => 's3_endpoint',  'value' => null,    'created_at' => $now, 'updated_at' => $now],
            ['key' => 's3_url',       'value' => null,    'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('file_storage_settings');
    }
};
