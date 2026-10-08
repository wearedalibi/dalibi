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
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StudentStatsTest extends TestCase
{
    use RefreshDatabase;

    private School $school;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->school = School::factory()->create();
    }

    private function admin(): User
    {
        return tap(User::factory()->create(), fn ($u) => $u->assignRole(Roles::ADMINISTRATOR));
    }

    private function student(string $mat, string $gender = 'male'): Student
    {
        return Student::create([
            'user_id' => User::factory()->create()->id, 'matricule' => $mat,
            'firstname' => 'A', 'lastname' => 'B', 'gender' => $gender,
            'birth_date' => '2012-01-01', 'active' => true,
        ]);
    }

    private function year(string $year, bool $active): AcademicYear
    {
        return AcademicYear::create(['year' => $year, 'start_date' => '2025-09-01', 'end_date' => '2026-07-31', 'active' => $active]);
    }

    private function enroll(Student $s, Classroom $c, AcademicYear $y, string $academicStatus = 'en_cours'): Enrollment
    {
        return Enrollment::create([
            'school_id' => $this->school->id, 'student_id' => $s->id, 'class_id' => $c->id,
            'academic_year_id' => $y->id, 'enrollment_code' => 'ENR-'.Str::random(8),
            'enrollment_date' => '2025-09-01', 'status' => 'ACTIVE', 'academic_status' => $academicStatus,
        ]);
    }

    public function test_requires_view_students_permission(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('students.stats'))
            ->assertForbidden();
    }

    public function test_defaults_to_active_year_cohort(): void
    {
        $active = $this->year('2025-2026', true);
        $prev = $this->year('2024-2025', false);
        $class = Classroom::factory()->create();

        $this->enroll($this->student('M-1'), $class, $active);
        $this->enroll($this->student('M-2'), $class, $prev);

        $this->actingAs($this->admin())
            ->get(route('students.stats'))
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Eleves/Students/Stats')
                ->where('selectedYear.id', $active->id)
                ->where('summary.enrolled', 1));
    }

    public function test_can_select_another_year(): void
    {
        $active = $this->year('2025-2026', true);
        $prev = $this->year('2024-2025', false);
        $class = Classroom::factory()->create();

        $this->enroll($this->student('M-1'), $class, $active);
        $this->enroll($this->student('M-2'), $class, $prev);

        $this->actingAs($this->admin())
            ->get(route('students.stats', ['academic_year_id' => $prev->id]))
            ->assertInertia(fn (Assert $p) => $p
                ->where('selectedYear.id', $prev->id)
                ->where('summary.enrolled', 1));
    }

    public function test_gender_breakdown_is_scoped_to_selected_year(): void
    {
        $active = $this->year('2025-2026', true);
        $other = $this->year('2024-2025', false);
        $class = Classroom::factory()->create();

        $this->enroll($this->student('G-1', 'male'), $class, $active);
        $this->enroll($this->student('G-2', 'female'), $class, $active);
        $this->enroll($this->student('G-3', 'male'), $class, $other); // hors cohorte active

        $this->actingAs($this->admin())
            ->get(route('students.stats'))
            ->assertInertia(fn (Assert $p) => $p
                ->where('byGender.male', 1)
                ->where('byGender.female', 1));
    }
}
