<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PortalStudentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        // Le portail nécessite une école avec l'accès activé (verrou EnsurePortalEnabled).
        School::factory()->create(['portal_enabled' => true]);
    }

    private function staff(string $role): User
    {
        $u = User::factory()->create();
        $u->assignRole($role);

        return $u;
    }

    private function student(string $matricule): Student
    {
        $u = User::factory()->create();

        return Student::create(['user_id' => $u->id, 'matricule' => $matricule, 'firstname' => 'A', 'lastname' => 'B', 'gender' => 'male', 'birth_date' => '2010-01-01']);
    }

    public function test_staff_activates_portal_then_student_can_login(): void
    {
        $student = $this->student('STU-001');

        $this->actingAs($this->staff(Roles::SECRETARIAT))
            ->post(route('students.portal.activate', $student->id), ['password' => 'eleve1234'])
            ->assertRedirect();

        $student->refresh();
        $this->assertTrue($student->portal_active);

        // Connexion par matricule
        $this->postJson('/api/v1/auth/login', ['login' => 'STU-001', 'password' => 'eleve1234'])
            ->assertOk()->assertJsonPath('type', 'student');
    }

    public function test_deactivate_revokes_access(): void
    {
        $student = $this->student('STU-002');
        $secretary = $this->staff(Roles::SECRETARIAT);

        $this->actingAs($secretary)->post(route('students.portal.activate', $student->id), ['password' => 'eleve1234'])->assertRedirect();
        $this->postJson('/api/v1/auth/login', ['login' => 'STU-002', 'password' => 'eleve1234'])->assertOk();

        $this->actingAs($secretary)->post(route('students.portal.deactivate', $student->id))->assertRedirect();

        $this->assertFalse($student->fresh()->portal_active);
        $this->postJson('/api/v1/auth/login', ['login' => 'STU-002', 'password' => 'eleve1234'])->assertStatus(422);
    }

    public function test_teacher_cannot_activate_portal(): void
    {
        $student = $this->student('STU-003');

        $this->actingAs($this->staff(Roles::TEACHER))
            ->post(route('students.portal.activate', $student->id), ['password' => 'eleve1234'])
            ->assertForbidden();
    }
}
