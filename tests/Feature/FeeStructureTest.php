<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\FeeCategorie;
use App\Models\FeeStructure;
use App\Models\Installment;
use App\Models\School;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeeStructureTest extends TestCase
{
    use RefreshDatabase;

    protected School $school;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->school = School::factory()->create();
    }

    private function admin(): User
    {
        $u = User::factory()->create();
        $u->assignRole(Roles::ADMINISTRATOR);

        return $u;
    }

    private function year(string $label, bool $active): AcademicYear
    {
        return AcademicYear::create([
            'school_id' => $this->school->id,
            'year' => $label,
            'start_date' => substr($label, 0, 4).'-09-01',
            'end_date' => (substr($label, 0, 4) + 1).'-07-31',
            'active' => $active,
        ]);
    }

    public function test_store_forces_active_academic_year(): void
    {
        $old = $this->year('2024-2025', false);
        $active = $this->year('2025-2026', true);
        $cat = FeeCategorie::create(['name' => 'Écolage']);
        $class = Classroom::factory()->create();

        // On envoie volontairement l'ancienne année : elle doit être ignorée
        $this->actingAs($this->admin())->post(route('fee-structures.store'), [
            'academic_year_id' => $old->id,
            'fee_category_id' => $cat->id,
            'class_id' => $class->id,
            'amount' => 50000,
        ])->assertRedirect();

        $this->assertDatabaseHas('fee_structures', [
            'fee_category_id' => $cat->id,
            'class_id' => $class->id,
            'academic_year_id' => $active->id,
        ]);
    }

    public function test_replicate_copies_structures_and_installments_to_active_year(): void
    {
        $source = $this->year('2024-2025', false);
        $active = $this->year('2025-2026', true);
        $cat = FeeCategorie::create(['name' => 'Écolage']);
        $class = Classroom::factory()->create();

        $src = FeeStructure::create([
            'academic_year_id' => $source->id,
            'fee_category_id' => $cat->id,
            'class_id' => $class->id,
            'amount' => 90000,
        ]);
        Installment::create(['fee_structure_id' => $src->id, 'name' => 'Tranche 1', 'installment_number' => 1, 'amount' => 45000]);
        Installment::create(['fee_structure_id' => $src->id, 'name' => 'Tranche 2', 'installment_number' => 2, 'amount' => 45000]);

        $this->actingAs($this->admin())
            ->post(route('fee-structures.replicate'), ['source_year_id' => $source->id])
            ->assertRedirect();

        $copy = FeeStructure::where('academic_year_id', $active->id)->first();
        $this->assertNotNull($copy);
        $this->assertEquals(90000, (float) $copy->amount);
        $this->assertEquals(2, $copy->installments()->count());
    }

    public function test_installments_total_cannot_exceed_structure_amount(): void
    {
        $this->year('2025-2026', true);
        $cat = FeeCategorie::create(['name' => 'Écolage']);
        $class = Classroom::factory()->create();
        $fs = FeeStructure::create([
            'academic_year_id' => AcademicYear::where('active', true)->value('id'),
            'fee_category_id' => $cat->id,
            'class_id' => $class->id,
            'amount' => 100000,
        ]);

        $this->actingAs($this->admin())
            ->post(route('fee-structures.installments.store-multiple', $fs), [
                'installments' => [
                    ['name' => 'T1', 'installment_number' => 1, 'amount' => 60000],
                    ['name' => 'T2', 'installment_number' => 2, 'amount' => 60000], // total 120000 > 100000
                ],
            ])
            ->assertSessionHasErrors('installments');

        $this->assertEquals(0, $fs->installments()->count());
    }

    public function test_installments_total_within_amount_is_accepted(): void
    {
        $this->year('2025-2026', true);
        $cat = FeeCategorie::create(['name' => 'Écolage']);
        $class = Classroom::factory()->create();
        $fs = FeeStructure::create([
            'academic_year_id' => AcademicYear::where('active', true)->value('id'),
            'fee_category_id' => $cat->id,
            'class_id' => $class->id,
            'amount' => 100000,
        ]);

        $this->actingAs($this->admin())
            ->post(route('fee-structures.installments.store-multiple', $fs), [
                'installments' => [
                    ['name' => 'T1', 'installment_number' => 1, 'amount' => 50000],
                    ['name' => 'T2', 'installment_number' => 2, 'amount' => 50000],
                ],
            ])
            ->assertSessionHasNoErrors();

        $this->assertEquals(2, $fs->installments()->count());
    }

    public function test_replicate_skips_existing_combinations(): void
    {
        $source = $this->year('2024-2025', false);
        $active = $this->year('2025-2026', true);
        $cat = FeeCategorie::create(['name' => 'Écolage']);
        $class = Classroom::factory()->create();

        FeeStructure::create(['academic_year_id' => $source->id, 'fee_category_id' => $cat->id, 'class_id' => $class->id, 'amount' => 90000]);
        // Déjà présent dans l'année active
        FeeStructure::create(['academic_year_id' => $active->id, 'fee_category_id' => $cat->id, 'class_id' => $class->id, 'amount' => 100000]);

        $this->actingAs($this->admin())
            ->post(route('fee-structures.replicate'), ['source_year_id' => $source->id]);

        // Toujours une seule structure pour l'année active (pas de doublon)
        $this->assertEquals(1, FeeStructure::where('academic_year_id', $active->id)->count());
    }
}
