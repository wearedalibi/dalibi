<?php

namespace App\Models;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

class FileStorageSetting extends Model
{
    protected $primaryKey = 'key';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = ['key', 'value'];

    /** Toutes les clés gérées (sert au nettoyage ciblé du cache). */
    public const KEYS = [
        'driver', 's3_key', 's3_secret', 's3_region', 's3_bucket', 's3_endpoint', 's3_url',
    ];

    /** Clés chiffrées au repos (credentials). */
    public const ENCRYPTED_KEYS = ['s3_key', 's3_secret'];

    public static function get(string $key, mixed $default = null): mixed
    {
        // Le cache conserve la valeur brute (chiffrée pour les credentials).
        $raw = Cache::remember("file_storage_{$key}", 3600, function () use ($key) {
            return static::find($key)?->value;
        });

        if ($raw === null) {
            return $default;
        }

        if (in_array($key, self::ENCRYPTED_KEYS, true)) {
            try {
                return Crypt::decryptString($raw);
            } catch (DecryptException) {
                return $default;
            }
        }

        return $raw;
    }

    public static function set(string $key, mixed $value): void
    {
        $stored = $value;

        if ($value !== null && in_array($key, self::ENCRYPTED_KEYS, true)) {
            $stored = Crypt::encryptString($value);
        }

        static::updateOrCreate(['key' => $key], ['value' => $stored]);
        Cache::forget("file_storage_{$key}");
    }

    /** Vide uniquement le cache du module stockage. */
    public static function flushCache(): void
    {
        foreach (self::KEYS as $key) {
            Cache::forget("file_storage_{$key}");
        }
    }

    /** Valeurs déchiffrées, indexées par clé. */
    public static function allSettings(): array
    {
        $settings = [];
        foreach (self::KEYS as $key) {
            $settings[$key] = static::get($key);
        }

        return $settings;
    }

    public static function s3Config(): array
    {
        return [
            'driver' => 's3',
            'key' => static::get('s3_key'),
            'secret' => static::get('s3_secret'),
            'region' => static::get('s3_region', 'auto'),
            'bucket' => static::get('s3_bucket'),
            'url' => static::get('s3_url'),
            'endpoint' => static::get('s3_endpoint'),
            'use_path_style_endpoint' => true,
            'visibility' => 'public',
            'throw' => true,
        ];
    }
}
