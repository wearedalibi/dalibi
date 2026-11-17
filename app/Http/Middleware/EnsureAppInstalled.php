<?php

namespace App\Http\Middleware;

use App\Support\Install\InstallState;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tant que l'application n'est pas installée, toute requête hors du groupe
 * « install » est redirigée vers l'assistant. Une fois installée, ce middleware
 * est transparent.
 */
class EnsureAppInstalled
{
    public function __construct(private readonly InstallState $state) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->state->isInstalled()) {
            return $next($request);
        }

        // Déjà dans l'assistant : on laisse passer.
        if ($request->is('install', 'install/*')) {
            return $next($request);
        }

        return redirect('/install');
    }
}
