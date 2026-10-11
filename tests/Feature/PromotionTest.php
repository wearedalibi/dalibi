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

class PromotionTest extends TestCase
{
    use RefreshDatabase;

    private School $school;

    private AcademicYear $y1;

    private AcademicYear $y2;

    private Classroom $c1;

    private Classroom $c2;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->school = School::factory()->create();
        $this->y1 = AcademicYear::create(['school_id' => $this->school->id, 'year' => '2024-2025', 'start_date' => '2024-09-01', 'end_date' => '2025-07-31', 'active' => false]);
        $this->y2 = AcademicYear::create(['school_id' => $this->school->id, 'year' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-07-31', 'active' => true]);
        $this->c1 = Classroom::create(['name' => '6ème', 'code' => '6E', 'capacity' => 40, 'active' => true]);
        $this->c2 = Classroom::create(['name' => '5ème', 'code' => '5E', 'capacity' => 40, 'active' => true]);
    }

    private function admin(): User
    {
        $u = User::factory()->create();
        $u->assignRole(Roles::ADMINISTRATOR);

        return $u;
    }

    private function enroll(AcademicYear $year, Classroom $class, string $mat, string $academic = 'valide'): Enrollment
    {
        $student = Student::create([
            'firstname' => 'A', 'lastname' => 'B', 'gender' => 'male', 'birth_date' => '2012-01-01',
            'user_id' => User::factory()->create()->id, 'active' => true, 'matricule' => $mat,
        ]);

        return Enrollment::create([
            'school_id' => $this->school->id, 'student_id' => $student->id, 'class_id' => $class->id,
            'academic_year_id' => $year->id, 'enrollment_code' => 'INS-'.$mat, 'enrollment_date' => '2024-09-02',
            'status' => 'ACTIVE', 'academic_status' => $academic,
        ]);
    }

    public function test_index_loads(): void
    {
        $this->actingAs($this->admin())
            ->get(route('promotion.index', ['source_year_id' => $this->y1->id, 'source_class_id' => $this->c1->id]))
            ->assertOk();
    }

    public function test_promotes_students_to_target_class(): void
    {
        $e = $this->enroll($this->y1, $this->c1, 'P001');

        $this->actingAs($this->admin())
            ->post(route('promotion.store'), [
                'target_year_id' => $this->y2->id,
                'target_class_id' => $this->c2->id,
                'student_ids' => [$e->student_id],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('enrollments', [
            'student_id' => $e->student_id,
            'academic_year_id' => $this->y2->id,
            'class_id' => $this->c2->id,
            'academic_status' => 'en_cours',
        ]);
    }

    public function test_skips_already_enrolled_in_target_year(): void
    {
        $e = $this->enroll($this->y1, $this->c1, 'P001');
        // Déjà inscrit dans l'année cible
        Enrollment::create([
            'school_id' => $this->school->id, 'student_id' => $e->student_id, 'class_id' => $this->c2->id,
            'academic_year_id' => $this->y2->id, 'enrollment_code' => 'INS-EXIST', 'enrollment_date' => '2025-09-02',
            'status' => 'ACTIVE', 'academic_status' => 'en_cours',
        ]);

        $this->actingAs($this->admin())
            ->post(route('promotion.store'), [
                'target_year_id' => $this->y2->id,
                'target_class_id' => $this->c2->id,
                'student_ids' => [$e->student_id],
            ]);

        // Pas de doublon : une seule inscription dans l'année cible
        $this->assertEquals(1, Enrollment::where('academic_year_id', $this->y2->id)->where('student_id', $e->student_id)->count());
    }
}
