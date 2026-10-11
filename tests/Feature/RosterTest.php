<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RosterTest extends TestCase
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
            'school_id' => $this->school->id, 'year' => '2025-2026',
            'start_date' => '2025-09-01', 'end_date' => '2026-07-31', 'active' => true,
        ]);
        $this->class = Classroom::create(['name' => '6ème A', 'code' => '6A', 'capacity' => 40, 'active' => true]);
    }

    private function admin(): User
    {
        $u = User::factory()->create();
        $u->assignRole(Roles::ADMINISTRATOR);

        return $u;
    }

    private function enroll(string $matricule = 'R001', string $academicStatus = 'en_cours'): Enrollment
    {
        $student = Student::create([
            'firstname' => 'A', 'lastname' => 'B', 'gender' => 'male', 'birth_date' => '2012-01-01',
            'user_id' => User::factory()->create()->id, 'active' => true, 'matricule' => $matricule,
        ]);

        return Enrollment::create([
            'school_id' => $this->school->id, 'student_id' => $student->id,
            'class_id' => $this->class->id, 'academic_year_id' => $this->year->id,
            'enrollment_code' => 'ENR-'.$matricule, 'enrollment_date' => '2025-09-02',
            'status' => 'ACTIVE', 'academic_status' => $academicStatus,
        ]);
    }

    public function test_roster_index_loads(): void
    {
        $this->enroll();
        $this->actingAs($this->admin())
            ->get(route('roster.index', ['academic_year_id' => $this->year->id, 'class_id' => $this->class->id]))
            ->assertOk();
    }

    public function test_can_mark_dropout(): void
    {
        $enr = $this->enroll();

        $this->actingAs($this->admin())
            ->patch(route('roster.update-status', $enr), [
                'academic_status' => 'abandon',
                'status_reason' => 'Déménagement',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('enrollments', [
            'id' => $enr->id, 'academic_status' => 'abandon', 'status_reason' => 'Déménagement',
        ]);
    }

    public function test_can_bulk_validate(): void
    {
        $a = $this->enroll('R001');
        $b = $this->enroll('R002');

        $this->actingAs($this->admin())
            ->post(route('roster.bulk-status'), [
                'enrollment_ids' => [$a->id, $b->id],
                'academic_status' => 'valide',
            ])
            ->assertRedirect();

        $this->assertEquals(2, Enrollment::where('academic_status', 'valide')->count());
    }

    public function test_attendance_excludes_dropouts(): void
    {
        $this->enroll('R001', 'en_cours');
        $this->enroll('R002', 'abandon');

        $response = $this->actingAs($this->admin())
            ->get(route('attendances.index', [
                'classroom_id' => $this->class->id,
                'date' => '2025-10-01',
            ]));

        $response->assertOk();
        // L'élève en abandon ne doit pas figurer dans le roster d'appel
        $props = $response->viewData('page')['props'];
        $this->assertCount(1, $props['studentsWithStatus']);
    }

    public function test_export_returns_pdf(): void
    {
        $this->enroll('R001');

        $response = $this->actingAs($this->admin())
            ->get(route('roster.export', [
                'academic_year_id' => $this->year->id,
                'class_id' => $this->class->id,
            ]));

        $response->assertOk();
        $this->assertEquals('application/pdf', $response->headers->get('content-type'));
    }

    public function test_invalid_status_rejected(): void
    {
        $enr = $this->enroll();
        $this->actingAs($this->admin())
            ->patch(route('roster.update-status', $enr), ['academic_status' => 'xyz'])
            ->assertSessionHasErrors('academic_status');
    }
}
