<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\EmployeeProfile;
use App\Models\PayrollSetting;
use App\Models\Payslip;
use App\Models\User;
use App\Services\PayrollService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Tests\TestCase;

class PayrollStatutoryTest extends TestCase
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

    private function employee(float $base): EmployeeProfile
    {
        return EmployeeProfile::create([
            'user_id' => User::factory()->create()->id,
            'job_title' => 'Enseignant',
            'contract_type' => 'CDI',
            'base_salary' => $base,
            'payment_method' => 'CASH',
            'status' => 'active',
        ]);
    }

    private function lines(Payslip $slip): Collection
    {
        return collect($slip->payload['lines']);
    }

    public function test_disabled_by_default_no_statutory_lines(): void
    {
        $this->actingAs($this->admin());
        $this->employee(100000);

        $run = app(PayrollService::class)->generate(7, 2026);
        $slip = $run->payslips->first();

        $this->assertNull($this->lines($slip)->firstWhere('origin', 'cnss'));
        $this->assertNull($this->lines($slip)->firstWhere('origin', 'its'));
        $this->assertEqualsWithDelta(100000, $slip->net, 0.01);
    }

    public function test_cnss_deducts_employee_and_records_employer_charge(): void
    {
        $this->actingAs($this->admin());
        PayrollSetting::current()->update(['cnss_enabled' => true, 'cnss_employee_rate' => 4, 'cnss_employer_rate' => 17.5, 'cnss_ceiling' => 0]);
        $this->employee(100000);

        $run = app(PayrollService::class)->generate(7, 2026);
        $slip = $run->payslips->first();

        $cnss = $this->lines($slip)->firstWhere('origin', 'cnss');
        $this->assertNotNull($cnss);
        $this->assertEqualsWithDelta(4000, $cnss['amount'], 0.01);
        $this->assertEqualsWithDelta(96000, $slip->net, 0.01);

        $employer = collect($slip->payload['employer_charges']);
        $this->assertEqualsWithDelta(17500, $employer->firstWhere('label', 'CNSS (part patronale)')['amount'], 0.01);
    }

    public function test_cnss_respects_ceiling(): void
    {
        $this->actingAs($this->admin());
        PayrollSetting::current()->update(['cnss_enabled' => true, 'cnss_employee_rate' => 4, 'cnss_ceiling' => 50000]);
        $this->employee(100000);

        $slip = app(PayrollService::class)->generate(7, 2026)->payslips->first();
        // 4% de 50 000 (plafond) = 2 000
        $this->assertEqualsWithDelta(2000, $this->lines($slip)->firstWhere('origin', 'cnss')['amount'], 0.01);
    }

    public function test_its_progressive_brackets(): void
    {
        $this->actingAs($this->admin());
        PayrollSetting::current()->update([
            'its_enabled' => true,
            'its_brackets' => [
                ['up_to' => 50000, 'rate' => 0],
                ['up_to' => 100000, 'rate' => 10],
                ['up_to' => null, 'rate' => 20],
            ],
        ]);
        $this->employee(120000);

        $slip = app(PayrollService::class)->generate(7, 2026)->payslips->first();
        // 0-50k @0 + 50k-100k @10% (5000) + 100k-120k @20% (4000) = 9000
        $its = $this->lines($slip)->firstWhere('origin', 'its');
        $this->assertEqualsWithDelta(9000, $its['amount'], 0.01);
        $this->assertEqualsWithDelta(111000, $slip->net, 0.01);
    }

    public function test_its_is_computed_on_gross_minus_cnss(): void
    {
        $this->actingAs($this->admin());
        PayrollSetting::current()->update([
            'cnss_enabled' => true, 'cnss_employee_rate' => 4, 'cnss_ceiling' => 0,
            'its_enabled' => true,
            'its_brackets' => [['up_to' => 60000, 'rate' => 0], ['up_to' => null, 'rate' => 10]],
        ]);
        $this->employee(100000);

        $slip = app(PayrollService::class)->generate(7, 2026)->payslips->first();
        // CNSS = 4000 → imposable 96000 → (96000-60000)*10% = 3600
        $this->assertEqualsWithDelta(3600, $this->lines($slip)->firstWhere('origin', 'its')['amount'], 0.01);
        $this->assertEqualsWithDelta(100000 - 4000 - 3600, $slip->net, 0.01);
    }

    public function test_settings_page_and_update_are_gated_and_persist(): void
    {
        $this->actingAs($this->admin())
            ->get(route('payroll-settings.edit'))->assertOk();

        $this->actingAs($this->admin())
            ->put(route('payroll-settings.update'), [
                'seniority_enabled' => false, 'seniority_rate_per_year' => 0, 'seniority_cap_percent' => 0,
                'cnss_enabled' => true, 'cnss_employee_rate' => 4, 'cnss_employer_rate' => 17.5, 'cnss_ceiling' => 0,
                'its_enabled' => true,
                'its_brackets' => [['up_to' => '', 'rate' => 10], ['up_to' => 50000, 'rate' => 0]],
            ])->assertRedirect();

        $s = PayrollSetting::current();
        $this->assertTrue($s->cnss_enabled);
        // Tranches normalisées et triées : 50000 puis au-delà (null)
        $this->assertEqualsWithDelta(50000, $s->its_brackets[0]['up_to'], 0.01);
        $this->assertNull($s->its_brackets[1]['up_to']);

        // Teacher (sans edit_salary_grades) interdit
        $teacher = tap(User::factory()->create(), fn ($u) => $u->assignRole(Roles::TEACHER));
        $this->actingAs($teacher)->get(route('payroll-settings.edit'))->assertForbidden();
    }
}
