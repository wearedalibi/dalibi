<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return; // SQLite n'a pas de contraintes CHECK ALTER COLUMN — les données sont compatibles
        }

        // 1. Supprimer l'ancienne contrainte check
        DB::statement('ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_status_check');

        // 2. Migrer les anciennes valeurs vers les nouvelles
        DB::statement("UPDATE enrollments SET status = 'ACTIVE'    WHERE status = 'paid'");
        DB::statement("UPDATE enrollments SET status = 'CANCELLED' WHERE status = 'unpaid'");

        // 3. Changer la colonne et appliquer la nouvelle contrainte + default
        DB::statement('ALTER TABLE enrollments ALTER COLUMN status TYPE VARCHAR(20) USING status::VARCHAR');
        DB::statement("ALTER TABLE enrollments ALTER COLUMN status SET DEFAULT 'PENDING'");
        DB::statement("ALTER TABLE enrollments ADD CONSTRAINT enrollments_status_check CHECK (status IN ('PENDING', 'ACTIVE', 'CANCELLED'))");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement('ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_status_check');

        DB::statement("UPDATE enrollments SET status = 'paid'   WHERE status = 'ACTIVE'");
        DB::statement("UPDATE enrollments SET status = 'unpaid' WHERE status IN ('PENDING', 'CANCELLED')");

        DB::statement('ALTER TABLE enrollments ALTER COLUMN status TYPE VARCHAR(20) USING status::VARCHAR');
        DB::statement("ALTER TABLE enrollments ALTER COLUMN status SET DEFAULT 'paid'");
        DB::statement("ALTER TABLE enrollments ADD CONSTRAINT enrollments_status_check CHECK (status IN ('paid', 'unpaid'))");
    }
};
