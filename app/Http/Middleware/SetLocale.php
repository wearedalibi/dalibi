<?php

namespace App\Http\Middleware;

use App\Constants\Locales;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /**
     * Applique la langue de la requête, par priorité :
     * profil de l'utilisateur connecté → langue en session (invité) → défaut de l'app.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $candidate = $request->user()?->locale
            ?? $request->session()->get('locale')
            ?? config('app.locale');

        $locale = Locales::isValid($candidate) ? $candidate : Locales::DEFAULT;

        App::setLocale($locale);

        return $next($request);
    }
}
