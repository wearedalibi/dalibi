<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AcademicPeriod;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\ClassroomType;
use App\Models\ClassSubject;
use App\Models\Enrollment;
use App\Models\Evaluation;
use App\Models\EvaluationTemplate;
use App\Models\EvaluationType;
use App\Models\School;
use App\Models\Student;
use App\Models\Subject;
use App\Models\SubjectAssignment;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Cloisonnement de la saisie des notes.
 *
 * Un enseignant ne saisit que sur les classes/matières auxquelles il est
 * affecté, et on ne peut noter qu'un élève réellement inscrit dans la classe
 * de l'évaluation.
 */
class MarkEntryScopeTest extends TestCase
{
    use RefreshDatabase;

    private School $school;

    private AcademicYear $year;

    private ClassroomType $type;

    private Classroom $class;

    private Subject $subject;

    private ClassSubject $cs;

    private Evaluation $evaluation;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->school = School::factory()->create();
        $this->year = AcademicYear::create([
            'year' => '2025-2026', 'start_date' => '2025-09-01',
            'end_date' => '2026-07-31', 'active' => true,
        ]);
        $this->type = ClassroomType::factory()->create(['period_system' => 'trimestre']);
        $this->class = Classroom::factory()->create(['classroom_type_id' => $this->type->id]);
        $this->subject = Subject::create(['name' => 'Maths', 'code' => 'MATH']);
        $this->cs = ClassSubject::create([
            'class_id' => $this->class->id, 'subject_id' => $this->subject->id,
            'coefficient' => 2, 'academic_year_id' => $this->year->id,
        ]);

        $period = AcademicPeriod::create([
            'name' => 'Trimestre 1', 'start_date' => '2025-09-01', 'end_date' => '2025-12-31',
            'type' => 'trimestre', 'order' => 1, 'weight' => 1, 'is_current' => true,
            'academic_year_id' => $this->year->id, 'class_type_id' => $this->type->id,
        ]);

        $template = EvaluationTemplate::create([
            'academic_period_id' => $period->id,
            'evaluation_type_id' => EvaluationType::create(['name' => 'Devoir', 'category' => 'continu'])->id,
            'class_type_id' => $this->type->id,
            'name' => 'D1', 'coefficient' => 1, 'max_score' => 20, 'date' => '2025-10-01',
        ]);

        $this->evaluation = Evaluation::create([
            'evaluation_template_id' => $template->id,
            'class_subject_id' => $this->cs->id,
            'date' => '2025-10-01', 'status' => 'published',
        ]);
    }

    private function teacher(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Roles::TEACHER);

        return $user;
    }

    private function assign(User $teacher, ?string $subjectId = null): void
    {
        SubjectAssignment::create([
            'teacher_id' => $teacher->id,
            'class_id' => $this->class->id,
            'subject_id' => $subjectId ?? $this->subject->id,
            'academic_year_id' => $this->year->id,
            'active' => true,
        ]);
    }

    /** Élève inscrit (actif) dans la classe de l'évaluation. */
    private function enrolledStudent(): Student
    {
        $student = Student::create([
            'user_id' => User::factory()->create()->id, 'matricule' => 'M'.Str::random(6),
            'firstname' => 'P', 'lastname' => Str::random(5), 'gender' => 'male', 'birth_date' => '2012-01-01',
        ]);

        Enrollment::create([
            'school_id' => $this->school->id, 'student_id' => $student->id,
            'class_id' => $this->class->id, 'academic_year_id' => $this->year->id,
            'enrollment_code' => 'E'.Str::random(8), 'enrollment_date' => now(),
            'status' => Enrollment::STATUS_ACTIVE,
        ]);

        return $student;
    }

    private function postMark(User $user, Student $student, float $score = 12)
    {
        return $this->actingAs($user)->post(route('marks.store', $this->evaluation), [
            'marks' => [['student_id' => $student->id, 'score' => $score, 'absent' => false]],
        ]);
    }

    // --- Cloisonnement enseignant ---

    public function test_assigned_teacher_can_enter_marks(): void
    {
        $teacher = $this->teacher();
        $this->assign($teacher);
        $student = $this->enrolledStudent();

        $this->postMark($teacher, $student)->assertSessionHasNoErrors();

        $this->assertDatabaseHas('marks', [
            'evaluation_id' => $this->evaluation->id,
            'student_id' => $student->id,
        ]);
    }

    public function test_teacher_assigned_elsewhere_cannot_enter_marks(): void
    {
        $other = Subject::create(['name' => 'Anglais', 'code' => 'ANG']);
        $teacher = $this->teacher();
        $this->assign($teacher, $other->id); // affecté à une autre matière
        $student = $this->enrolledStudent();

        $this->postMark($teacher, $student)->assertSessionHasErrors('locked');

        $this->assertDatabaseCount('marks', 0);
    }

    public function test_admin_without_assignment_stays_transverse(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole(Roles::ADMINISTRATOR);
        $student = $this->enrolledStudent();

        $this->postMark($admin, $student)->assertSessionHasNoErrors();

        $this->assertDatabaseCount('marks', 1);
    }

    // --- Appartenance de l'élève ---

    public function test_cannot_mark_a_student_from_another_class(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole(Roles::ADMINISTRATOR);

        // Élève sans inscription dans la classe de l'évaluation.
        $outsider = Student::create([
            'user_id' => User::factory()->create()->id, 'matricule' => 'M'.Str::random(6),
            'firstname' => 'X', 'lastname' => 'Y', 'gender' => 'male', 'birth_date' => '2012-01-01',
        ]);

        $this->postMark($admin, $outsider)->assertSessionHasErrors('marks.0.student_id');

        $this->assertDatabaseCount('marks', 0);
    }
}
