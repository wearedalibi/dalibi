<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AcademicPeriod;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\ClassroomType;
use App\Models\Enrollment;
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
 * Cloisonnement de l'appel.
 *
 * Un enseignant ne fait l'appel que dans ses classes, et on ne peut pointer
 * qu'un élève réellement inscrit dans la classe visée — sans quoi les
 * statistiques d'assiduité seraient faussées.
 */
class AttendanceScopeTest extends TestCase
{
    use RefreshDatabase;

    private School $school;

    private AcademicYear $year;

    private Classroom $class;

    private AcademicPeriod $period;

    private Subject $subject;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->school = School::factory()->create();
        $this->year = AcademicYear::create([
            'year' => '2025-2026', 'start_date' => '2025-09-01',
            'end_date' => '2026-07-31', 'active' => true,
        ]);
        $type = ClassroomType::factory()->create(['period_system' => 'trimestre']);
        $this->class = Classroom::factory()->create(['classroom_type_id' => $type->id]);
        $this->subject = Subject::create(['name' => 'Maths', 'code' => 'MATH']);
        $this->period = AcademicPeriod::create([
            'name' => 'Trimestre 1', 'start_date' => '2025-09-01', 'end_date' => '2025-12-31',
            'type' => 'trimestre', 'order' => 1, 'weight' => 1, 'is_current' => true,
            'academic_year_id' => $this->year->id, 'class_type_id' => $type->id,
        ]);
    }

    private function teacher(): User
    {
        return tap(User::factory()->create(), fn (User $u) => $u->assignRole(Roles::TEACHER));
    }

    private function admin(): User
    {
        return tap(User::factory()->create(), fn (User $u) => $u->assignRole(Roles::ADMINISTRATOR));
    }

    private function assign(User $teacher, ?string $classId = null): void
    {
        SubjectAssignment::create([
            'teacher_id' => $teacher->id,
            'class_id' => $classId ?? $this->class->id,
            'subject_id' => $this->subject->id,
            'academic_year_id' => $this->year->id,
            'active' => true,
        ]);
    }

    private function enrolledStudent(?string $classId = null): Student
    {
        $student = Student::create([
            'user_id' => User::factory()->create()->id, 'matricule' => 'M'.Str::random(6),
            'firstname' => 'P', 'lastname' => Str::random(5), 'gender' => 'male', 'birth_date' => '2012-01-01',
        ]);

        Enrollment::create([
            'school_id' => $this->school->id, 'student_id' => $student->id,
            'class_id' => $classId ?? $this->class->id, 'academic_year_id' => $this->year->id,
            'enrollment_code' => 'E'.Str::random(8), 'enrollment_date' => now(),
            'status' => Enrollment::STATUS_ACTIVE,
        ]);

        return $student;
    }

    private function takeCall(User $user, Student $student)
    {
        return $this->actingAs($user)->post(route('attendances.store'), [
            'class_id' => $this->class->id,
            'academic_period_id' => $this->period->id,
            'date' => '2025-10-01',
            'session' => 'matin',
            'records' => [['student_id' => $student->id, 'status' => 'present']],
        ]);
    }

    public function test_assigned_teacher_can_record_attendance(): void
    {
        $teacher = $this->teacher();
        $this->assign($teacher);

        $this->takeCall($teacher, $this->enrolledStudent())->assertSessionHasNoErrors();

        $this->assertDatabaseCount('attendance_records', 1);
    }

    public function test_teacher_assigned_to_another_class_is_refused(): void
    {
        $otherClass = Classroom::factory()->create(['classroom_type_id' => $this->class->classroom_type_id]);
        $teacher = $this->teacher();
        $this->assign($teacher, $otherClass->id);

        $this->takeCall($teacher, $this->enrolledStudent())->assertForbidden();

        $this->assertDatabaseCount('attendance_records', 0);
    }

    public function test_admin_without_assignment_stays_transverse(): void
    {
        $this->takeCall($this->admin(), $this->enrolledStudent())->assertSessionHasNoErrors();

        $this->assertDatabaseCount('attendance_records', 1);
    }

    public function test_cannot_record_a_student_from_another_class(): void
    {
        $otherClass = Classroom::factory()->create(['classroom_type_id' => $this->class->classroom_type_id]);
        $outsider = $this->enrolledStudent($otherClass->id);

        $this->takeCall($this->admin(), $outsider)->assertSessionHasErrors('records.0.student_id');

        $this->assertDatabaseCount('attendance_records', 0);
    }
}
