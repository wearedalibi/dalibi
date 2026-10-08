<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\EmployeeAllowance;
use App\Models\EmployeeProfile;
use App\Models\PayrollSetting;
use App\Models\SalaryGrade;
use App\Models\User;
use App\Services\PayrollService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalaryGradePayrollTest extends TestCase
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

    public function test_base_salary_comes_from_the_grade(): void
    {
        $this->actingAs($this->admin());
        $grade = SalaryGrade::create(['name' => 'Enseignant B2', 'category' => 'B', 'echelon' => 2, 'base_amount' => 145000, 'active' => true]);
        $this->employee(['salary_grade_id' => $grade->id, 'base_salary' => 999]); // base_salary ignoré

        $run = app(PayrollService::class)->generate(7, 2026);
        $slip = $run->payslips->first();

        $this->assertEqualsWithDelta(145000, $slip->gross, 0.01);
        $baseLine = collect($slip->payload['lines'])->firstWhere('code', 'BASE');
        $this->assertEqualsWithDelta(145000, $baseLine['amount'], 0.01);
        $this->assertSame('grade:'.$grade->id, $baseLine['origin']);
    }

    public function test_traced_allowance_is_added_as_its_own_line(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin);
        $grade = SalaryGrade::create(['name' => 'B2', 'base_amount' => 100000, 'active' => true]);
        $emp = $this->employee(['salary_grade_id' => $grade->id]);
        EmployeeAllowance::create([
            'employee_profile_id' => $emp->id, 'type' => 'earning', 'label' => 'Prime de responsabilité',
            'mode' => 'fixed', 'amount' => 20000, 'reason' => 'Chef de département', 'active' => true, 'created_by' => $admin->id,
        ]);

        $run = app(PayrollService::class)->generate(7, 2026);
        $slip = $run->payslips->first();

        $this->assertEqualsWithDelta(120000, $slip->gross, 0.01);
        $line = collect($slip->payload['lines'])->firstWhere('label', 'Prime de responsabilité');
        $this->assertNotNull($line);
        $this->assertSame('Chef de département', $line['reason']);
        $this->assertStringStartsWith('allowance:', $line['origin']);
    }

    public function test_percent_allowance_is_computed_on_base(): void
    {
        $this->actingAs($this->admin());
        $grade = SalaryGrade::create(['name' => 'B2', 'base_amount' => 100000, 'active' => true]);
        $emp = $this->employee(['salary_grade_id' => $grade->id]);
        EmployeeAllowance::create(['employee_profile_id' => $emp->id, 'type' => 'deduction', 'label' => 'Avance', 'mode' => 'percent_base', 'amount' => 10, 'active' => true]);

        $run = app(PayrollService::class)->generate(7, 2026);
        $slip = $run->payslips->first();

        // 100 000 base − 10% (10 000) = 90 000 net
        $this->assertEqualsWithDelta(10000, $slip->total_deductions, 0.01);
        $this->assertEqualsWithDelta(90000, $slip->net, 0.01);
    }

    public function test_seniority_prime_applied_when_enabled(): void
    {
        $this->actingAs($this->admin());
        PayrollSetting::current()->update(['seniority_enabled' => true, 'seniority_rate_per_year' => 2, 'seniority_cap_percent' => 20]);
        $grade = SalaryGrade::create(['name' => 'B2', 'base_amount' => 100000, 'active' => true]);
        $this->employee(['salary_grade_id' => $grade->id, 'hire_date' => '2020-07-01']); // 6 ans au 07/2026

        $run = app(PayrollService::class)->generate(7, 2026);
        $slip = $run->payslips->first();

        // 6 ans × 2% = 12% de 100 000 = 12 000
        $anc = collect($slip->payload['lines'])->firstWhere('code', 'ANC');
        $this->assertNotNull($anc);
        $this->assertEqualsWithDelta(12000, $anc['amount'], 0.01);
        $this->assertEqualsWithDelta(112000, $slip->gross, 0.01);
    }

    public function test_grades_index_requires_permission(): void
    {
        $teacher = tap(User::factory()->create(), fn ($u) => $u->assignRole(Roles::TEACHER));
        $this->actingAs($teacher)->get(route('salary-grades.index'))->assertForbidden();
        $this->actingAs($this->admin())->get(route('salary-grades.index'))->assertOk();
    }

    public function test_admin_can_create_a_grade(): void
    {
        $this->actingAs($this->admin())
            ->post(route('salary-grades.store'), ['name' => 'Enseignant A1', 'category' => 'A', 'echelon' => 1, 'base_amount' => 180000])
            ->assertRedirect();

        $this->assertDatabaseHas('salary_grades', ['name' => 'Enseignant A1', 'base_amount' => 180000]);
    }

    public function test_bulk_assign_attaches_selected_and_detaches_others(): void
    {
        $this->actingAs($this->admin());
        $gradeA = SalaryGrade::create(['name' => 'A1', 'base_amount' => 100000, 'active' => true]);
        $gradeB = SalaryGrade::create(['name' => 'B1', 'base_amount' => 120000, 'active' => true]);

        $e1 = $this->employee();                                       // sans grille
        $e2 = $this->employee(['salary_grade_id' => $gradeA->id]);     // déjà sur A → à détacher
        $e3 = $this->employee(['salary_grade_id' => $gradeB->id]);     // sur B → déplacé vers A

        // On affecte à A : e1 et e3 (e2 décoché → détaché)
        $this->put(route('salary-grades.employees.sync', $gradeA->id), [
            'employee_ids' => [$e1->id, $e3->id],
        ])->assertRedirect(route('salary-grades.index'));

        $this->assertSame($gradeA->id, $e1->fresh()->salary_grade_id);
        $this->assertNull($e2->fresh()->salary_grade_id);
        $this->assertSame($gradeA->id, $e3->fresh()->salary_grade_id);
    }

    public function test_bulk_assign_with_empty_selection_detaches_all(): void
    {
        $this->actingAs($this->admin());
        $grade = SalaryGrade::create(['name' => 'A1', 'base_amount' => 100000, 'active' => true]);
        $emp = $this->employee(['salary_grade_id' => $grade->id]);

        $this->put(route('salary-grades.employees.sync', $grade->id), ['employee_ids' => []])->assertRedirect();

        $this->assertNull($emp->fresh()->salary_grade_id);
    }

    public function test_allowance_records_its_author_for_traceability(): void
    {
        $admin = $this->admin();
        $emp = $this->employee();

        $this->actingAs($admin)
            ->post(route('users.allowances.store', $emp->user_id), [
                'type' => 'earning', 'label' => 'Prime de logement', 'mode' => 'fixed', 'amount' => 15000, 'reason' => 'Logement de fonction',
            ])
            ->assertRedirect();

        $allowance = EmployeeAllowance::where('label', 'Prime de logement')->first();
        $this->assertNotNull($allowance);
        $this->assertSame($emp->id, $allowance->employee_profile_id);
        $this->assertSame($admin->id, $allowance->created_by);
        $this->assertSame('Logement de fonction', $allowance->reason);
    }
}
