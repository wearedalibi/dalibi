<?php

use App\Models\Receipt;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('receipts', function (Blueprint $table) {
            $table->string('verification_code')->nullable()->unique()->after('receipt_number');
        });

        // Backfill : code unique pour les reçus existants
        foreach (Receipt::whereNull('verification_code')->get() as $receipt) {
            $receipt->update(['verification_code' => self::makeCode()]);
        }
    }

    public static function makeCode(): string
    {
        do {
            $code = 'DAL-'.strtoupper(Str::random(12));
        } while (Receipt::where('verification_code', $code)->exists());

        return $code;
    }

    public function down(): void
    {
        Schema::table('receipts', function (Blueprint $table) {
            $table->dropColumn('verification_code');
        });
    }
};
