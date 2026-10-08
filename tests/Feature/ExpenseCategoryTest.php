<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AccountingTransaction;
use App\Models\CashAccount;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpenseCategoryTest extends TestCase
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

    private function cash(): CashAccount
    {
        return CashAccount::create(['name' => 'Caisse espèces', 'type' => 'CASH', 'balance' => 100000, 'active' => true]);
    }

    public function test_create_page_renders(): void
    {
        $this->cash();

        $this->actingAs($this->admin())
            ->get(route('expenses.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Comptabilite/Expenses/Create')
                ->has('categories')
                ->has('cashAccounts', 1));
    }

    public function test_expense_is_stored_with_category_and_debits_cash(): void
    {
        $cash = $this->cash();

        $this->actingAs($this->admin())
            ->post(route('expenses.store'), [
                'description' => "Facture d'électricité octobre",
                'category' => 'ELECTRICITY',
                'amount' => 25000,
                'cash_account_id' => $cash->id,
                'transaction_date' => '2026-07-30',
            ])
            ->assertRedirect(route('accounting.transactions'));

        $tx = AccountingTransaction::where('reference_type', 'EXPENSE')->first();
        $this->assertNotNull($tx);
        $this->assertSame('ELECTRICITY', $tx->category);
        $this->assertSame(25000.0, (float) $tx->amount);
        $this->assertEqualsWithDelta(75000, (float) $cash->fresh()->balance, 0.01);
    }

    public function test_invalid_category_is_rejected(): void
    {
        $cash = $this->cash();

        $this->actingAs($this->admin())
            ->from(route('expenses.create'))
            ->post(route('expenses.store'), [
                'description' => 'Test',
                'category' => 'NOPE',
                'amount' => 1000,
                'cash_account_id' => $cash->id,
                'transaction_date' => '2026-07-30',
            ])
            ->assertSessionHasErrors('category');

        $this->assertDatabaseCount('accounting_transactions', 0);
        $this->assertEqualsWithDelta(100000, (float) $cash->fresh()->balance, 0.01);
    }

    public function test_journal_can_filter_by_category(): void
    {
        $cash = $this->cash();
        AccountingTransaction::create(['type' => 'EXPENSE', 'amount' => 1000, 'description' => 'Loyer', 'reference_type' => 'EXPENSE', 'category' => 'RENT', 'cash_account_id' => $cash->id, 'transaction_date' => now()]);
        AccountingTransaction::create(['type' => 'EXPENSE', 'amount' => 2000, 'description' => 'Eau', 'reference_type' => 'EXPENSE', 'category' => 'WATER', 'cash_account_id' => $cash->id, 'transaction_date' => now()]);

        $this->actingAs($this->admin())
            ->get(route('accounting.transactions', ['category' => 'RENT']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('transactions.data', 1));
    }
}
