<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AcademicPeriod;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\ClassroomType;
use App\Models\ClassSubject;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\School;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GradeTest extends TestCase
{
    use RefreshDatabase;

    private School $school;

    private AcademicYear $year;

    private Classroom $class;

    private ClassSubject $classSubject;

    private AcademicPeriod $period;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->school = School::factory()->create();
        $this->year = AcademicYear::create([
            'school_id' => $this->school->id, 'year' => '2025-2026',
            'start_date' => '2025-09-01', 'end_date' => '2026-07-31', 'active' => true,
        ]);
        $type = ClassroomType::create(['name' => 'Collège', 'period_system' => 'trimestre', 'active' => true]);
        $this->class = Classroom::create([
            'name' => '6ème A', 'code' => '6A', 'capacity' => 40, 'classroom_type_id' => $type->id, 'active' => true,
        ]);
        $subject = Subject::create(['name' => 'Maths', 'code' => 'MATH', 'school_id' => $this->school->id]);
        $this->classSubject = ClassSubject::create([
            'class_id' => $this->class->id, 'subject_id' => $subject->id,
            'academic_year_id' => $this->year->id, 'coefficient' => 2,
        ]);
        $this->period = AcademicPeriod::create([
            'name' => 'Trimestre 1', 'start_date' => '2025-09-01', 'end_date' => '2025-12-31',
            'type' => 'trimestre', 'order' => 1, 'weight' => 1,
            'academic_year_id' => $this->year->id, 'class_type_id' => $type->id,
        ]);
        $this->student = Student::create([
            'firstname' => 'Ama', 'lastname' => 'Koffi', 'gender' => 'female',
            'birth_date' => '2012-01-01', 'user_id' => User::factory()->create()->id,
            'active' => true, 'matricule' => 'GRD001',
        ]);
        Enrollment::create([
            'school_id' => $this->school->id, 'student_id' => $this->student->id,
            'class_id' => $this->class->id, 'academic_year_id' => $this->year->id,
            'enrollment_code' => 'ENR001', 'enrollment_date' => '2025-09-02',
            'status' => 'ACTIVE', 'academic_status' => 'en_cours',
        ]);
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Roles::ADMINISTRATOR);

        return $user;
    }

    public function test_grade_index_loads(): void
    {
        $this->actingAs($this->admin())
            ->get(route('grades.index', ['class_id' => $this->class->id]))
            ->assertOk();
    }

    public function test_grade_index_lists_enrolled_students(): void
    {
        // Régression : la liste filtrait sur `status` (paid/unpaid) au lieu de
        // `academic_status`, renvoyant zéro élève malgré des inscriptions.
        $this->actingAs($this->admin())
            ->get(route('grades.index', [
                'class_id' => $this->class->id,
                'class_subject_id' => $this->classSubject->id,
                'academic_period_id' => $this->period->id,
            ]))
            ->assertInertia(fn (Assert $p) => $p
                ->component('Notes/Grades/Index')
                ->has('studentsWithGrades', 1)
                ->where('studentsWithGrades.0.student_id', $this->student->id));
    }

    public function test_can_store_grade_by_period(): void
    {
        $this->actingAs($this->admin())
            ->post(route('grades.store'), [
                'class_subject_id' => $this->classSubject->id,
                'academic_period_id' => $this->period->id,
                'grades' => [
                    ['student_id' => $this->student->id, 'score' => 15.5, 'comments' => 'Bon travail'],
                ],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('grades', [
            'student_id' => $this->student->id,
            'class_subject_id' => $this->classSubject->id,
            'academic_period_id' => $this->period->id,
            'score' => 15.5,
        ]);
    }

    public function test_store_is_idempotent_per_period(): void
    {
        $payload = [
            'class_subject_id' => $this->classSubject->id,
            'academic_period_id' => $this->period->id,
            'grades' => [['student_id' => $this->student->id, 'score' => 12]],
        ];

        $this->actingAs($this->admin())->post(route('grades.store'), $payload);
        $this->actingAs($this->admin())->post(route('grades.store'), [
            ...$payload,
            'grades' => [['student_id' => $this->student->id, 'score' => 18]],
        ]);

        $this->assertEquals(1, Grade::count());
        $this->assertEquals(18, (float) Grade::first()->score);
    }

    public function test_store_requires_period(): void
    {
        $this->actingAs($this->admin())
            ->post(route('grades.store'), [
                'class_subject_id' => $this->classSubject->id,
                'grades' => [['student_id' => $this->student->id, 'score' => 10]],
            ])
            ->assertSessionHasErrors('academic_period_id');
    }
}
