<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\BulletinTemplate;
use App\Models\DocumentHeader;
use App\Models\Enrollment;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\ClassroomSeeder;
use Database\Seeders\ClassTypeSeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DefaultUsersSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\StudentTestSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SeederHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function asProduction(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
    }

    private function makeSchool(): School
    {
        return School::create([
            'name' => 'École Test',
            'level' => 'primaire',
            'code' => 'TEST001',
            'address' => 'Lomé',
            'phone' => '+228 00 00 00 00',
            'email' => 'test@ecole.tg',
            'principal' => 'Directeur Test',
            'active' => true,
        ]);
    }

    // --- 1. Les seeders de démonstration ne tournent jamais en production ---

    public function test_default_users_seeder_is_skipped_in_production(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->asProduction();

        // Appel direct : `db:seed` demanderait une confirmation en production.
        $this->app->make(DefaultUsersSeeder::class)->run();

        $this->assertDatabaseMissing('users', ['email' => 'admin@dalibi.tg']);
        $this->assertDatabaseCount('schools', 0);
    }

    public function test_student_test_seeder_is_skipped_in_production(): void
    {
        $this->asProduction();

        $this->app->make(StudentTestSeeder::class)->run();

        $this->assertSame(0, Student::query()->count());
    }

    public function test_database_seeder_keeps_reference_data_but_drops_demo_in_production(): void
    {
        $this->asProduction();

        $this->app->make(DatabaseSeeder::class)->run();

        // Les données de référence sont bien installées…
        $this->assertTrue(Role::where('name', Roles::ADMINISTRATOR)->exists());
        // … mais aucune donnée de démonstration.
        $this->assertDatabaseMissing('users', ['email' => 'admin@dalibi.tg']);
        $this->assertSame(0, Student::query()->count());
    }

    // --- 2. Comptes de démo : changement de mot de passe imposé ---

    public function test_demo_accounts_must_change_their_password(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(DefaultUsersSeeder::class);

        $admin = User::where('email', 'admin@dalibi.tg')->firstOrFail();

        $this->assertTrue($admin->is_demo);
        $this->assertTrue($admin->must_change_password);
        $this->assertTrue($admin->hasRole(Roles::ADMINISTRATOR));
    }

    public function test_user_with_pending_password_change_is_redirected(): void
    {
        $user = User::factory()->create(['must_change_password' => true]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertRedirect(route('user-password.edit'));

        // L'écran de changement reste évidemment accessible.
        $this->actingAs($user)->get(route('user-password.edit'))->assertOk();
    }

    public function test_changing_the_password_lifts_the_constraint(): void
    {
        $user = User::factory()->create(['must_change_password' => true]);

        $this->actingAs($user)
            ->from(route('user-password.edit'))
            ->put(route('user-password.update'), [
                'current_password' => 'password',
                'password' => 'Nouveau-MotDePasse-2026',
                'password_confirmation' => 'Nouveau-MotDePasse-2026',
            ])
            ->assertSessionHasNoErrors();

        $this->assertFalse($user->fresh()->must_change_password);
    }

    public function test_user_without_flag_browses_normally(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $user = User::factory()->create(['must_change_password' => false]);
        $user->assignRole(Roles::ADMINISTRATOR);

        $this->actingAs($user)->get(route('dashboard'))->assertOk();
    }

    // --- 3. Provisionnement automatique à la création d'une école ---

    public function test_creating_a_school_provisions_header_and_bulletin_template(): void
    {
        $school = $this->makeSchool();

        $this->assertDatabaseHas('document_headers', ['school_id' => $school->id]);
        $this->assertDatabaseHas('bulletin_templates', [
            'school_id' => $school->id,
            'classroom_type_id' => null,
        ]);
    }

    public function test_school_provisioning_is_idempotent(): void
    {
        $school = $this->makeSchool();

        // Une seconde sauvegarde ne doit pas dupliquer les réglages.
        $school->update(['name' => 'École Test (renommée)']);

        $this->assertSame(1, BulletinTemplate::where('school_id', $school->id)
            ->whereNull('classroom_type_id')->count());
        $this->assertSame(1, DocumentHeader::where('school_id', $school->id)->count());
    }

    // --- 4. Élèves de test réellement inscrits (développement) ---

    public function test_student_test_seeder_enrolls_students_in_development(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(ClassTypeSeeder::class);
        $this->seed(ClassroomSeeder::class);
        $this->seed(DefaultUsersSeeder::class); // crée l'école par défaut

        $this->seed(StudentTestSeeder::class);

        $this->assertSame(50, Student::query()->count());
        $this->assertSame(50, Enrollment::query()->count());
        $this->assertDatabaseCount('academic_years', 1);
    }
}
