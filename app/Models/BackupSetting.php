<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class BackupSetting extends Model
{
    protected $primaryKey = 'key';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = ['key', 'value'];

    /** Clés gérées + valeurs par défaut. */
    public const DEFAULTS = [
        'frequency' => 'none',        // none | daily | weekly
        'time' => '02:00',       // heure d'exécution (HH:MM)
        'day_of_week' => '1',           // 1 = lundi … 7 = dimanche (hebdomadaire)
        'formats' => 'json,sql',    // formats générés par le planificateur
        'retention' => '10',          // nombre de sauvegardes conservées (0 = illimité)
    ];

    public static function get(string $key, mixed $default = null): mixed
    {
        $value = Cache::remember("backup_setting_{$key}", 3600, fn () => static::find($key)?->value);

        return $value ?? $default ?? (self::DEFAULTS[$key] ?? null);
    }

    public static function set(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget("backup_setting_{$key}");
    }

    /** Toutes les valeurs (avec défauts). */
    public static function allSettings(): array
    {
        $out = [];
        foreach (array_keys(self::DEFAULTS) as $key) {
            $out[$key] = static::get($key);
        }

        return $out;
    }

    public static function flushCache(): void
    {
        foreach (array_keys(self::DEFAULTS) as $key) {
            Cache::forget("backup_setting_{$key}");
        }
    }
}
