<?php

namespace Tests\Feature\Install;

use App\Constants\Countries;
use App\Constants\Roles;
use App\Models\AcademicYear;
use App\Models\School;
use App\Models\User;
use App\Support\Install\InstallState;
use Database\Seeders\ClassTypeSeeder;
use Database\Seeders\CountrySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Tests\TestCase;

class InstallWizardTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        // Ne jamais laisser fuiter le fichier-verrou créé par un test d'exécution.
        $lock = storage_path('app/'.config('install.lock_file', 'installed.json'));
        if (is_file($lock)) {
            @unlink($lock);
        }

        parent::tearDown();
    }

    private function notInstalled(): void
    {
        $this->app->make(InstallState::class)->fake(false);
    }

    private function installed(): void
    {
        $this->app->make(InstallState::class)->fake(true);
    }

    public function test_welcome_screen_renders_when_not_installed(): void
    {
        $this->notInstalled();

        $this->get('/install')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('install/welcome'));
    }

    public function test_requests_are_redirected_to_installer_when_not_installed(): void
    {
        $this->notInstalled();

        $this->get('/login')->assertRedirect('/install');
        $this->get('/dashboard')->assertRedirect('/install');
    }

    public function test_installer_is_locked_once_installed(): void
    {
        $this->installed();

        $this->get('/install')->assertRedirect('/login');
    }

    public function test_language_step_validates_and_advances(): void
    {
        $this->notInstalled();

        $this->post('/install/language', ['locale' => 'xx'])
            ->assertSessionHasErrors('locale');

        $this->post('/install/language', ['locale' => 'en'])
            ->assertRedirect('/install/admin')
            ->assertSessionHas('install.language.locale', 'en')
            // La clé « locale » standard est posée → SetLocale l'applique partout.
            ->assertSessionHas('locale', 'en');

        // Les étapes suivantes basculent dans la langue choisie (interface complète).
        $this->get('/install/admin')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('locale', 'en'));
    }

    public function test_school_step_requires_a_name_and_is_the_last_step(): void
    {
        $this->notInstalled();

        $this->post('/install/school', [])
            ->assertSessionHasErrors('name');

        // L'école est la dernière étape : elle mène directement à l'exécution.
        $this->post('/install/school', ['name' => 'Collège Dalibi'])
            ->assertRedirect('/install/run')
            ->assertSessionHas('install.school.name', 'Collège Dalibi');
    }

    public function test_admin_step_requires_confirmed_password_and_advances(): void
    {
        $this->notInstalled();

        $this->post('/install/admin', [
            'firstname' => 'Ada',
            'lastname' => 'Admin',
            'email' => 'ada@example.test',
            'password' => 'secret-pass-123',
            'password_confirmation' => 'different',
        ])->assertSessionHasErrors('password');

        $this->post('/install/admin', [
            'firstname' => 'Ada',
            'lastname' => 'Admin',
            'email' => 'ada@example.test',
            'password' => 'secret-pass-123',
            'password_confirmation' => 'secret-pass-123',
        ])->assertRedirect('/install/security');
    }

    public function test_admin_password_applies_the_app_password_policy(): void
    {
        $this->notInstalled();

        // En test, Password::defaults() est volontairement souple : on force la
        // politique stricte pour prouver que l'étape admin l'applique réellement (H1).
        Password::defaults(fn () => Password::min(12)->mixedCase()->numbers()->symbols());

        $this->post('/install/admin', [
            'firstname' => 'Ada',
            'lastname' => 'Admin',
            'email' => 'ada@example.test',
            'password' => 'faible',
            'password_confirmation' => 'faible',
        ])->assertSessionHasErrors('password');

        $this->post('/install/admin', [
            'firstname' => 'Ada',
            'lastname' => 'Admin',
            'email' => 'ada@example.test',
            'password' => 'Str0ng-P@ssw0rd!',
            'password_confirmation' => 'Str0ng-P@ssw0rd!',
        ])->assertRedirect('/install/security')->assertSessionHasNoErrors();
    }

    public function test_security_step_advances_to_school(): void
    {
        $this->notInstalled();

        // La sécurité précède désormais l'école (dernière étape).
        $this->post('/install/security', [
            'app_debug_off' => '1',
            'force_https' => '1',
            'enable_sentry' => '0',
            'password_policy' => 'strong',
        ])->assertRedirect('/install/school');
    }

    public function test_run_screen_renders_without_executing(): void
    {
        $this->notInstalled();

        $this->get('/install/run')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('install/running'));

        // L'affichage de l'écran ne crée rien : aucune école, aucun utilisateur.
        $this->assertDatabaseCount('schools', 0);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_execute_requires_the_essential_steps(): void
    {
        $this->notInstalled();

        // Sans données école/admin en session, on repart au début.
        $this->post('/install/execute')->assertRedirect('/install');

        $this->assertDatabaseCount('schools', 0);
    }

    public function test_execute_rejects_a_tampered_admin_session(): void
    {
        $this->notInstalled();

        // M2 : mot de passe non déchiffrable (session altérée) → retour à l'étape admin,
        // aucune installation.
        $this->session([
            'install.school' => ['name' => 'Collège Dalibi'],
            'install.admin' => [
                'firstname' => 'Ada',
                'lastname' => 'Admin',
                'email' => 'ada@example.test',
                'password' => 'ceci-nest-pas-chiffre',
            ],
        ]);

        $this->post('/install/execute')->assertRedirect('/install/admin');

        $this->assertDatabaseCount('schools', 0);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_class_types_config_matches_seeder(): void
    {
        // Garde-fou : chaque nom de cycle déclaré dans config('install.levels') doit
        // correspondre à un ClassroomType réellement posé par ClassTypeSeeder, sinon
        // l'Installer ne pourrait pas rattacher le type à l'école.
        $this->seed(ClassTypeSeeder::class);

        $names = array_values((array) config('install.levels'));

        foreach ($names as $name) {
            $this->assertDatabaseHas('classroom_types', ['name' => $name]);
        }
    }

    public function test_country_seeder_matches_countries_constant(): void
    {
        // La table « countries » est peuplée depuis App\Constants\Countries (source
        // unique) : le select pays de l'assistant et la base restent cohérents.
        $this->seed(CountrySeeder::class);

        $this->assertDatabaseCount('countries', count(Countries::all()));
        $this->assertDatabaseHas('countries', ['code' => 'TG', 'name' => 'Togo']);
    }

    public function test_execute_installs_the_application_and_locks_it(): void
    {
        $this->notInstalled();

        $this->session([
            'install.language' => ['locale' => 'fr'],
            'install.school' => [
                'name' => 'Collège Dalibi',
                // Multi-niveaux : collège + lycée (rattachés comme types de classe).
                'levels' => ['college', 'lycee'],
                // « devise » = slogan, distincte de « currency » (monnaie).
                'devise' => 'Travail - Liberté - Patrie',
                'currency' => 'XOF',
                'country' => 'TG',
                'principal' => 'M. Dalibi',
                'period_type' => 'semester',
                'academic_year_start' => '2026-09-01',
            ],
            'install.admin' => [
                'firstname' => 'Ada',
                'lastname' => 'Admin',
                'email' => 'ada@example.test',
                // M2 : l'étape admin chiffre le mot de passe en session.
                'password' => Crypt::encryptString('secret-pass-123'),
            ],
            'install.security' => [
                'app_debug_off' => true,
                'force_https' => false,
                'enable_sentry' => false,
                'password_policy' => 'strong',
            ],
        ]);

        $this->post('/install/execute')->assertRedirect('/login');

        // École créée avec les champs du modèle.
        $school = School::query()->where('name', 'Collège Dalibi')->first();
        $this->assertNotNull($school);
        $this->assertSame('XOF', $school->currency);
        $this->assertSame('TG', $school->country);
        // « devise » (slogan) et « currency » (monnaie) sont bien deux champs distincts.
        $this->assertSame('Travail - Liberté - Patrie', $school->devise);
        // Niveau principal (enum) dérivé des cycles cochés : collège le plus bas présent.
        $this->assertSame('college', $school->level);
        $this->assertSame('M. Dalibi', $school->principal);

        // Multi-niveaux : les deux cycles cochés sont rattachés comme types de classe.
        $this->assertEqualsCanonicalizing(
            ['Collège (Secondaire 1)', 'Lycée (Secondaire 2)'],
            $school->classTypes()->pluck('name')->all(),
        );

        // Administrateur créé, rôle attribué, pas de changement de mot de passe imposé.
        $admin = User::query()->where('email', 'ada@example.test')->first();
        $this->assertNotNull($admin);
        $this->assertTrue($admin->hasRole(Roles::ADMINISTRATOR));
        $this->assertFalse($admin->must_change_password);
        $this->assertNotEmpty($admin->natricule);
        // M2 : le mot de passe déchiffré est bien stocké haché et vérifiable.
        $this->assertTrue(Hash::check('secret-pass-123', $admin->password));

        // Le propriétaire de l'école est l'administrateur créé.
        $this->assertSame($admin->id, $school->owner_id);
        $this->assertTrue($school->owner->is($admin));

        // Une année scolaire active existe.
        $this->assertTrue(AcademicYear::query()->where('active', true)->exists());

        // Découpage des périodes appliqué aux types de classe.
        $this->assertDatabaseHas('classroom_types', ['period_system' => 'semestre']);

        // Verrou posé : l'assistant est désormais inaccessible.
        $this->app->make(InstallState::class)->fake(null);
        $this->assertTrue($this->app->make(InstallState::class)->isInstalled());
        $this->get('/install')->assertRedirect('/login');

        // Les données d'installation (dont le mot de passe) ne restent pas en session.
        $this->assertNull(session('install.admin'));
    }
}
