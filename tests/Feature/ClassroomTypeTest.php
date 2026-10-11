<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\Classroom;
use App\Models\ClassroomType;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassroomTypeTest extends TestCase
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

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Primaire',
            'description' => 'Cycle primaire',
            'period_system' => 'trimestre',
            'active' => true,
        ], $overrides);
    }

    // ─── Authentification ────────────────────────────────────────────────────

    public function test_guest_cannot_access_classroom_types_index(): void
    {
        $this->get(route('classroom-types.index'))
            ->assertRedirect(route('login'));
    }

    public function test_guest_cannot_create_classroom_type(): void
    {
        $this->post(route('classroom-types.store'), $this->validPayload())
            ->assertRedirect(route('login'));
    }

    // ─── Index ───────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_classroom_types_list(): void
    {
        ClassroomType::create(['name' => 'Maternelle', 'active' => true]);
        ClassroomType::create(['name' => 'Secondaire', 'active' => false]);

        $this->actingAs($this->user())
            ->get(route('classroom-types.index'))
            ->assertOk();
    }

    public function test_index_returns_paginated_results(): void
    {
        foreach (range(1, 15) as $i) {
            ClassroomType::create(['name' => "Type {$i}", 'active' => true]);
        }

        $this->actingAs($this->user())
            ->get(route('classroom-types.index'))
            ->assertOk();

        $this->assertDatabaseCount('classroom_types', 15);
    }

    public function test_index_can_filter_by_search(): void
    {
        ClassroomType::create(['name' => 'Primaire', 'active' => true]);
        ClassroomType::create(['name' => 'Lycée', 'active' => true]);

        $this->actingAs($this->user())
            ->get(route('classroom-types.index', ['search' => 'Lycée']))
            ->assertOk();
    }

    // ─── Create ──────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_create_form(): void
    {
        $this->actingAs($this->user())
            ->get(route('classroom-types.create'))
            ->assertOk();
    }

    // ─── Store ───────────────────────────────────────────────────────────────

    public function test_can_create_classroom_type_with_valid_data(): void
    {
        $this->actingAs($this->user())
            ->post(route('classroom-types.store'), $this->validPayload())
            ->assertRedirect(route('classroom-types.index'));

        $this->assertDatabaseHas('classroom_types', [
            'name' => 'Primaire',
            'active' => true,
        ]);
    }

    public function test_cannot_create_classroom_type_without_name(): void
    {
        $this->actingAs($this->user())
            ->post(route('classroom-types.store'), $this->validPayload(['name' => '']))
            ->assertSessionHasErrors('name');

        $this->assertDatabaseEmpty('classroom_types');
    }

    public function test_cannot_create_classroom_type_with_duplicate_name(): void
    {
        ClassroomType::create(['name' => 'Primaire', 'active' => true]);

        $this->actingAs($this->user())
            ->post(route('classroom-types.store'), $this->validPayload(['name' => 'Primaire']))
            ->assertSessionHasErrors('name');

        $this->assertDatabaseCount('classroom_types', 1);
    }

    public function test_description_is_optional(): void
    {
        $this->actingAs($this->user())
            ->post(route('classroom-types.store'), ['name' => 'Collège', 'period_system' => 'trimestre', 'active' => true])
            ->assertRedirect(route('classroom-types.index'));

        $this->assertDatabaseHas('classroom_types', ['name' => 'Collège']);
    }

    // ─── Show ────────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_classroom_type_detail(): void
    {
        $type = ClassroomType::create(['name' => 'Lycée', 'active' => true]);

        $this->actingAs($this->user())
            ->get(route('classroom-types.show', $type))
            ->assertOk();
    }

    // ─── Edit / Update ───────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_edit_form(): void
    {
        $type = ClassroomType::create(['name' => 'Lycée', 'active' => true]);

        $this->actingAs($this->user())
            ->get(route('classroom-types.edit', $type))
            ->assertOk();
    }

    public function test_can_update_classroom_type(): void
    {
        $type = ClassroomType::create(['name' => 'Lycée', 'active' => true]);

        $this->actingAs($this->user())
            ->put(route('classroom-types.update', $type), [
                'name' => 'Lycée Technique',
                'description' => 'Filières techniques',
                'period_system' => 'trimestre',
                'active' => false,
            ])
            ->assertRedirect(route('classroom-types.index'));

        $this->assertDatabaseHas('classroom_types', [
            'id' => $type->id,
            'name' => 'Lycée Technique',
            'active' => false,
        ]);
    }

    public function test_cannot_update_with_duplicate_name_from_another_record(): void
    {
        ClassroomType::create(['name' => 'Existant', 'active' => true]);
        $type = ClassroomType::create(['name' => 'À modifier', 'active' => true]);

        $this->actingAs($this->user())
            ->put(route('classroom-types.update', $type), [
                'name' => 'Existant',
                'period_system' => 'trimestre',
                'active' => true,
            ])
            ->assertSessionHasErrors('name');
    }

    public function test_can_update_classroom_type_keeping_same_name(): void
    {
        $type = ClassroomType::create(['name' => 'Primaire', 'active' => true]);

        $this->actingAs($this->user())
            ->put(route('classroom-types.update', $type), [
                'name' => 'Primaire',
                'description' => 'Description mise à jour',
                'period_system' => 'trimestre',
                'active' => true,
            ])
            ->assertRedirect(route('classroom-types.index'));
    }

    // ─── Destroy ─────────────────────────────────────────────────────────────

    public function test_can_delete_classroom_type(): void
    {
        $type = ClassroomType::create(['name' => 'À supprimer', 'active' => true]);

        $this->actingAs($this->user())
            ->delete(route('classroom-types.destroy', $type))
            ->assertRedirect(route('classroom-types.index'));

        $this->assertDatabaseMissing('classroom_types', ['id' => $type->id]);
    }

    public function test_deleting_type_with_classrooms_removes_type(): void
    {
        $type = ClassroomType::create(['name' => 'Primaire', 'active' => true]);
        Classroom::create([
            'name' => 'CP1',
            'code' => 'CP1',
            'capacity' => 30,
            'classroom_type_id' => $type->id,
        ]);

        $this->actingAs($this->user())
            ->delete(route('classroom-types.destroy', $type))
            ->assertRedirect(route('classroom-types.index'));

        $this->assertDatabaseMissing('classroom_types', ['id' => $type->id]);
    }
}
