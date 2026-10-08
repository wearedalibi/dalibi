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
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Intégrité comptable du module Comptabilité & écolage.
 *
 * Deux invariants : on n'encaisse jamais plus que le reste dû, et on ne détruit
 * jamais la preuve d'un encaissement (paiement + reçu) en laissant le journal
 * comptable et le solde de caisse inchangés.
 */
class AccountingIntegrityTest extends TestCase
{
    use RefreshDatabase;

    private School $school;

    private AcademicYear $year;

    private Classroom $class;

    private CashAccount $cash;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->school = School::factory()->create();
        $this->year = AcademicYear::create([
            'year' => '2025-2026', 'start_date' => '2025-09-01',
            'end_date' => '2026-07-31', 'active' => true,
        ]);
        $this->class = Classroom::create([
            'name' => '6ème A', 'code' => '6A', 'capacity' => 40, 'active' => true,
        ]);

        $this->cash = CashAccount::create([
            'name' => 'Caisse principale', 'type' => 'CASH', 'balance' => 0, 'active' => true,
        ]);
    }

    /** Charge utile d'un paiement en espèces. */
    private function payload(float $amount, string $paidAt = '2025-09-10'): array
    {
        return [
            'amount' => $amount,
            'payment_method' => 'CASH',
            'cash_account_id' => $this->cash->id,
            'paid_at' => $paidAt,
        ];
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Roles::ADMINISTRATOR);

        return $user;
    }

    private function enrollmentWithInvoice(float $total = 100000): Enrollment
    {
        $student = Student::create([
            'firstname' => 'A', 'lastname' => 'B', 'gender' => 'male', 'birth_date' => '2012-01-01',
            'user_id' => User::factory()->create()->id, 'active' => true, 'matricule' => 'C001',
        ]);

        $enrollment = Enrollment::create([
            'school_id' => $this->school->id, 'student_id' => $student->id,
            'class_id' => $this->class->id, 'academic_year_id' => $this->year->id,
            'enrollment_code' => 'ENR-C001', 'enrollment_date' => '2025-09-02',
            'status' => 'PENDING',
        ]);

        Invoice::create([
            'enrollment_id' => $enrollment->id,
            'invoice_number' => 'FAC-0001',
            'subtotal' => $total,
            'discount_amount' => 0,
            'total' => $total,
            'amount_paid' => 0,
            'amount_remaining' => $total,
            'status' => 'UNPAID',
        ]);

        return $enrollment->fresh();
    }

    // --- C1 : jamais plus que le reste dû ---

    public function test_payment_cannot_exceed_the_remaining_amount(): void
    {
        $enrollment = $this->enrollmentWithInvoice(100000);

        $this->actingAs($this->admin())
            ->post(route('enrollments.payments.store', $enrollment), $this->payload(150000))
            ->assertSessionHasErrors('amount');

        $this->assertSame(0, $enrollment->invoice->fresh()->payments()->count());
    }

    public function test_two_successive_payments_cannot_exceed_the_total(): void
    {
        $enrollment = $this->enrollmentWithInvoice(100000);
        $admin = $this->admin();

        // Premier paiement : la totalité.
        $this->actingAs($admin)
            ->post(route('enrollments.payments.store', $enrollment), $this->payload(100000))
            ->assertRedirect();

        // Second paiement : le reste dû est nul, il doit être refusé.
        $this->actingAs($admin)
            ->post(route('enrollments.payments.store', $enrollment), $this->payload(1000, '2025-09-11'))
            ->assertSessionHasErrors('amount');

        $invoice = $enrollment->invoice->fresh();
        $this->assertSame(1, $invoice->payments()->count());
        $this->assertEqualsWithDelta(100000, (float) $invoice->amount_paid, 0.01);
    }

    // --- C2 : on ne détruit pas la preuve d'un encaissement ---

    public function test_enrollment_with_payments_cannot_be_deleted(): void
    {
        $enrollment = $this->enrollmentWithInvoice(100000);
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post(route('enrollments.payments.store', $enrollment), $this->payload(50000))
            ->assertRedirect();

        $this->actingAs($admin)
            ->delete(route('enrollments.destroy', $enrollment))
            ->assertSessionHasErrors('delete');

        $this->assertDatabaseHas('enrollments', ['id' => $enrollment->id]);
        $this->assertSame(1, $enrollment->invoice->fresh()->payments()->count());
    }

    public function test_enrollment_without_payments_can_still_be_deleted(): void
    {
        $enrollment = $this->enrollmentWithInvoice(100000);

        $this->actingAs($this->admin())
            ->delete(route('enrollments.destroy', $enrollment))
            ->assertRedirect();

        $this->assertDatabaseMissing('enrollments', ['id' => $enrollment->id]);
    }
}
