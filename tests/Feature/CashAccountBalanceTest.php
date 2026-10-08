<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AcademicYear;
use App\Models\CashAccount;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Invoice;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use App\Services\AccountingService;
use App\Services\InvoiceService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class CashAccountBalanceTest extends TestCase
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

    private function invoice(float $total = 50000): Invoice
    {
        $school = School::factory()->create();
        $year = AcademicYear::create(['school_id' => $school->id, 'year' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-07-31', 'active' => true]);
        $class = Classroom::create(['name' => '6A', 'code' => Str::random(4), 'capacity' => 40, 'active' => true]);
        $student = Student::create(['firstname' => 'Koffi', 'lastname' => 'Mensah', 'gender' => 'male', 'birth_date' => '2012-01-01', 'user_id' => User::factory()->create()->id, 'active' => true, 'matricule' => Str::random(6)]);
        $enr = Enrollment::create(['school_id' => $school->id, 'student_id' => $student->id, 'class_id' => $class->id, 'academic_year_id' => $year->id, 'enrollment_code' => 'INS-'.Str::random(5), 'enrollment_date' => '2025-09-02', 'status' => 'PENDING', 'academic_status' => 'en_cours']);

        $invoice = Invoice::create(['enrollment_id' => $enr->id, 'invoice_number' => 'INV-'.Str::random(6), 'subtotal' => $total, 'discount_amount' => 0, 'total' => $total, 'amount_paid' => 0, 'amount_remaining' => $total, 'status' => 'ISSUED', 'issued_at' => '2025-09-02']);

        // Ligne de frais correspondant au total : recalculate() dérive le total des
        // items, une facture réaliste doit donc en porter (sinon le total retombe à 0).
        $invoice->items()->create(['label' => 'Scolarité', 'type' => 'FEE', 'amount' => $total, 'sort_order' => 0]);

        return $invoice;
    }

    private function cash(string $type, string $name): CashAccount
    {
        return CashAccount::create(['name' => $name, 'type' => $type, 'balance' => 0, 'active' => true]);
    }

    public function test_cash_payment_credits_cash_account(): void
    {
        $this->actingAs($this->admin());
        $cash = $this->cash('CASH', 'Caisse espèces');
        $invoice = $this->invoice(50000);

        $payment = app(InvoiceService::class)->recordPayment($invoice, [
            'amount' => 20000, 'payment_method' => 'CASH', 'paid_at' => '2025-09-03',
        ]);

        $this->assertSame($cash->id, $payment->cash_account_id);
        $this->assertEqualsWithDelta(20000, (float) $cash->fresh()->balance, 0.01);
    }

    public function test_payment_credits_the_matching_type(): void
    {
        $this->actingAs($this->admin());
        $cash = $this->cash('CASH', 'Espèces');
        $momo = $this->cash('MOBILE_MONEY', 'Mobile Money');
        $bank = $this->cash('BANK', 'Banque');
        $invoice = $this->invoice(100000);

        app(InvoiceService::class)->recordPayment($invoice, ['amount' => 10000, 'payment_method' => 'MOBILE_MONEY', 'paid_at' => '2025-09-03']);
        app(InvoiceService::class)->recordPayment($invoice, ['amount' => 5000, 'payment_method' => 'CHEQUE', 'paid_at' => '2025-09-04']);

        $this->assertEqualsWithDelta(0, (float) $cash->fresh()->balance, 0.01);
        $this->assertEqualsWithDelta(10000, (float) $momo->fresh()->balance, 0.01);
        // Chèque → caisse bancaire
        $this->assertEqualsWithDelta(5000, (float) $bank->fresh()->balance, 0.01);
    }

    public function test_cancelling_a_payment_debits_the_cash_account(): void
    {
        $this->actingAs($this->admin());
        $cash = $this->cash('CASH', 'Espèces');
        $invoice = $this->invoice(50000);

        $payment = app(InvoiceService::class)->recordPayment($invoice, ['amount' => 20000, 'payment_method' => 'CASH', 'paid_at' => '2025-09-03']);
        $this->assertEqualsWithDelta(20000, (float) $cash->fresh()->balance, 0.01);

        app(AccountingService::class)->cancelPaymentTransaction($payment->fresh());

        $this->assertEqualsWithDelta(0, (float) $cash->fresh()->balance, 0.01);
    }
}
