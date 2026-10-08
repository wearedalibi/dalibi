<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Subject;
use App\Models\SubjectAssignment;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SubjectAssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function admin(): User
    {
        return tap(User::factory()->create(), fn ($u) => $u->assignRole(Roles::ADMINISTRATOR));
    }

    private function teacher(): User
    {
        return tap(User::factory()->create(), fn ($u) => $u->assignRole(Roles::TEACHER));
    }

    private function year(string $year, bool $active): AcademicYear
    {
        return AcademicYear::create([
            'year' => $year, 'start_date' => '2025-09-01', 'end_date' => '2026-07-31', 'active' => $active,
        ]);
    }

    private function assignment(array $overrides = []): SubjectAssignment
    {
        // Une seule année peut être active : on réutilise celle en place plutôt
        // que d'en créer une seconde (le défaut d'array_merge serait évalué même
        // lorsqu'une année est fournie en override).
        $overrides['academic_year_id'] ??= (AcademicYear::where('active', true)->first()
            ?? $this->year('2025-2026', true))->id;

        return SubjectAssignment::create(array_merge([
            'subject_id' => Subject::create(['name' => 'Maths '.fake()->unique()->word(), 'code' => strtoupper(fake()->unique()->bothify('SUB##'))])->id,
            'teacher_id' => User::factory()->create()->id,
            'class_id' => Classroom::factory()->create()->id,
            'active' => true,
        ], $overrides));
    }

    // ─── Accès ───────────────────────────────────────────────────────────────

    public function test_guest_is_redirected(): void
    {
        $this->get(route('subject-assignments.index'))->assertRedirect(route('login'));
    }

    public function test_teacher_cannot_access_index(): void
    {
        $this->actingAs($this->teacher())->get(route('subject-assignments.index'))->assertForbidden();
    }

    public function test_admin_can_access_index(): void
    {
        $this->actingAs($this->admin())->get(route('subject-assignments.index'))->assertOk();
    }

    // ─── Filtre année : défaut = année active ─────────────────────────────────

    public function test_index_defaults_to_active_year(): void
    {
        $active = $this->year('2025-2026', true);
        $previous = $this->year('2024-2025', false);

        $a1 = $this->assignment(['academic_year_id' => $active->id]);
        $this->assignment(['academic_year_id' => $previous->id]);

        $this->actingAs($this->admin())
            ->get(route('subject-assignments.index'))
            ->assertInertia(fn (Assert $p) => $p
                ->component('Administration/SubjectAssignments/Index')
                ->has('assignments.data', 1)
                ->where('assignments.data.0.id', $a1->id)
                ->where('filters.academic_year_id', $active->id));
    }

    public function test_empty_year_param_shows_all_years(): void
    {
        $active = $this->year('2025-2026', true);
        $previous = $this->year('2024-2025', false);
        $this->assignment(['academic_year_id' => $active->id]);
        $this->assignment(['academic_year_id' => $previous->id]);

        $this->actingAs($this->admin())
            ->get(route('subject-assignments.index', ['academic_year_id' => '']))
            ->assertInertia(fn (Assert $p) => $p->has('assignments.data', 2));
    }

    // ─── Filtre classe ────────────────────────────────────────────────────────

    public function test_index_filters_by_class(): void
    {
        $year = $this->year('2025-2026', true);
        $classA = Classroom::factory()->create();
        $classB = Classroom::factory()->create();
        $a = $this->assignment(['academic_year_id' => $year->id, 'class_id' => $classA->id]);
        $this->assignment(['academic_year_id' => $year->id, 'class_id' => $classB->id]);

        $this->actingAs($this->admin())
            ->get(route('subject-assignments.index', ['class_id' => $classA->id]))
            ->assertInertia(fn (Assert $p) => $p
                ->has('assignments.data', 1)
                ->where('assignments.data.0.id', $a->id));
    }

    // ─── Création ─────────────────────────────────────────────────────────────

    public function test_create_page_provides_years_and_classes(): void
    {
        $this->year('2025-2026', true);
        Classroom::factory()->create();

        $this->actingAs($this->admin())
            ->get(route('subject-assignments.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Administration/SubjectAssignments/Create')
                ->has('academicYears', 1)
                ->has('classrooms'));
    }

    public function test_admin_can_store_assignment(): void
    {
        $year = $this->year('2025-2026', true);
        $subject = Subject::create(['name' => 'Maths', 'code' => 'MATH']);
        $class = Classroom::factory()->create();
        $teacher = User::factory()->create();

        $this->actingAs($this->admin())
            ->post(route('subject-assignments.store'), [
                'subject_id' => $subject->id, 'teacher_id' => $teacher->id,
                'academic_year_id' => $year->id, 'class_id' => $class->id, 'active' => true,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('subject_assignments', [
            'subject_id' => $subject->id, 'class_id' => $class->id, 'academic_year_id' => $year->id,
        ]);
    }

    public function test_store_requires_all_fields(): void
    {
        $this->actingAs($this->admin())
            ->post(route('subject-assignments.store'), [])
            ->assertSessionHasErrors(['subject_id', 'teacher_id', 'academic_year_id', 'class_id']);
    }

    public function test_store_rejects_duplicate_assignment(): void
    {
        $existing = $this->assignment();

        $this->actingAs($this->admin())
            ->post(route('subject-assignments.store'), [
                'subject_id' => $existing->subject_id, 'teacher_id' => $existing->teacher_id,
                'academic_year_id' => $existing->academic_year_id, 'class_id' => $existing->class_id,
            ])
            ->assertSessionHasErrors('subject_id');
    }

    // ─── Édition / suppression ────────────────────────────────────────────────

    public function test_admin_can_update_assignment(): void
    {
        $a = $this->assignment();

        $this->actingAs($this->admin())
            ->put(route('subject-assignments.update', $a), [
                'subject_id' => $a->subject_id, 'teacher_id' => $a->teacher_id,
                'academic_year_id' => $a->academic_year_id, 'class_id' => $a->class_id,
                'active' => false, 'notes' => 'Mise à jour',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('subject_assignments', ['id' => $a->id, 'active' => false, 'notes' => 'Mise à jour']);
    }

    public function test_admin_can_delete_assignment(): void
    {
        $a = $this->assignment();

        $this->actingAs($this->admin())
            ->delete(route('subject-assignments.destroy', $a))
            ->assertRedirect();

        $this->assertDatabaseMissing('subject_assignments', ['id' => $a->id]);
    }
}
