<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\School;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class SingleSchoolTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Roles::ADMINISTRATOR);

        return $user;
    }

    public function test_index_redirects_to_create_when_no_school(): void
    {
        $this->actingAs($this->admin())
            ->get(route('schools.index'))
            ->assertRedirect(route('schools.create'));
    }

    public function test_index_redirects_to_edit_when_a_school_exists(): void
    {
        $school = School::factory()->create();

        $this->actingAs($this->admin())
            ->get(route('schools.index'))
            ->assertRedirect(route('schools.edit', $school));
    }

    public function test_create_is_blocked_when_a_school_already_exists(): void
    {
        $school = School::factory()->create();

        $this->actingAs($this->admin())
            ->get(route('schools.create'))
            ->assertRedirect(route('schools.edit', $school));
    }

    public function test_store_does_not_create_a_second_school(): void
    {
        $school = School::factory()->create();

        $this->actingAs($this->admin())
            ->post(route('schools.store'), [
                'name' => 'Deuxième école',
                'code' => 'ECOLE-2',
                'currency' => 'XOF',
                'terme' => 'République Togolaise',
            ])
            ->assertRedirect(route('schools.edit', $school));

        $this->assertSame(1, School::count());
    }

    public function test_bulk_and_destroy_routes_no_longer_exist(): void
    {
        foreach (['schools.bulk-activate', 'schools.bulk-deactivate', 'schools.toggle-active', 'schools.destroy'] as $name) {
            $this->assertFalse(
                Route::has($name),
                "La route {$name} ne devrait plus exister.",
            );
        }
    }
}
