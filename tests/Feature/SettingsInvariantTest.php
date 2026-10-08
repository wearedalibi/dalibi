<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Invariants du module Paramètres (et garde d'export des statistiques).
 *
 * Toute l'application résout « l'année en cours » par
 * `AcademicYear::where('active', true)->first()` : deux années actives
 * rattacheraient silencieusement les données à la mauvaise année.
 */
class SettingsInvariantTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function year(string $year, bool $active): AcademicYear
    {
        return AcademicYear::create([
            'year' => $year,
            'start_date' => substr($year, 0, 4).'-09-01',
            'end_date' => substr($year, 5, 4).'-07-01',
            'active' => $active,
        ]);
    }

    public function test_activating_a_year_deactivates_the_others(): void
    {
        $first = $this->year('2024-2025', true);
        $second = $this->year('2025-2026', true);

        $this->assertFalse($first->fresh()->active);
        $this->assertTrue($second->fresh()->active);
        $this->assertSame(1, AcademicYear::where('active', true)->count());
    }

    public function test_reactivating_an_older_year_switches_the_flag(): void
    {
        $first = $this->year('2024-2025', true);
        $second = $this->year('2025-2026', true);

        // Comme dans une requête réelle, l'année est rechargée depuis la base
        // (le model binding ne réutilise pas une instance en mémoire).
        AcademicYear::findOrFail($first->id)->update(['active' => true]);

        $this->assertTrue($first->fresh()->active);
        $this->assertFalse($second->fresh()->active);
        $this->assertSame(1, AcademicYear::where('active', true)->count());
    }

    public function test_deactivating_the_only_year_leaves_none_active(): void
    {
        $year = $this->year('2025-2026', true);

        $year->update(['active' => false]);

        $this->assertSame(0, AcademicYear::where('active', true)->count());
    }

    public function test_statistics_export_requires_the_export_permission(): void
    {
        $reader = User::factory()->create();
        $reader->givePermissionTo('view_statistics');

        $this->actingAs($reader)
            ->get(route('statistics.export', ['section' => 'effectifs', 'format' => 'xlsx']))
            ->assertForbidden();
    }
}
