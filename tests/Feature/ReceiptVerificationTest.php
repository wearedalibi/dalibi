<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Receipt;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use App\Services\InvoiceService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReceiptVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function admin(): User
    {
        $u = User::factory()->create();
        $u->assignRole(Roles::ADMINISTRATOR);

        return $u;
    }

    private function makeReceipt(string $code): Receipt
    {
        $school = School::factory()->create();
        $year = AcademicYear::create(['school_id' => $school->id, 'year' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-07-31', 'active' => true]);
        $class = Classroom::create(['name' => '6A', 'code' => '6A', 'capacity' => 40, 'active' => true]);
        $student = Student::create(['firstname' => 'Koffi', 'lastname' => 'Mensah', 'gender' => 'male', 'birth_date' => '2012-01-01', 'user_id' => User::factory()->create()->id, 'active' => true, 'matricule' => 'RC001']);
        $enr = Enrollment::create(['school_id' => $school->id, 'student_id' => $student->id, 'class_id' => $class->id, 'academic_year_id' => $year->id, 'enrollment_code' => 'INS-1', 'enrollment_date' => '2025-09-02', 'status' => 'ACTIVE', 'academic_status' => 'en_cours']);
        $invoice = Invoice::create(['enrollment_id' => $enr->id, 'invoice_number' => 'INV-2025-0001', 'subtotal' => 50000, 'discount_amount' => 0, 'total' => 50000, 'amount_paid' => 20000, 'amount_remaining' => 30000, 'status' => 'PARTIALLY_PAID', 'issued_at' => '2025-09-02']);
        $payment = Payment::create(['invoice_id' => $invoice->id, 'amount' => 20000, 'payment_method' => 'CASH', 'paid_at' => '2025-09-03', 'created_by' => $this->admin()->id]);

        return Receipt::create(['payment_id' => $payment->id, 'receipt_number' => 'REC-2025-0001', 'verification_code' => $code]);
    }

    public function test_verify_valid_code(): void
    {
        $this->makeReceipt('DAL-ABC123456789');

        $this->actingAs($this->admin())
            ->get(route('receipts.verify', ['code' => 'DAL-ABC123456789']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('result.valid', true)->where('result.amount', 20000));
    }

    public function test_verify_unknown_code(): void
    {
        $this->actingAs($this->admin())
            ->get(route('receipts.verify', ['code' => 'DAL-INEXISTANT']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('result.valid', false));
    }

    public function test_invoice_number_is_sequential(): void
    {
        $number = app(InvoiceService::class)->generateInvoiceNumber();
        $this->assertMatchesRegularExpression('/^INV-\d{4}-0001$/', $number);
    }
}
