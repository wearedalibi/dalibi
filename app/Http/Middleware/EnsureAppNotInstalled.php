<?php

namespace App\Http\Middleware;

use App\Support\Install\InstallState;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Protège les routes de l'assistant : une fois l'application installée, elles
 * ne doivent plus être accessibles (anti-réinstallation). On renvoie vers la
 * connexion plutôt qu'une 404 pour guider l'utilisateur.
 */
class EnsureAppNotInstalled
{
    public function __construct(private readonly InstallState $state) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->state->isInstalled()) {
            return redirect('/login');
        }

        return $next($request);
    }
}
