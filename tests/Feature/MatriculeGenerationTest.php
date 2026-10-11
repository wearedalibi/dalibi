<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\School;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MatriculeGenerationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    /** @test */
    public function user_gets_matricule_when_assigned_role()
    {
        $school = School::factory()->create();

        $user = User::factory()->create([
            'natricule' => null,
        ]);

        $user->assignRole(Roles::TEACHER);
        $user->natricule = $user->generateMatricule();
        $user->save();

        $this->assertNotNull($user->natricule);
        $this->assertStringStartsWith('PROF', $user->natricule);
    }

    /** @test */
    public function admin_user_has_admin_prefix()
    {
        $school = School::factory()->create();

        $user = User::factory()->create([
            'natricule' => null,
        ]);

        $user->assignRole(Roles::ADMINISTRATOR);
        $user->natricule = $user->generateMatricule();
        $user->save();

        $this->assertStringStartsWith('ADM', $user->natricule);
    }

    /** @test */
    public function director_user_has_director_prefix()
    {
        $school = School::factory()->create();

        $user = User::factory()->create([
            'natricule' => null,
        ]);

        $user->assignRole(Roles::DIRECTOR);
        $user->natricule = $user->generateMatricule();
        $user->save();

        $this->assertStringStartsWith('DIR', $user->natricule);
    }

    /** @test */
    public function accounting_user_has_accounting_prefix()
    {
        $school = School::factory()->create();

        $user = User::factory()->create([
            'natricule' => null,
        ]);

        $user->assignRole(Roles::ACCOUNTING);
        $user->natricule = $user->generateMatricule();
        $user->save();

        $this->assertStringStartsWith('COMPT', $user->natricule);
    }

    /** @test */
    public function secretariat_user_has_secretariat_prefix()
    {
        $school = School::factory()->create();

        $user = User::factory()->create([
            'natricule' => null,
        ]);

        $user->assignRole(Roles::SECRETARIAT);
        $user->natricule = $user->generateMatricule();
        $user->save();

        $this->assertStringStartsWith('SEC', $user->natricule);
    }

    /** @test */
    public function user_without_role_can_still_generate_matricule()
    {
        $school = School::factory()->create();

        $user = User::factory()->create([
            'natricule' => null,
        ]);

        // Should default to administrator
        $user->natricule = $user->generateMatricule();

        $this->assertNotNull($user->natricule);
    }

    /** @test */
    public function matricule_includes_current_year()
    {
        $school = School::factory()->create();
        $currentYear = date('y');

        $user = User::factory()->create([
            'natricule' => null,
        ]);

        $user->assignRole(Roles::TEACHER);
        $user->natricule = $user->generateMatricule();

        $this->assertStringContainsString($currentYear, $user->natricule);
    }

    /** @test */
    public function user_matricule_is_unique()
    {
        $school = School::factory()->create();

        $user1 = User::factory()->create([
            'natricule' => null,
        ]);

        $user2 = User::factory()->create([
            'natricule' => null,
        ]);

        $user1->assignRole(Roles::TEACHER);
        $user1->natricule = $user1->generateMatricule();
        $user1->save();

        $user2->assignRole(Roles::TEACHER);
        $user2->natricule = $user2->generateMatricule();
        $user2->save();

        $this->assertNotEquals($user1->natricule, $user2->natricule);
    }

    /** @test */
    public function user_can_identify_their_role_from_matricule()
    {
        $school = School::factory()->create();

        $user = User::factory()->create([
            'natricule' => null,
        ]);

        $user->assignRole(Roles::TEACHER);
        $user->natricule = $user->generateMatricule();
        $user->save();

        // Verify the matricule contains the teacher prefix
        $this->assertStringStartsWith('PROF', $user->natricule);
    }
}
