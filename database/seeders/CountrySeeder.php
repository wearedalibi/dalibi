<?php

namespace Database\Seeders;

use App\Constants\Countries;
use App\Models\Country;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CountrySeeder extends Seeder
{
    /**
     * Liste ISO des pays. Idempotent et sûr en prod : upsert par `code`
     * (aucun truncate, UUID stables entre exécutions, compatible PostgreSQL).
     *
     * La liste provient de App\Constants\Countries (source unique, également
     * utilisée sans base par l'assistant d'installation).
     */
    public function run(): void
    {
        $now = now();

        $countries = array_map(
            static fn (string $code, string $name): array => ['name' => $name, 'code' => $code],
            array_keys(Countries::all()),
            array_values(Countries::all()),
        );

        // Normalisation des anciens codes non-ISO déjà présents en base (renomme en
        // conservant l'UUID ; si le code cible existe déjà, on retire le doublon).
        $legacy = ['DS' => 'AS', 'TY' => 'YT', 'TP' => 'TL', 'GK' => 'GG'];
        foreach ($legacy as $old => $new) {
            $oldRow = Country::where('code', $old)->first();
            if (! $oldRow) {
                continue;
            }
            if (Country::where('code', $new)->exists()) {
                $oldRow->delete();
            } else {
                $oldRow->update(['code' => $new]);
            }
        }

        // UUID généré pour les insertions ; sur conflit de `code`, seul le nom
        // est mis à jour (l'id existant reste stable).
        $rows = array_map(fn (array $c) => [
            'id' => (string) Str::uuid(),
            'name' => $c['name'],
            'code' => $c['code'],
            'created_at' => $now,
            'updated_at' => $now,
        ], $countries);

        foreach (array_chunk($rows, 100) as $chunk) {
            Country::upsert($chunk, ['code'], ['name', 'updated_at']);
        }
    }
}
