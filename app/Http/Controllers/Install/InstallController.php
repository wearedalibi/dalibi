<?php

namespace App\Http\Controllers\Install;

use App\Concerns\PasswordValidationRules;
use App\Constants\Currencies;
use App\Constants\Locales;
use App\Http\Controllers\Controller;
use App\Support\Install\Installer;
use App\Support\Install\RequirementsChecker;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
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
    use PasswordValidationRules;

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

        // On mémorise le choix pour l'installation ET sous la clé « locale »
        // standard : le middleware SetLocale l'applique alors à toutes les étapes
        // suivantes et à l'ensemble de l'interface (invité, avant connexion).
        session([
            'install.language' => $validated,
            'locale' => $validated['locale'],
        ]);
        app()->setLocale($validated['locale']);

        return redirect('/install/admin');
    }

    /** Étape 4 (dernière) — École. Déclenche l'installation. */
    public function school(): Response
    {
        return Inertia::render('install/school', [
            'defaults' => config('install.defaults'),
            'currencies' => Currencies::options(),
            'values' => session('install.school'),
        ]);
    }

    public function storeSchool(Request $request): RedirectResponse
    {
        // Champs calqués sur le modèle School (colonnes réelles de la table « schools »).
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'level' => ['nullable', 'in:primaire,college,lycee'],
            'code' => ['nullable', 'string', 'max:50'],
            'currency' => ['nullable', 'string', 'in:'.implode(',', Currencies::codes())],
            'principal' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:120'],
            'region' => ['nullable', 'string', 'max:120'],
            'po_box' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:1000'],
            'timezone' => ['nullable', 'string', 'max:64'],
            'academic_year_start' => ['nullable', 'string', 'max:20'],
            'period_type' => ['nullable', 'string', 'max:30'],
        ]);

        session(['install.school' => $validated]);

        return redirect('/install/run');
    }

    /** Étape 2 — Administrateur. */
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
            // H1 : le compte le plus privilégié applique la politique mdp de l'app
            // (Password::default() : min 12, casse mixte, chiffres, symboles, uncompromised en prod).
            'password' => $this->passwordRules(),
        ]);

        // M2 : le mot de passe ne doit jamais transiter en clair dans la session
        // (payload fichier non chiffré au repos). On le chiffre ici (APP_KEY) ; il
        // n'est déchiffré qu'à l'exécution, puis purgé. La base reste l'unique
        // stockage final, en haché.
        $validated['password'] = Crypt::encryptString($validated['password']);
        session(['install.admin' => $validated]);

        return redirect('/install/security');
    }

    /** Étape 3 — Protocole de sécurité. */
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
            'force_https' => ['boolean'],
            'app_debug_off' => ['boolean'],
            'enable_sentry' => ['boolean'],
            'password_policy' => ['nullable', 'string', 'in:strong,medium'],
        ]);

        session(['install.security' => $validated]);

        return redirect('/install/school');
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

        // M2 : déchiffrement du mot de passe juste avant de le consommer. Une session
        // altérée (déchiffrement impossible) renvoie à l'étape administrateur.
        $admin = (array) session('install.admin', []);
        if (isset($admin['password'])) {
            try {
                $admin['password'] = Crypt::decryptString((string) $admin['password']);
            } catch (DecryptException) {
                return redirect('/install/admin');
            }
        }

        $payload = [
            'locale' => session('install.language.locale', config('install.defaults.locale')),
            'school' => (array) session('install.school', []),
            'admin' => $admin,
            'security' => (array) session('install.security', []),
        ];

        try {
            $installer->run($payload);
        } catch (Throwable $e) {
            // L1 : journaliser le type et l'emplacement, mais jamais le message d'une
            // QueryException (il contient le SQL et ses bindings — email, etc.).
            Log::error('Échec de l\'installation web', [
                'type' => $e::class,
                'at' => $e->getFile().':'.$e->getLine(),
                'message' => $e instanceof QueryException ? '[requête base masquée]' : $e->getMessage(),
            ]);

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
