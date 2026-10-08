<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\EmployeeProfile;
use App\Models\SalaryGrade;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PersonnelHubTest extends TestCase
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

    private function employee(array $override = []): EmployeeProfile
    {
        return EmployeeProfile::create(array_merge([
            'user_id' => User::factory()->create()->id,
            'job_title' => 'Enseignant',
            'contract_type' => 'CDI',
            'base_salary' => 0,
            'payment_method' => 'CASH',
            'status' => 'active',
        ], $override));
    }

    public function test_index_and_overview_require_permission(): void
    {
        $teacher = tap(User::factory()->create(), fn ($u) => $u->assignRole(Roles::TEACHER));
        $this->actingAs($teacher)->get(route('personnel.index'))->assertForbidden();

        $admin = $this->admin();
        $this->actingAs($admin)->get(route('personnel.index'))->assertOk();
        $this->actingAs($admin)->get(route('payroll.overview'))->assertOk();
    }

    public function test_inline_grade_assignment_and_detach(): void
    {
        $this->actingAs($this->admin());
        $grade = SalaryGrade::create(['name' => 'B2', 'base_amount' => 145000, 'active' => true]);
        $emp = $this->employee();

        $this->put(route('personnel.grade', $emp->id), ['salary_grade_id' => $grade->id])->assertRedirect();
        $this->assertSame($grade->id, $emp->fresh()->salary_grade_id);

        $this->put(route('personnel.grade', $emp->id), ['salary_grade_id' => null])->assertRedirect();
        $this->assertNull($emp->fresh()->salary_grade_id);
    }

    public function test_add_to_personnel_creates_profile(): void
    {
        $this->actingAs($this->admin());
        $user = User::factory()->create();
        $grade = SalaryGrade::create(['name' => 'A1', 'base_amount' => 180000, 'active' => true]);

        $this->post(route('personnel.store'), [
            'user_id' => $user->id, 'job_title' => 'Surveillant', 'contract_type' => 'CDD',
            'salary_grade_id' => $grade->id, 'payment_method' => 'CASH', 'status' => 'active',
        ])->assertRedirect();

        $this->assertDatabaseHas('employee_profiles', ['user_id' => $user->id, 'job_title' => 'Surveillant', 'salary_grade_id' => $grade->id]);
    }

    public function test_cannot_add_same_user_twice(): void
    {
        $this->actingAs($this->admin());
        $emp = $this->employee();

        $this->post(route('personnel.store'), [
            'user_id' => $emp->user_id, 'job_title' => 'X', 'contract_type' => 'CDI', 'payment_method' => 'CASH', 'status' => 'active',
        ])->assertSessionHasErrors('user_id');
    }
}
