<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\Classroom;
use App\Models\ClassroomType;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassroomTest extends TestCase
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

    private function classroomType(): ClassroomType
    {
        return ClassroomType::create([
            'name' => 'Primaire',
            'active' => true,
        ]);
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'CM2-A',
            'code' => 'CM2A',
            'capacity' => 35,
            'active' => true,
        ], $overrides);
    }

    // ─── Authentification ────────────────────────────────────────────────────

    public function test_guest_cannot_access_classrooms_index(): void
    {
        $this->get(route('classrooms.index'))
            ->assertRedirect(route('login'));
    }

    public function test_guest_cannot_create_classroom(): void
    {
        $this->post(route('classrooms.store'), $this->validPayload())
            ->assertRedirect(route('login'));
    }

    // ─── Index ───────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_classrooms_list(): void
    {
        $type = $this->classroomType();
        Classroom::create(['name' => 'CP1', 'code' => 'CP1', 'capacity' => 25, 'classroom_type_id' => $type->id]);
        Classroom::create(['name' => 'CE1', 'code' => 'CE1', 'capacity' => 30, 'classroom_type_id' => $type->id]);

        $this->actingAs($this->user())
            ->get(route('classrooms.index'))
            ->assertOk();
    }

    public function test_index_paginates_results(): void
    {
        $type = $this->classroomType();
        foreach (range(1, 12) as $i) {
            Classroom::create(['name' => "Classe {$i}", 'code' => "CLS{$i}", 'capacity' => 30, 'classroom_type_id' => $type->id]);
        }

        $this->actingAs($this->user())
            ->get(route('classrooms.index'))
            ->assertOk();

        $this->assertDatabaseCount('classes', 12);
    }

    public function test_index_can_filter_by_search(): void
    {
        $type = $this->classroomType();
        Classroom::create(['name' => 'CM2-A', 'code' => 'CM2A', 'capacity' => 30, 'classroom_type_id' => $type->id]);
        Classroom::create(['name' => 'CP1-B', 'code' => 'CP1B', 'capacity' => 28, 'classroom_type_id' => $type->id]);

        $this->actingAs($this->user())
            ->get(route('classrooms.index', ['search' => 'CM2']))
            ->assertOk();
    }

    // ─── Create ──────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_create_form(): void
    {
        $this->actingAs($this->user())
            ->get(route('classrooms.create'))
            ->assertOk();
    }

    // ─── Store ───────────────────────────────────────────────────────────────

    public function test_can_create_classroom_with_valid_data(): void
    {
        $type = $this->classroomType();

        $this->actingAs($this->user())
            ->post(route('classrooms.store'), $this->validPayload(['classroom_type_id' => $type->id]))
            ->assertRedirect(route('classrooms.index'));

        $this->assertDatabaseHas('classes', [
            'name' => 'CM2-A',
            'code' => 'CM2A',
            'capacity' => 35,
        ]);
    }

    public function test_can_create_classroom_without_type(): void
    {
        $this->actingAs($this->user())
            ->post(route('classrooms.store'), $this->validPayload())
            ->assertRedirect(route('classrooms.index'));

        $this->assertDatabaseHas('classes', ['name' => 'CM2-A', 'classroom_type_id' => null]);
    }

    public function test_cannot_create_classroom_without_name(): void
    {
        $this->actingAs($this->user())
            ->post(route('classrooms.store'), $this->validPayload(['name' => '']))
            ->assertSessionHasErrors('name');

        $this->assertDatabaseEmpty('classes');
    }

    public function test_cannot_create_classroom_without_code(): void
    {
        $this->actingAs($this->user())
            ->post(route('classrooms.store'), $this->validPayload(['code' => '']))
            ->assertSessionHasErrors('code');
    }

    public function test_cannot_create_classroom_without_capacity(): void
    {
        $this->actingAs($this->user())
            ->post(route('classrooms.store'), $this->validPayload(['capacity' => '']))
            ->assertSessionHasErrors('capacity');
    }

    public function test_capacity_must_be_at_least_1(): void
    {
        $this->actingAs($this->user())
            ->post(route('classrooms.store'), $this->validPayload(['capacity' => 0]))
            ->assertSessionHasErrors('capacity');
    }

    public function test_capacity_cannot_exceed_200(): void
    {
        $this->actingAs($this->user())
            ->post(route('classrooms.store'), $this->validPayload(['capacity' => 201]))
            ->assertSessionHasErrors('capacity');
    }

    public function test_cannot_create_classroom_with_duplicate_name(): void
    {
        Classroom::create(['name' => 'CM2-A', 'code' => 'CM2A', 'capacity' => 30]);

        $this->actingAs($this->user())
            ->post(route('classrooms.store'), $this->validPayload(['name' => 'CM2-A', 'code' => 'CM2B']))
            ->assertSessionHasErrors('name');
    }

    public function test_cannot_create_classroom_with_duplicate_code(): void
    {
        Classroom::create(['name' => 'CM2-A', 'code' => 'CM2A', 'capacity' => 30]);

        $this->actingAs($this->user())
            ->post(route('classrooms.store'), $this->validPayload(['name' => 'CM2-B', 'code' => 'CM2A']))
            ->assertSessionHasErrors('code');
    }

    // ─── Show ────────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_classroom_detail(): void
    {
        $type = $this->classroomType();
        $classroom = Classroom::create(['name' => 'CM2-A', 'code' => 'CM2A', 'capacity' => 30, 'classroom_type_id' => $type->id]);

        $this->actingAs($this->user())
            ->get(route('classrooms.show', $classroom))
            ->assertOk();
    }

    // ─── Edit / Update ───────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_edit_form(): void
    {
        $classroom = Classroom::create(['name' => 'CM2-A', 'code' => 'CM2A', 'capacity' => 30]);

        $this->actingAs($this->user())
            ->get(route('classrooms.edit', $classroom))
            ->assertOk();
    }

    public function test_can_update_classroom_with_valid_data(): void
    {
        $type = $this->classroomType();
        $classroom = Classroom::create(['name' => 'CM2-A', 'code' => 'CM2A', 'capacity' => 30]);

        $this->actingAs($this->user())
            ->put(route('classrooms.update', $classroom), [
                'name' => 'CM2-B',
                'code' => 'CM2B',
                'capacity' => 40,
                'classroom_type_id' => $type->id,
            ])
            ->assertRedirect(route('classrooms.index'));

        $this->assertDatabaseHas('classes', [
            'id' => $classroom->id,
            'name' => 'CM2-B',
            'capacity' => 40,
        ]);
    }

    public function test_can_update_classroom_keeping_same_name_and_code(): void
    {
        $classroom = Classroom::create(['name' => 'CM2-A', 'code' => 'CM2A', 'capacity' => 30]);

        $this->actingAs($this->user())
            ->put(route('classrooms.update', $classroom), [
                'name' => 'CM2-A',
                'code' => 'CM2A',
                'capacity' => 32,
            ])
            ->assertRedirect(route('classrooms.index'));

        $this->assertDatabaseHas('classes', ['id' => $classroom->id, 'capacity' => 32]);
    }

    public function test_cannot_update_classroom_with_duplicate_name_from_another_record(): void
    {
        Classroom::create(['name' => 'CM1-A', 'code' => 'CM1A', 'capacity' => 30]);
        $classroom = Classroom::create(['name' => 'CM2-A', 'code' => 'CM2A', 'capacity' => 30]);

        $this->actingAs($this->user())
            ->put(route('classrooms.update', $classroom), [
                'name' => 'CM1-A',
                'code' => 'CM2A',
                'capacity' => 30,
            ])
            ->assertSessionHasErrors('name');
    }

    // ─── Destroy ─────────────────────────────────────────────────────────────

    public function test_can_delete_classroom(): void
    {
        $classroom = Classroom::create(['name' => 'CM2-A', 'code' => 'CM2A', 'capacity' => 30]);

        $this->actingAs($this->user())
            ->delete(route('classrooms.destroy', $classroom))
            ->assertRedirect(route('classrooms.index'));

        $this->assertDatabaseMissing('classes', ['id' => $classroom->id]);
    }

    public function test_guest_cannot_delete_classroom(): void
    {
        $classroom = Classroom::create(['name' => 'CM2-A', 'code' => 'CM2A', 'capacity' => 30]);

        $this->delete(route('classrooms.destroy', $classroom))
            ->assertRedirect(route('login'));

        $this->assertDatabaseHas('classes', ['id' => $classroom->id]);
    }
}
