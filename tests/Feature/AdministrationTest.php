<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AcademicPeriod;
use App\Models\AcademicYear;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests du module Administration :
 * - Années académiques (AcademicYear)
 * - Périodes académiques (AcademicPeriod)
 */
class AdministrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private function user(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Roles::ADMINISTRATOR);

        return $user;
    }

    private function academicYear(array $overrides = []): AcademicYear
    {
        return AcademicYear::create(array_merge([
            'year' => '2024-2025',
            'start_date' => '2024-09-01',
            'end_date' => '2025-07-31',
            'active' => true,
        ], $overrides));
    }

    private function validYearPayload(array $overrides = []): array
    {
        return array_merge([
            'year' => '2025-2026',
            'start_date' => '2025-09-01',
            'end_date' => '2026-07-31',
            'active' => false,
        ], $overrides);
    }

    private function validPeriodPayload(string $academicYearId, array $overrides = []): array
    {
        return array_merge([
            'name' => 'Trimestre 1',
            'type' => 'trimestre',
            'start_date' => '2025-09-01',
            'end_date' => '2025-11-30',
            'order' => 1,
            'is_current' => false,
            'academic_year_id' => $academicYearId,
        ], $overrides);
    }

    // ════════════════════════════════════════════════════════════════════════
    // ANNÉES ACADÉMIQUES
    // ════════════════════════════════════════════════════════════════════════

    // ─── Authentification ────────────────────────────────────────────────────

    public function test_guest_cannot_access_academic_years_index(): void
    {
        $this->get(route('academic-years.index'))
            ->assertRedirect(route('login'));
    }

    public function test_guest_cannot_create_academic_year(): void
    {
        $this->post(route('academic-years.store'), $this->validYearPayload())
            ->assertRedirect(route('login'));
    }

    // ─── Index ───────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_academic_years_list(): void
    {
        $this->academicYear();

        $this->actingAs($this->user())
            ->get(route('academic-years.index'))
            ->assertOk();
    }

    public function test_index_can_filter_academic_years_by_search(): void
    {
        $this->academicYear(['year' => '2023-2024', 'start_date' => '2023-09-01', 'end_date' => '2024-07-31']);
        $this->academicYear();

        $this->actingAs($this->user())
            ->get(route('academic-years.index', ['search' => '2023']))
            ->assertOk();
    }

    // ─── Create ──────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_academic_year_create_form(): void
    {
        $this->actingAs($this->user())
            ->get(route('academic-years.create'))
            ->assertOk();
    }

    // ─── Store ───────────────────────────────────────────────────────────────

    public function test_can_create_academic_year_with_valid_data(): void
    {
        $this->actingAs($this->user())
            ->post(route('academic-years.store'), $this->validYearPayload())
            ->assertRedirect(route('academic-years.index'));

        $this->assertDatabaseHas('academic_years', [
            'year' => '2025-2026',
            'active' => false,
        ]);
    }

    public function test_cannot_create_academic_year_without_year(): void
    {
        $this->actingAs($this->user())
            ->post(route('academic-years.store'), $this->validYearPayload(['year' => '']))
            ->assertSessionHasErrors('year');
    }

    public function test_cannot_create_academic_year_with_duplicate_year(): void
    {
        $this->academicYear();

        $this->actingAs($this->user())
            ->post(route('academic-years.store'), $this->validYearPayload(['year' => '2024-2025']))
            ->assertSessionHasErrors('year');
    }

    public function test_cannot_create_academic_year_without_start_date(): void
    {
        $this->actingAs($this->user())
            ->post(route('academic-years.store'), $this->validYearPayload(['start_date' => '']))
            ->assertSessionHasErrors('start_date');
    }

    public function test_cannot_create_academic_year_without_end_date(): void
    {
        $this->actingAs($this->user())
            ->post(route('academic-years.store'), $this->validYearPayload(['end_date' => '']))
            ->assertSessionHasErrors('end_date');
    }

    public function test_end_date_must_be_after_start_date(): void
    {
        $this->actingAs($this->user())
            ->post(route('academic-years.store'), $this->validYearPayload([
                'start_date' => '2025-09-01',
                'end_date' => '2025-08-01',
            ]))
            ->assertSessionHasErrors('end_date');
    }

    // ─── Show ────────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_academic_year_detail(): void
    {
        $year = $this->academicYear();

        $this->actingAs($this->user())
            ->get(route('academic-years.show', $year))
            ->assertOk();
    }

    // ─── Edit / Update ───────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_academic_year_edit_form(): void
    {
        $year = $this->academicYear();

        $this->actingAs($this->user())
            ->get(route('academic-years.edit', $year))
            ->assertOk();
    }

    public function test_can_update_academic_year(): void
    {
        $year = $this->academicYear();

        $this->actingAs($this->user())
            ->put(route('academic-years.update', $year), [
                'year' => '2024-2025',
                'start_date' => '2024-09-01',
                'end_date' => '2025-08-31',
                'active' => true,
            ])
            ->assertRedirect(route('academic-years.index'));

        $this->assertDatabaseHas('academic_years', [
            'id' => $year->id,
        ]);
    }

    // ─── Destroy ─────────────────────────────────────────────────────────────

    public function test_can_delete_academic_year(): void
    {
        $year = $this->academicYear();

        $this->actingAs($this->user())
            ->delete(route('academic-years.destroy', $year))
            ->assertRedirect(route('academic-years.index'));

        $this->assertDatabaseMissing('academic_years', ['id' => $year->id]);
    }

    public function test_guest_cannot_delete_academic_year(): void
    {
        $year = $this->academicYear();

        $this->delete(route('academic-years.destroy', $year))
            ->assertRedirect(route('login'));

        $this->assertDatabaseHas('academic_years', ['id' => $year->id]);
    }

    // ════════════════════════════════════════════════════════════════════════
    // PÉRIODES ACADÉMIQUES
    // ════════════════════════════════════════════════════════════════════════

    // ─── Authentification ────────────────────────────────────────────────────

    public function test_guest_cannot_access_academic_periods_index(): void
    {
        $this->get(route('academic-periods.index'))
            ->assertRedirect(route('login'));
    }

    // ─── Index ───────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_academic_periods_list(): void
    {
        $year = $this->academicYear();
        AcademicPeriod::create($this->validPeriodPayload($year->id));

        $this->actingAs($this->user())
            ->get(route('academic-periods.index'))
            ->assertOk();
    }

    public function test_index_can_filter_periods_by_type(): void
    {
        $year = $this->academicYear();
        AcademicPeriod::create($this->validPeriodPayload($year->id, ['type' => 'trimestre']));
        AcademicPeriod::create($this->validPeriodPayload($year->id, [
            'name' => 'Semestre 1',
            'type' => 'semestre',
            'start_date' => '2025-09-01',
            'end_date' => '2026-01-31',
            'order' => 2,
        ]));

        $this->actingAs($this->user())
            ->get(route('academic-periods.index', ['type' => 'trimestre']))
            ->assertOk();
    }

    public function test_index_can_filter_periods_by_academic_year(): void
    {
        $year = $this->academicYear();

        $this->actingAs($this->user())
            ->get(route('academic-periods.index', ['academic_year_id' => $year->id]))
            ->assertOk();
    }

    // ─── Create ──────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_academic_period_create_form(): void
    {
        $this->actingAs($this->user())
            ->get(route('academic-periods.create'))
            ->assertOk();
    }

    // ─── Store ───────────────────────────────────────────────────────────────

    public function test_can_create_academic_period_with_valid_data(): void
    {
        $year = $this->academicYear();

        $this->actingAs($this->user())
            ->post(route('academic-periods.store'), $this->validPeriodPayload($year->id))
            ->assertRedirect(route('academic-periods.index'));

        $this->assertDatabaseHas('academic_periods', [
            'name' => 'Trimestre 1',
            'type' => 'trimestre',
        ]);
    }

    public function test_cannot_create_period_without_name(): void
    {
        $year = $this->academicYear();

        $this->actingAs($this->user())
            ->post(route('academic-periods.store'), $this->validPeriodPayload($year->id, ['name' => '']))
            ->assertSessionHasErrors('name');
    }

    public function test_cannot_create_period_with_invalid_type(): void
    {
        $year = $this->academicYear();

        $this->actingAs($this->user())
            ->post(route('academic-periods.store'), $this->validPeriodPayload($year->id, ['type' => 'annuel']))
            ->assertSessionHasErrors('type');
    }

    public function test_cannot_create_period_without_academic_year(): void
    {
        $payload = $this->validPeriodPayload('non-existing-uuid');

        $this->actingAs($this->user())
            ->post(route('academic-periods.store'), $payload)
            ->assertSessionHasErrors('academic_year_id');
    }

    public function test_period_end_date_must_be_after_start_date(): void
    {
        $year = $this->academicYear();

        $this->actingAs($this->user())
            ->post(route('academic-periods.store'), $this->validPeriodPayload($year->id, [
                'start_date' => '2025-11-01',
                'end_date' => '2025-10-01',
            ]))
            ->assertSessionHasErrors('end_date');
    }

    // ─── Show ────────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_academic_period_detail(): void
    {
        $year = $this->academicYear();
        $period = AcademicPeriod::create($this->validPeriodPayload($year->id));

        $this->actingAs($this->user())
            ->get(route('academic-periods.show', $period))
            ->assertOk();
    }

    // ─── Edit / Update ───────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_academic_period_edit_form(): void
    {
        $year = $this->academicYear();
        $period = AcademicPeriod::create($this->validPeriodPayload($year->id));

        $this->actingAs($this->user())
            ->get(route('academic-periods.edit', $period))
            ->assertOk();
    }

    public function test_can_update_academic_period(): void
    {
        $year = $this->academicYear();
        $period = AcademicPeriod::create($this->validPeriodPayload($year->id));

        $this->actingAs($this->user())
            ->put(route('academic-periods.update', $period), $this->validPeriodPayload($year->id, [
                'name' => 'Trimestre 1 (modifié)',
                'is_current' => true,
            ]))
            ->assertRedirect(route('academic-periods.index'));

        $this->assertDatabaseHas('academic_periods', [
            'id' => $period->id,
            'name' => 'Trimestre 1 (modifié)',
            'is_current' => true,
        ]);
    }

    // ─── Destroy ─────────────────────────────────────────────────────────────

    public function test_can_delete_academic_period(): void
    {
        $year = $this->academicYear();
        $period = AcademicPeriod::create($this->validPeriodPayload($year->id));

        $this->actingAs($this->user())
            ->delete(route('academic-periods.destroy', $period))
            ->assertRedirect(route('academic-periods.index'));

        $this->assertDatabaseMissing('academic_periods', ['id' => $period->id]);
    }

    public function test_guest_cannot_delete_academic_period(): void
    {
        $year = $this->academicYear();
        $period = AcademicPeriod::create($this->validPeriodPayload($year->id));

        $this->delete(route('academic-periods.destroy', $period))
            ->assertRedirect(route('login'));

        $this->assertDatabaseHas('academic_periods', ['id' => $period->id]);
    }
}
