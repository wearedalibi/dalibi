<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;
use Inertia\Response;

class AboutController extends Controller
{
    public function index(): Response
    {
        // La version fait autorité dans package.json (celle publiée à chaque release).
        $version = '—';
        $packagePath = base_path('package.json');
        if (File::exists($packagePath)) {
            $version = json_decode(File::get($packagePath))->version ?? '—';
        }

        return Inertia::render('Parametres/About', [
            'app' => [
                'name' => config('app.name', 'Dalibi'),
                'version' => $version,
                'laravel' => app()->version(),
                'php' => PHP_VERSION,
                'environment' => app()->environment(),
            ],
        ]);
    }
}
