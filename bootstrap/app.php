<?php

use App\Http\Middleware\ForcePasswordChange;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Sentry\Laravel\Integration;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            SetLocale::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            ForcePasswordChange::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Capture des exceptions vers Sentry/GlitchTip. No-op si SENTRY_LARAVEL_DSN est vide.
        Integration::handles($exceptions);

        // Page d'erreur intégrée (React/Inertia), stylée comme l'application.
        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            $status = $response->getStatusCode();

            // Session / CSRF expiré : on renvoie l'utilisateur en arrière avec un message.
            if ($status === 419) {
                return back()->with('message', 'Votre session a expiré, veuillez réessayer.');
            }

            $isDev = app()->environment(['local', 'testing']);

            // Erreurs « client » (403/404/429/503) : page intégrée partout, y compris en dev.
            // Erreur serveur (500) : on conserve la page de debug en dev, page intégrée en prod.
            $showCustom = in_array($status, [403, 404, 429, 503], true)
                || (! $isDev && $status === 500);

            if ($showCustom) {
                return Inertia::render('Error', ['status' => $status])
                    ->toResponse($request)
                    ->setStatusCode($status);
            }

            return $response;
        });
    })->create();
