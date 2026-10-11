<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AccountingTransaction;
use App\Models\CashAccount;
use App\Models\EmployeeProfile;
use App\Models\PayRun;
use App\Models\Payslip;
use App\Models\SalaryComponent;
use App\Models\School;
use App\Models\User;
use App\Services\PayrollService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PayrollTest extends TestCase
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
        $u = User::factory()->create();

        return EmployeeProfile::create([
            'user_id' => $u->id,
            'job_title' => 'Enseignant',
            'contract_type' => 'CDI',
            'base_salary' => $base,
            'payment_method' => 'CASH',
            'status' => 'active',
        ]);
    }

    private function cash(float $balance = 0): CashAccount
    {
        return CashAccount::create(['name' => 'Caisse espèces', 'type' => 'CASH', 'balance' => $balance, 'active' => true]);
    }

    public function test_generate_creates_draft_run_with_one_payslip_per_active_employee(): void
    {
        $this->actingAs($this->admin());
        $this->employee(100000);
        $this->employee(80000);
        // Retenue CNSS par défaut
        SalaryComponent::create(['name' => 'CNSS', 'type' => 'deduction', 'default_amount' => 4000, 'is_default' => true, 'active' => true]);

        $run = app(PayrollService::class)->generate(7, 2026);

        $this->assertSame(PayRun::DRAFT, $run->status);
        $this->assertCount(2, $run->payslips);

        $slip = $run->payslips->firstWhere('gross', 100000.0);
        $this->assertNotNull($slip);
        $this->assertEqualsWithDelta(4000, $slip->total_deductions, 0.01);
        $this->assertEqualsWithDelta(96000, $slip->net, 0.01);
        // Totaux du cycle : 180 000 brut, 8 000 retenues, 172 000 net
        $this->assertEqualsWithDelta(180000, $run->total_gross, 0.01);
        $this->assertEqualsWithDelta(172000, $run->total_net, 0.01);
    }

    public function test_paying_a_run_debits_cash_and_records_payroll_expenses(): void
    {
        $this->actingAs($this->admin());
        $this->employee(100000);
        $cash = $this->cash(500000);
        $svc = app(PayrollService::class);

        $run = $svc->generate(7, 2026);
        $svc->validate($run->fresh());
        $svc->pay($run->fresh(), $cash->id);

        // Une dépense PAYROLL par bulletin
        $tx = AccountingTransaction::where('reference_type', 'PAYROLL')->first();
        $this->assertNotNull($tx);
        $this->assertSame('EXPENSE', $tx->type);
        $this->assertEqualsWithDelta(100000, (float) $tx->amount, 0.01);

        // Caisse débitée du net total
        $this->assertEqualsWithDelta(400000, (float) $cash->fresh()->balance, 0.01);
        $this->assertSame(PayRun::PAID, $run->fresh()->status);
    }

    public function test_cancelling_a_paid_run_recredits_cash_and_removes_transactions(): void
    {
        $this->actingAs($this->admin());
        $this->employee(120000);
        $cash = $this->cash(500000);
        $svc = app(PayrollService::class);

        $run = $svc->generate(7, 2026);
        $svc->validate($run->fresh());
        $svc->pay($run->fresh(), $cash->id);
        $this->assertEqualsWithDelta(380000, (float) $cash->fresh()->balance, 0.01);

        $svc->cancel($run->fresh());

        $this->assertSame(PayRun::CANCELLED, $run->fresh()->status);
        $this->assertEqualsWithDelta(500000, (float) $cash->fresh()->balance, 0.01);
        $this->assertSame(0, AccountingTransaction::where('reference_type', 'PAYROLL')->count());
    }

    public function test_cannot_generate_two_active_runs_for_same_period(): void
    {
        $this->actingAs($this->admin());
        $this->employee(100000);
        $svc = app(PayrollService::class);
        $svc->generate(7, 2026);

        $this->expectException(ValidationException::class);
        $svc->generate(7, 2026);
    }

    public function test_payslip_pdf_downloads_with_document_header(): void
    {
        School::factory()->create();
        $this->actingAs($this->admin());
        $this->employee(100000);

        $run = app(PayrollService::class)->generate(7, 2026);
        $slip = $run->payslips->first();

        $res = $this->get(route('payslips.pdf', $slip->id));
        $res->assertOk();
        $this->assertSame('application/pdf', $res->headers->get('content-type'));
    }

    public function test_show_paginates_payslips(): void
    {
        $this->actingAs($this->admin());
        $this->employee(100000);
        $this->employee(80000);
        $run = app(PayrollService::class)->generate(7, 2026);

        $this->get(route('pay-runs.show', $run->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Paie/PayRuns/Show')
                ->has('payslips.data', 2)
                ->has('payslips.current_page'));
    }

    public function test_admin_can_delete_a_paid_run_and_reverses_accounting(): void
    {
        $this->actingAs($this->admin());
        $this->employee(100000);
        $cash = $this->cash(500000);
        $svc = app(PayrollService::class);

        $run = $svc->generate(7, 2026);
        $svc->validate($run->fresh());
        $svc->pay($run->fresh(), $cash->id);

        $this->delete(route('pay-runs.destroy', $run->id))->assertRedirect(route('pay-runs.index'));

        $this->assertDatabaseMissing('pay_runs', ['id' => $run->id]);
        $this->assertSame(0, Payslip::where('pay_run_id', $run->id)->count());
        $this->assertSame(0, AccountingTransaction::where('reference_type', 'PAYROLL')->count());
        $this->assertEqualsWithDelta(500000, (float) $cash->fresh()->balance, 0.01);
    }

    public function test_delete_is_forbidden_without_delete_payroll_permission(): void
    {
        $accounting = tap(User::factory()->create(), fn ($u) => $u->assignRole(Roles::ACCOUNTING));
        $this->actingAs($this->admin());
        $this->employee(100000);
        $run = app(PayrollService::class)->generate(7, 2026);

        $this->actingAs($accounting)->delete(route('pay-runs.destroy', $run->id))->assertForbidden();
        $this->assertDatabaseHas('pay_runs', ['id' => $run->id]);
    }

    public function test_index_requires_payroll_permission(): void
    {
        $teacher = tap(User::factory()->create(), fn ($u) => $u->assignRole(Roles::TEACHER));

        $this->actingAs($teacher)->get(route('pay-runs.index'))->assertForbidden();
        $this->actingAs($this->admin())->get(route('pay-runs.index'))->assertOk();
    }
}
