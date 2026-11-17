<?php

namespace App\Support\Install;

use App\Constants\Currencies;
use App\Constants\Locales;
use App\Constants\Roles;
use App\Models\AcademicYear;
use App\Models\School;
use App\Models\User;
use App\Services\MatriculeService;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Throwable;

/**
 * Orchestration de l'installation réelle (Phase 2).
 *
 * Exécuté une seule fois, à la fin de l'assistant : applique le schéma, pose les
 * données de référence de production, crée l'établissement, l'administrateur et
 * l'année scolaire active, applique les réglages de sécurité, puis pose le verrou.
 *
 * Chaque étape est idempotente : une reprise après interruption ne crée pas de
 * doublon (migrations et seeders rejouables, créations via firstOrCreate/firstOrNew).
 */
class Installer
{
    public function __construct(private readonly InstallState $state) {}

    /**
     * @param  array{locale?: string|null, school?: array<string, mixed>, admin?: array<string, mixed>, security?: array<string, mixed>}  $payload
     */
    public function run(array $payload): void
    {
        $locale = Locales::isValid($payload['locale'] ?? null) ? (string) $payload['locale'] : Locales::DEFAULT;
        $schoolInput = (array) ($payload['school'] ?? []);
        $adminInput = (array) ($payload['admin'] ?? []);
        $security = $this->normalizeSecurity((array) ($payload['security'] ?? []));

        app()->setLocale($locale);

        // 1. Schéma de base de données (idempotent : rien à migrer si déjà à jour).
        Artisan::call('migrate', ['--force' => true]);

        // 2. École — créée avant le seed : les en-têtes et bulletins par défaut
        //    (DocumentHeaderSeeder, BulletinTemplateSeeder) itèrent sur les écoles existantes.
        $school = $this->ensureSchool($schoolInput);

        // 3. Données de référence de production (rôles & permissions, catalogues,
        //    en-têtes/bulletins par école). Entièrement idempotent, exécuté APRÈS la
        //    création de l'école pour que les seeders « par école » s'appliquent.
        Artisan::call('db:seed', ['--class' => ReferenceDataSeeder::class, '--force' => true]);

        // 4. Découpage des périodes (trimestre / semestre) appliqué aux types de classe.
        $this->applyPeriodSystem($schoolInput['period_type'] ?? null);

        // 5. Année scolaire active.
        $this->ensureAcademicYear($schoolInput['academic_year_start'] ?? null);

        // 6. Administrateur — après le seed : le rôle « administrateur » existe désormais.
        $admin = $this->ensureAdministrator($adminInput, $locale);

        // 7. Propriétaire de l'établissement = administrateur à l'origine de l'installation.
        if ($admin !== null && $school->owner_id !== $admin->id) {
            $school->owner_id = $admin->id;
            $school->save();
        }

        // 8. Réglages de sécurité (best-effort sur le fichier .env).
        $this->applySecurity($security);

        // 9. Verrou : l'application est désormais installée.
        $this->state->lock([
            'locale' => $locale,
            'school' => $school->name,
            'owner' => $admin?->email,
            'timezone' => (string) ($schoolInput['timezone'] ?? config('install.defaults.timezone')),
            'security' => $security,
        ]);
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function ensureSchool(array $input): School
    {
        $name = trim((string) ($input['name'] ?? '')) ?: 'Mon établissement';
        $code = trim((string) ($input['code'] ?? '')) ?: $this->generateSchoolCode($name);

        $level = in_array($input['level'] ?? null, ['primaire', 'college', 'lycee'], true)
            ? (string) $input['level']
            : 'primaire';

        // Champs facultatifs calqués sur le modèle School.
        $optional = [];
        foreach (['currency', 'principal', 'email', 'phone', 'address', 'city', 'region', 'po_box', 'description'] as $field) {
            $value = trim((string) ($input[$field] ?? ''));
            if ($value !== '') {
                $optional[$field] = $value;
            }
        }
        $optional['currency'] = $optional['currency'] ?? Currencies::DEFAULT;

        return School::firstOrCreate(
            ['code' => $code],
            array_merge([
                'name' => $name,
                'level' => $level,
                'active' => true,
            ], $optional),
        );
    }

    private function generateSchoolCode(string $name): string
    {
        $base = (string) Str::of($name)->ascii()->upper()->replaceMatches('/[^A-Z0-9]/', '')->substr(0, 8);

        return $base !== '' ? $base : 'ECOLE';
    }

    /** Applique le système de périodes aux types de classe (mono-école). */
    private function applyPeriodSystem(mixed $periodType): void
    {
        $map = [
            'trimester' => 'trimestre',
            'trimestre' => 'trimestre',
            'semester' => 'semestre',
            'semestre' => 'semestre',
        ];

        $system = $map[strtolower((string) $periodType)] ?? null;

        if ($system === null) {
            return;
        }

        DB::table('classroom_types')->update([
            'period_system' => $system,
            'updated_at' => now(),
        ]);
    }

    private function ensureAcademicYear(mixed $startDate): void
    {
        $start = $this->parseDate($startDate) ?? $this->defaultYearStart();
        $end = $start->copy()->addYear()->subDay();
        $year = $start->year.'-'.$end->year;

        $created = AcademicYear::firstOrCreate(
            ['year' => $year],
            [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
                'active' => false,
            ],
        );

        // Garantir qu'exactement une année soit active.
        if (! AcademicYear::query()->where('active', true)->exists()) {
            $created->update(['active' => true]);
        }
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function ensureAdministrator(array $input, string $locale): ?User
    {
        $email = strtolower(trim((string) ($input['email'] ?? '')));

        if ($email === '') {
            return null; // garde-fou : l'email est validé en amont par l'assistant.
        }

        $user = User::firstOrNew(['email' => $email]);

        $user->firstname = trim((string) ($input['firstname'] ?? $user->firstname));
        $user->lastname = trim((string) ($input['lastname'] ?? $user->lastname));
        $user->locale = $locale;
        // L'administrateur vient de choisir son mot de passe : pas de changement imposé.
        $user->must_change_password = false;
        $user->email_verified_at = $user->email_verified_at ?? Carbon::now();

        if (! empty($input['password'])) {
            $user->password = (string) $input['password']; // casté « hashed » par le modèle.
        }

        // Colonnes NOT NULL à renseigner à la création (jamais écrasées sur reprise).
        if (! $user->exists) {
            $user->gender = 'other';
            $user->natricule = app(MatriculeService::class)->generateUserMatricule(Roles::ADMINISTRATOR);
        }

        $user->save();
        $user->syncRoles([Roles::ADMINISTRATOR]);

        return $user;
    }

    /**
     * Normalise les réglages de sécurité (valeurs par défaut sûres).
     *
     * NB : la 2FA n'est volontairement pas imposée (choix de chaque utilisateur).
     *
     * @param  array<string, mixed>  $input
     * @return array{force_https: bool, app_debug_off: bool, enable_sentry: bool, password_policy: string}
     */
    private function normalizeSecurity(array $input): array
    {
        $defaults = (array) config('install.security_defaults');

        return [
            'force_https' => (bool) ($input['force_https'] ?? $defaults['force_https'] ?? true),
            'app_debug_off' => (bool) ($input['app_debug_off'] ?? $defaults['app_debug_off'] ?? true),
            'enable_sentry' => (bool) ($input['enable_sentry'] ?? $defaults['enable_sentry'] ?? false),
            'password_policy' => in_array($input['password_policy'] ?? null, ['strong', 'medium'], true)
                ? (string) $input['password_policy']
                : (string) ($defaults['password_policy'] ?? 'strong'),
        ];
    }

    /**
     * Applique les réglages de sécurité qui ont un effet runtime via .env.
     *
     * Best-effort : si .env est absent ou non inscriptible, on n'échoue pas
     * l'installation (les choix restent consignés dans le verrou).
     *
     * @param  array{force_https: bool, app_debug_off: bool, enable_sentry: bool, password_policy: string}  $security
     */
    private function applySecurity(array $security): void
    {
        $changes = [];

        if ($security['app_debug_off']) {
            $changes['APP_DEBUG'] = 'false';
        }

        // force_https réellement effectif : FORCE_HTTPS est lu par AppServiceProvider
        // (hors local) pour appeler URL::forceScheme('https'). On aligne aussi APP_URL.
        $changes['FORCE_HTTPS'] = $security['force_https'] ? 'true' : 'false';
        if ($security['force_https']) {
            $changes['APP_URL'] = $this->httpsUrl((string) config('app.url'));
        }

        $this->writeEnv($changes);
    }

    private function httpsUrl(string $url): string
    {
        $url = trim($url) ?: 'http://localhost';

        return (string) preg_replace('#^http://#i', 'https://', $url);
    }

    /**
     * Écrit/renseigne des clés dans le fichier .env (best-effort).
     *
     * @param  array<string, string>  $changes
     */
    private function writeEnv(array $changes): void
    {
        // Jamais de mutation du .env sous tests (évite tout effet de bord sur le dépôt).
        if (app()->runningUnitTests()) {
            return;
        }

        try {
            $path = base_path('.env');

            if (! File::exists($path) || ! File::isWritable($path)) {
                return;
            }

            $content = (string) File::get($path);

            foreach ($changes as $key => $value) {
                $line = $key.'='.$value;
                $pattern = '/^'.preg_quote($key, '/').'=.*$/m';

                $content = preg_match($pattern, $content)
                    ? (string) preg_replace($pattern, $line, $content)
                    : rtrim($content, "\n")."\n".$line."\n";
            }

            File::put($path, $content);
        } catch (Throwable) {
            // Best-effort : un .env non modifiable ne doit pas faire échouer l'installation.
        }
    }

    private function parseDate(mixed $value): ?Carbon
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->startOfDay();
        } catch (Throwable) {
            return null;
        }
    }

    /** Rentrée par défaut : 1er septembre de l'année scolaire courante. */
    private function defaultYearStart(): Carbon
    {
        $now = Carbon::now();
        $year = $now->month >= 9 ? $now->year : $now->year - 1;

        return Carbon::create($year, 9, 1)->startOfDay();
    }
}
