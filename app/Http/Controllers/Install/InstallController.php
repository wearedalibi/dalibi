<?php

namespace App\Http\Controllers\Install;

use App\Constants\Locales;
use App\Http\Controllers\Controller;
use App\Support\Install\Installer;
use App\Support\Install\RequirementsChecker;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * Assistant d'installation web (façon « première configuration »).
 *
 * Les quatre écrans (langue, école, admin, sécurité) accumulent leurs données en
 * session ; l'écran final déclenche l'exécution réelle via le service Installer
 * (migrate + seed de production + création école/admin/année + réglages de
 * sécurité + pose du verrou), puis redirige vers la connexion.
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
     * Écran de progression. L'exécution réelle est déclenchée par le front
     * (POST /install/execute) dès l'affichage, puis la page redirige vers /login.
     */
    public function run(): Response
    {
        return Inertia::render('install/running');
    }

    /**
     * Exécute l'installation à partir des données accumulées en session.
     *
     * Idempotent et protégé : en cas d'échec, l'utilisateur revient à l'écran de
     * progression avec un message et peut relancer sans créer de doublon.
     */
    public function execute(Request $request, Installer $installer): RedirectResponse
    {
        // Garde-fou : sans les étapes essentielles, on renvoie l'utilisateur au début.
        if (! session()->has('install.school') || ! session()->has('install.admin')) {
            return redirect('/install');
        }

        $payload = [
            'locale' => session('install.language.locale', config('install.defaults.locale')),
            'school' => (array) session('install.school', []),
            'admin' => (array) session('install.admin', []),
            'security' => (array) session('install.security', []),
        ];

        try {
            $installer->run($payload);
        } catch (Throwable $e) {
            Log::error('Échec de l\'installation web', ['exception' => $e]);

            return back()->withErrors([
                'install' => __('install.running.error'),
            ]);
        }

        // Nettoyage : ne pas conserver les données d'installation (dont le mot de passe).
        $request->session()->forget(['install.language', 'install.school', 'install.admin', 'install.security']);

        return redirect('/login')->with('status', __('install.running.done'));
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
