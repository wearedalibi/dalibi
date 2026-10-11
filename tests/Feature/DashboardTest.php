<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\School;
use App\Models\Subject;
use App\Models\SubjectAssignment;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();
    }

    public function test_dashboard_defaults_to_active_academic_year()
    {
        $school = School::factory()->create();
        AcademicYear::create(['school_id' => $school->id, 'year' => '2024-2025', 'start_date' => '2024-09-01', 'end_date' => '2025-07-31', 'active' => false]);
        $active = AcademicYear::create(['school_id' => $school->id, 'year' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-07-31', 'active' => true]);

        $this->actingAs(User::factory()->create())
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('dashboard')
                ->where('selectedYearId', $active->id)
            );
    }

    public function test_dashboard_exposes_effectifs_stats_for_admin()
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        Classroom::factory()->create(); // classe active
        $admin = User::factory()->create();
        $admin->assignRole(Roles::ADMINISTRATOR);

        $this->actingAs($admin)
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('enrollments.students_by_gender.male')
                ->has('enrollments.students_by_gender.female')
                ->where('enrollments.active_classrooms', 1)
                ->where('enrollments.total_users', User::count())
                // Section comptable enrichie : ce mois-ci + moyens de paiement.
                ->has('financial.month.income')
                ->has('financial.month.expenses')
                ->has('financial.month.net')
                ->has('financial.paymentMethods')
            );
    }

    public function test_teacher_dashboard_is_personalized(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $year = AcademicYear::create(['year' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-07-31', 'active' => true]);
        $class = Classroom::factory()->create();
        $subject = Subject::create(['name' => 'Maths', 'code' => 'MATH']);

        $teacher = User::factory()->create();
        $teacher->assignRole(Roles::TEACHER);
        SubjectAssignment::create([
            'subject_id' => $subject->id,
            'teacher_id' => $teacher->id,
            'class_id' => $class->id,
            'academic_year_id' => $year->id,
            'active' => true,
        ]);

        $this->actingAs($teacher)
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('teaching.assignments', 1)
                ->where('teaching.assignments.0.class_id', $class->id)
                ->has('teaching.today')
                ->where('teaching.pendingMarks.count', 0)
            );
    }

    public function test_dashboard_respects_selected_year_filter()
    {
        $school = School::factory()->create();
        $old = AcademicYear::create(['school_id' => $school->id, 'year' => '2024-2025', 'start_date' => '2024-09-01', 'end_date' => '2025-07-31', 'active' => false]);
        AcademicYear::create(['school_id' => $school->id, 'year' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-07-31', 'active' => true]);

        $this->actingAs(User::factory()->create())
            ->get(route('dashboard', ['academic_year_id' => $old->id]))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('selectedYearId', $old->id));
    }
}
