<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\EmployeeProfile;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserPayrollProfileTest extends TestCase
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

    private function payload(array $override = []): array
    {
        return array_merge([
            'job_title' => 'Enseignant',
            'contract_type' => 'CDI',
            'base_salary' => 120000,
            'payment_method' => 'CASH',
            'status' => 'active',
        ], $override);
    }

    public function test_admin_can_attach_payroll_profile_to_a_user(): void
    {
        $target = User::factory()->create();

        $this->actingAs($this->admin())
            ->put(route('users.payroll.update', $target->id), $this->payload())
            ->assertRedirect();

        $profile = EmployeeProfile::where('user_id', $target->id)->first();
        $this->assertNotNull($profile);
        $this->assertSame('Enseignant', $profile->job_title);
        $this->assertNotEmpty($profile->employee_number); // auto-généré
    }

    public function test_updating_again_does_not_create_a_second_profile(): void
    {
        $target = User::factory()->create();
        $admin = $this->admin();

        $this->actingAs($admin)->put(route('users.payroll.update', $target->id), $this->payload());
        $this->actingAs($admin)->put(route('users.payroll.update', $target->id), $this->payload(['base_salary' => 150000]));

        $this->assertSame(1, EmployeeProfile::where('user_id', $target->id)->count());
        $this->assertEqualsWithDelta(150000, (float) EmployeeProfile::where('user_id', $target->id)->value('base_salary'), 0.01);
    }

    public function test_can_detach_profile_without_payslips(): void
    {
        $target = User::factory()->create();
        $admin = $this->admin();
        $this->actingAs($admin)->put(route('users.payroll.update', $target->id), $this->payload());

        $this->actingAs($admin)->delete(route('users.payroll.destroy', $target->id))->assertRedirect();

        $this->assertSame(0, EmployeeProfile::where('user_id', $target->id)->count());
    }

    public function test_requires_edit_employees_permission(): void
    {
        $teacher = tap(User::factory()->create(), fn ($u) => $u->assignRole(Roles::TEACHER));
        $target = User::factory()->create();

        $this->actingAs($teacher)
            ->put(route('users.payroll.update', $target->id), $this->payload())
            ->assertForbidden();
    }
}
