<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Models\FileStorageSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class FileStorageController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('manage_file_storage'), 403);

        $settings = FileStorageSetting::allSettings();

        // Masquer les credentials : on ne renvoie jamais la clé ni le secret en clair.
        return Inertia::render('Parametres/FileStorage', [
            'settings' => [
                'driver' => $settings['driver'] ?? 'local',
                's3_key' => $this->maskKey($settings['s3_key'] ?? null),
                's3_secret' => '',
                's3_region' => $settings['s3_region'] ?? '',
                's3_bucket' => $settings['s3_bucket'] ?? '',
                's3_endpoint' => $settings['s3_endpoint'] ?? '',
                's3_url' => $settings['s3_url'] ?? '',
            ],
            'hasKey' => ! empty($settings['s3_key']),
            'hasSecret' => ! empty($settings['s3_secret']),
        ]);
    }

    /** Ne révèle que les 4 derniers caractères de la clé d'accès. */
    private function maskKey(?string $value): string
    {
        if (empty($value)) {
            return '';
        }

        return str_repeat('•', max(0, strlen($value) - 4)).substr($value, -4);
    }

    /** Vrai si la valeur soumise est une nouvelle saisie (ni vide, ni masquée). */
    private function isNewSecret(?string $value): bool
    {
        return ! empty($value) && ! str_contains($value, '•');
    }

    public function update(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('manage_file_storage'), 403);

        $driver = $request->validate(['driver' => ['required', 'in:local,s3']])['driver'];

        if ($driver === 'local') {
            FileStorageSetting::set('driver', 'local');
            FileStorageSetting::flushCache();

            return back()->with('message', 'Configuration de stockage mise à jour.');
        }

        // --- Driver S3 ---
        $validated = $request->validate([
            's3_key' => ['nullable', 'string'],
            's3_secret' => ['nullable', 'string'],
            's3_region' => ['required', 'string'],
            's3_bucket' => ['required', 'string'],
            's3_endpoint' => ['nullable', 'url'],
            's3_url' => ['nullable', 'url'],
        ]);

        // Nouvelle valeur fournie ? sinon on conserve celle déjà chiffrée en base.
        $newKey = $this->isNewSecret($validated['s3_key'] ?? null);
        $newSecret = $this->isNewSecret($validated['s3_secret'] ?? null);

        $effectiveKey = $newKey ? $validated['s3_key'] : FileStorageSetting::get('s3_key');
        $effectiveSecret = $newSecret ? $validated['s3_secret'] : FileStorageSetting::get('s3_secret');

        // Valider la présence des credentials AVANT de basculer le driver.
        if (empty($effectiveKey) || empty($effectiveSecret)) {
            return back()->withErrors([
                's3_key' => 'La clé d\'accès et le secret sont requis pour activer le stockage S3.',
            ]);
        }

        if ($newKey) {
            FileStorageSetting::set('s3_key', $validated['s3_key']);
        }
        if ($newSecret) {
            FileStorageSetting::set('s3_secret', $validated['s3_secret']);
        }
        FileStorageSetting::set('s3_region', $validated['s3_region']);
        FileStorageSetting::set('s3_bucket', $validated['s3_bucket']);
        FileStorageSetting::set('s3_endpoint', $validated['s3_endpoint'] ?? null);
        FileStorageSetting::set('s3_url', $validated['s3_url'] ?? null);
        FileStorageSetting::set('driver', 's3');

        FileStorageSetting::flushCache();

        return back()->with('message', 'Configuration de stockage mise à jour.');
    }

    public function test(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('manage_file_storage'), 403);

        try {
            $driver = FileStorageSetting::get('driver', 'local');

            if ($driver === 's3') {
                $disk = Storage::build(FileStorageSetting::s3Config());
            } else {
                $disk = Storage::disk('public');
            }

            $testFile = 'dalibi-storage-test-'.time().'.txt';
            $disk->put($testFile, 'ok');
            $disk->delete($testFile);

            return response()->json(['success' => true, 'driver' => $driver]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
        }
    }
}
