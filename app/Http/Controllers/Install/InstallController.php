<?php

namespace App\Http\Controllers\Install;

use App\Constants\Locales;
use App\Http\Controllers\Controller;
use App\Support\Install\RequirementsChecker;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Assistant d'installation web (façon « première configuration »).
 *
 * PHASE 1 — squelette navigable : les 4 écrans (langue, école, admin, sécurité)
 * s'enchaînent, les données sont accumulées en session, et l'étape finale affiche
 * l'écran de progression. L'exécution réelle (migrate + seed de production +
 * création école/admin + pose du verrou) sera branchée en Phase 2 dans un service
 * Installer dédié. Aucun accès base ni écriture .env n'a lieu ici.
 */
class InstallController extends Controller
{
    /** Étape 1 — Langue & bienvenue. */
    public function welcome(RequirementsChecker $requirements): Response|RedirectResponse
    {
        // Si un prérequis bloque, on dévie vers l'écran dédié.
        if (! $requirements->passes()) {
            return redirect('/install/requirements');
        }

        return Inertia::render('install/welcome', [
            'locales' => Locales::options(),
            'current' => session('install.language.locale', config('install.defaults.locale')),
        ]);
    }

    public function storeLanguage(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'locale' => ['required', 'string', 'in:'.implode(',', Locales::codes())],
        ]);

        session(['install.language' => $validated]);
        app()->setLocale($validated['locale']);

        return redirect('/install/school');
    }

    /** Étape 2 — École. */
    public function school(): Response
    {
        return Inertia::render('install/school', [
            'defaults' => config('install.defaults'),
            'values' => session('install.school'),
        ]);
    }

    public function storeSchool(Request $request): RedirectResponse
    {
        // PHASE 1 : validation minimale pour garder le squelette navigable.
        // La validation complète (FormRequest SchoolRequest) arrive en Phase 2.
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'currency' => ['nullable', 'string', 'max:10'],
            'timezone' => ['nullable', 'string', 'max:64'],
            'academic_year_start' => ['nullable', 'string', 'max:20'],
            'period_type' => ['nullable', 'string', 'max:30'],
        ]);

        session(['install.school' => $validated]);

        return redirect('/install/admin');
    }

    /** Étape 3 — Administrateur. */
    public function admin(): Response
    {
        return Inertia::render('install/admin', [
            'values' => array_diff_key((array) session('install.admin', []), ['password' => '', 'password_confirmation' => '']),
        ]);
    }

    public function storeAdmin(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'firstname' => ['required', 'string', 'max:255'],
            'lastname' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'confirmed'],
        ]);

        // On ne conserve pas le mot de passe en clair plus que nécessaire ;
        // en Phase 2 il sera consommé immédiatement par l'Installer.
        session(['install.admin' => $validated]);

        return redirect('/install/security');
    }

    /** Étape 4 — Protocole de sécurité. */
    public function security(): Response
    {
        return Inertia::render('install/security', [
            'defaults' => config('install.security_defaults'),
            'values' => session('install.security'),
        ]);
    }

    public function storeSecurity(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'force_2fa' => ['boolean'],
            'force_https' => ['boolean'],
            'app_debug_off' => ['boolean'],
            'enable_sentry' => ['boolean'],
            'password_policy' => ['nullable', 'string', 'in:strong,medium'],
        ]);

        session(['install.security' => $validated]);

        return redirect('/install/run');
    }

    /**
     * Exécution de l'installation.
     *
     * PHASE 1 : écran de progression statique uniquement. L'orchestration réelle
     * (migrate --force, db:seed ReferenceDataSeeder, création école/admin/année,
     * application des réglages de sécurité, pose du verrou) sera implémentée en
     * Phase 2 par App\Support\Install\Installer.
     */
    public function run(): Response
    {
        return Inertia::render('install/running', [
            'phasePlaceholder' => true,
        ]);
    }

    /** Écran dédié aux prérequis non satisfaits. */
    public function requirements(RequirementsChecker $requirements): Response
    {
        return Inertia::render('install/requirements', [
            'requirements' => $requirements->check(),
            'passes' => $requirements->passes(),
        ]);
    }
}
