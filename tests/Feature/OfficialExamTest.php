<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\OfficialExam;
use App\Models\OfficialExamRegistration;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OfficialExamTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Roles::ADMINISTRATOR);

        return $user;
    }

    private function teacher(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Roles::TEACHER);

        return $user;
    }

    private function exam(array $overrides = []): OfficialExam
    {
        return OfficialExam::create(array_merge([
            'type' => 'bepc',
            'name' => 'BEPC 2026',
            'year' => 2026,
            'session' => 'normale',
            'class_id' => Classroom::factory()->create()->id,
            'status' => 'ouvert',
        ], $overrides));
    }

    private function makeStudent(string $matricule = 'EXA001'): Student
    {
        return Student::create([
            'firstname' => 'Ama',
            'lastname' => 'Koffi',
            'gender' => 'female',
            'birth_date' => '2009-03-10',
            'user_id' => User::factory()->create()->id,
            'active' => true,
            'matricule' => $matricule,
        ]);
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'type' => 'bac',
            'name' => 'Baccalauréat 2026',
            'year' => 2026,
            'session' => 'normale',
            'class_id' => Classroom::factory()->create()->id,
            'status' => 'ouvert',
        ], $overrides);
    }

    // ─── Accès ───────────────────────────────────────────────────────────────

    public function test_guest_cannot_access_index(): void
    {
        $this->get(route('official-exams.index'))->assertRedirect(route('login'));
    }

    public function test_teacher_cannot_access_index(): void
    {
        $this->actingAs($this->teacher())
            ->get(route('official-exams.index'))
            ->assertForbidden();
    }

    public function test_admin_can_access_index(): void
    {
        $this->actingAs($this->admin())
            ->get(route('official-exams.index'))
            ->assertOk();
    }

    // ─── CRUD ────────────────────────────────────────────────────────────────

    public function test_admin_can_create_exam(): void
    {
        $this->actingAs($this->admin())
            ->post(route('official-exams.store'), $this->validPayload())
            ->assertRedirect(route('official-exams.index'));

        $this->assertDatabaseHas('official_exams', ['name' => 'Baccalauréat 2026', 'type' => 'bac']);
    }

    public function test_created_exam_is_attached_to_active_year(): void
    {
        $school = School::factory()->create();
        $year = AcademicYear::create(['school_id' => $school->id, 'year' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-07-31', 'active' => true]);

        $this->actingAs($this->admin())
            ->post(route('official-exams.store'), $this->validPayload());

        $this->assertDatabaseHas('official_exams', [
            'name' => 'Baccalauréat 2026',
            'academic_year_id' => $year->id,
        ]);
    }

    public function test_admin_can_create_exam_with_class(): void
    {
        $class = Classroom::factory()->create();

        $this->actingAs($this->admin())
            ->post(route('official-exams.store'), $this->validPayload(['class_id' => $class->id]))
            ->assertRedirect(route('official-exams.index'));

        $this->assertDatabaseHas('official_exams', ['name' => 'Baccalauréat 2026', 'class_id' => $class->id]);
    }

    public function test_create_rejects_unknown_class(): void
    {
        $this->actingAs($this->admin())
            ->post(route('official-exams.store'), $this->validPayload(['class_id' => '00000000-0000-0000-0000-000000000000']))
            ->assertSessionHasErrors('class_id');
    }

    public function test_create_requires_class(): void
    {
        $this->actingAs($this->admin())
            ->post(route('official-exams.store'), $this->validPayload(['class_id' => '']))
            ->assertSessionHasErrors('class_id');
    }

    public function test_available_students_are_limited_to_exam_class_cohort(): void
    {
        $school = School::factory()->create();
        $year = AcademicYear::create(['year' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-07-31', 'active' => true]);
        $class = Classroom::factory()->create();
        $other = Classroom::factory()->create();

        $exam = $this->exam(['class_id' => $class->id, 'academic_year_id' => $year->id, 'school_id' => $school->id]);

        $inCohort = $this->makeStudent('IN-1');
        $outCohort = $this->makeStudent('OUT-1');

        $enroll = fn (Student $s, Classroom $c) => Enrollment::create([
            'school_id' => $school->id, 'student_id' => $s->id, 'class_id' => $c->id,
            'academic_year_id' => $year->id, 'enrollment_code' => 'ENR-'.Str::random(8),
            'enrollment_date' => '2025-09-01', 'status' => 'ACTIVE', 'academic_status' => 'en_cours',
        ]);
        $enroll($inCohort, $class);
        $enroll($outCohort, $other);

        $this->actingAs($this->admin())
            ->get(route('official-exams.show', $exam))
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->has('availableStudents', 1)
                ->where('availableStudents.0.matricule', 'IN-1'));
    }

    public function test_create_requires_name(): void
    {
        $this->actingAs($this->admin())
            ->post(route('official-exams.store'), $this->validPayload(['name' => '']))
            ->assertSessionHasErrors('name');
    }

    public function test_create_rejects_invalid_type(): void
    {
        $this->actingAs($this->admin())
            ->post(route('official-exams.store'), $this->validPayload(['type' => 'xyz']))
            ->assertSessionHasErrors('type');
    }

    public function test_admin_can_update_exam(): void
    {
        $exam = $this->exam();

        $this->actingAs($this->admin())
            ->put(route('official-exams.update', $exam), $this->validPayload(['name' => 'Modifié', 'type' => 'bepc']))
            ->assertRedirect(route('official-exams.index'));

        $this->assertDatabaseHas('official_exams', ['id' => $exam->id, 'name' => 'Modifié']);
    }

    public function test_admin_can_delete_exam(): void
    {
        $exam = $this->exam();

        $this->actingAs($this->admin())
            ->delete(route('official-exams.destroy', $exam))
            ->assertRedirect(route('official-exams.index'));

        $this->assertDatabaseMissing('official_exams', ['id' => $exam->id]);
    }

    public function test_admin_can_view_exam_detail(): void
    {
        $exam = $this->exam();

        $this->actingAs($this->admin())
            ->get(route('official-exams.show', $exam))
            ->assertOk();
    }

    // ─── Inscriptions ──────────────────────────────────────────────────────────

    public function test_admin_can_register_students(): void
    {
        $exam = $this->exam();
        $student1 = $this->makeStudent('EXA001');
        $student2 = $this->makeStudent('EXA002');

        $this->actingAs($this->admin())
            ->post(route('official-exams.register', $exam), [
                'student_ids' => [$student1->id, $student2->id],
            ])
            ->assertRedirect();

        $this->assertDatabaseCount('official_exam_registrations', 2);
    }

    public function test_registering_same_student_twice_is_idempotent(): void
    {
        $exam = $this->exam();
        $student = $this->makeStudent();

        $this->actingAs($this->admin())
            ->post(route('official-exams.register', $exam), ['student_ids' => [$student->id]]);
        $this->actingAs($this->admin())
            ->post(route('official-exams.register', $exam), ['student_ids' => [$student->id]]);

        $this->assertDatabaseCount('official_exam_registrations', 1);
    }

    // ─── Résultats ───────────────────────────────────────────────────────────

    public function test_admin_can_record_results(): void
    {
        $exam = $this->exam();
        $student = $this->makeStudent();
        $reg = OfficialExamRegistration::create([
            'official_exam_id' => $exam->id,
            'student_id' => $student->id,
            'status' => 'inscrit',
        ]);

        $this->actingAs($this->admin())
            ->put(route('official-exams.results', $exam), [
                'results' => [[
                    'id' => $reg->id,
                    'registration_number' => 'T-1234',
                    'status' => 'admis',
                    'average' => 14.5,
                    'mention' => 'bien',
                ]],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('official_exam_registrations', [
            'id' => $reg->id,
            'status' => 'admis',
            'mention' => 'bien',
        ]);
    }

    public function test_results_reject_invalid_average(): void
    {
        $exam = $this->exam();
        $student = $this->makeStudent();
        $reg = OfficialExamRegistration::create([
            'official_exam_id' => $exam->id,
            'student_id' => $student->id,
            'status' => 'inscrit',
        ]);

        $this->actingAs($this->admin())
            ->put(route('official-exams.results', $exam), [
                'results' => [[
                    'id' => $reg->id,
                    'status' => 'admis',
                    'average' => 25,
                ]],
            ])
            ->assertSessionHasErrors('results.0.average');
    }

    public function test_admin_can_remove_registration(): void
    {
        $exam = $this->exam();
        $student = $this->makeStudent();
        $reg = OfficialExamRegistration::create([
            'official_exam_id' => $exam->id,
            'student_id' => $student->id,
            'status' => 'inscrit',
        ]);

        $this->actingAs($this->admin())
            ->delete(route('official-exams.registrations.destroy', [$exam, $reg]))
            ->assertRedirect();

        $this->assertDatabaseMissing('official_exam_registrations', ['id' => $reg->id]);
    }
}
