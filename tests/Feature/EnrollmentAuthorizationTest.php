<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Scholarship;
use App\Models\School;
use App\Models\Student;
use App\Models\StudentScholarship;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Non-régression sur les autorisations du module Élèves & inscriptions.
 *
 * Une permission de LECTURE ne doit jamais suffire à créer, modifier ou
 * supprimer — en particulier pour les inscriptions, dont la suppression
 * cascade sur les factures et les paiements.
 */
class EnrollmentAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private School $school;

    private AcademicYear $year;

    private Classroom $class;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->school = School::factory()->create();
        $this->year = AcademicYear::create([
            'year' => '2025-2026', 'start_date' => '2025-09-01',
            'end_date' => '2026-07-31', 'active' => true,
        ]);
        $this->class = Classroom::create([
            'name' => '6ème A', 'code' => '6A', 'capacity' => 40, 'active' => true,
        ]);
    }

    /** Utilisateur porteur des seules permissions demandées. */
    private function userWith(string ...$permissions): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo($permissions);

        return $user;
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Roles::ADMINISTRATOR);

        return $user;
    }

    private function enroll(string $matricule = 'E001'): Enrollment
    {
        $student = Student::create([
            'firstname' => 'A', 'lastname' => 'B', 'gender' => 'male', 'birth_date' => '2012-01-01',
            'user_id' => User::factory()->create()->id, 'active' => true, 'matricule' => $matricule,
        ]);

        return Enrollment::create([
            'school_id' => $this->school->id, 'student_id' => $student->id,
            'class_id' => $this->class->id, 'academic_year_id' => $this->year->id,
            'enrollment_code' => 'ENR-'.$matricule, 'enrollment_date' => '2025-09-02',
            'status' => 'ACTIVE',
        ]);
    }

    // --- Inscriptions ---

    public function test_view_permission_alone_cannot_delete_an_enrollment(): void
    {
        $enrollment = $this->enroll();

        $this->actingAs($this->userWith('view_enrollments'))
            ->delete(route('enrollments.destroy', $enrollment))
            ->assertForbidden();

        $this->assertDatabaseHas('enrollments', ['id' => $enrollment->id]);
    }

    public function test_delete_permission_allows_deleting_an_enrollment(): void
    {
        $enrollment = $this->enroll();

        $this->actingAs($this->userWith('view_enrollments', 'delete_enrollments'))
            ->delete(route('enrollments.destroy', $enrollment))
            ->assertRedirect();

        $this->assertDatabaseMissing('enrollments', ['id' => $enrollment->id]);
    }

    public function test_view_permission_alone_cannot_open_the_edit_form(): void
    {
        $enrollment = $this->enroll();

        $this->actingAs($this->userWith('view_enrollments'))
            ->get(route('enrollments.edit', $enrollment))
            ->assertForbidden();
    }

    public function test_view_permission_alone_cannot_reach_the_create_form(): void
    {
        $this->actingAs($this->userWith('view_enrollments'))
            ->get(route('enrollments.create'))
            ->assertForbidden();
    }

    /**
     * Le rôle Directeur possède view/create/edit mais PAS delete :
     * il ne doit pas pouvoir détruire une inscription (et ses paiements).
     */
    public function test_director_cannot_delete_an_enrollment(): void
    {
        $enrollment = $this->enroll();

        $director = User::factory()->create();
        $director->assignRole(Roles::DIRECTOR);

        $this->actingAs($director)
            ->delete(route('enrollments.destroy', $enrollment))
            ->assertForbidden();

        $this->assertDatabaseHas('enrollments', ['id' => $enrollment->id]);
    }

    // --- Bourses d'étudiants ---

    public function test_view_permission_alone_cannot_delete_a_student_scholarship(): void
    {
        $scholarship = Scholarship::create([
            'name' => 'Bourse Test', 'description' => 'Test', 'type' => 'fixed', 'value' => 1000,
        ]);
        $enrollment = $this->enroll('E002');

        $link = StudentScholarship::create([
            'student_id' => $enrollment->student_id,
            'scholarship_id' => $scholarship->id,
            'academic_year_id' => $this->year->id,
        ]);

        $this->actingAs($this->userWith('view_student_scholarships'))
            ->delete(route('student-scholarships.destroy', $link))
            ->assertForbidden();

        $this->assertDatabaseHas('student_scholarships', ['id' => $link->id]);
    }

    // --- Élèves ---

    public function test_view_permission_alone_cannot_delete_a_student(): void
    {
        $enrollment = $this->enroll('E003');

        $this->actingAs($this->userWith('view_students'))
            ->delete(route('students.destroy', $enrollment->student_id))
            ->assertForbidden();

        $this->assertDatabaseHas('students', ['id' => $enrollment->student_id]);
    }

    public function test_admin_keeps_full_access(): void
    {
        $enrollment = $this->enroll('E004');

        $this->actingAs($this->admin())
            ->get(route('enrollments.edit', $enrollment))
            ->assertOk();
    }
}
