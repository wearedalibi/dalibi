<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\Country;
use App\Models\User;
use Database\Seeders\CountrySeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CountryTest extends TestCase
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

    private function teacher(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Roles::TEACHER);

        return $user;
    }

    public function test_guest_cannot_access_index(): void
    {
        $this->get(route('countries.index'))->assertRedirect(route('login'));
    }

    public function test_teacher_cannot_access_index(): void
    {
        $this->actingAs($this->teacher())->get(route('countries.index'))->assertForbidden();
    }

    public function test_admin_can_access_index(): void
    {
        $this->actingAs($this->admin())->get(route('countries.index'))->assertOk();
    }

    public function test_admin_can_create_country(): void
    {
        $this->actingAs($this->admin())
            ->post(route('countries.store'), ['name' => 'Testland', 'code' => 'ZZ'])
            ->assertRedirect(route('countries.index'));

        $this->assertDatabaseHas('countries', ['name' => 'Testland', 'code' => 'ZZ']);
    }

    public function test_create_requires_name_and_code(): void
    {
        $this->actingAs($this->admin())
            ->post(route('countries.store'), ['name' => '', 'code' => ''])
            ->assertSessionHasErrors(['name', 'code']);
    }

    public function test_create_rejects_duplicate_code(): void
    {
        Country::create(['name' => 'Testland', 'code' => 'ZZ']);

        $this->actingAs($this->admin())
            ->post(route('countries.store'), ['name' => 'Testland Bis', 'code' => 'ZZ'])
            ->assertSessionHasErrors('code');
    }

    public function test_admin_can_update_country(): void
    {
        $country = Country::create(['name' => 'Testland', 'code' => 'ZZ']);

        $this->actingAs($this->admin())
            ->put(route('countries.update', $country), ['name' => 'Testland Modifié', 'code' => 'ZZ'])
            ->assertRedirect(route('countries.index'));

        $this->assertDatabaseHas('countries', ['id' => $country->id, 'name' => 'Testland Modifié']);
    }

    public function test_admin_can_delete_country(): void
    {
        $country = Country::create(['name' => 'Testland', 'code' => 'ZZ']);

        $this->actingAs($this->admin())
            ->delete(route('countries.destroy', $country))
            ->assertRedirect(route('countries.index'));

        $this->assertDatabaseMissing('countries', ['id' => $country->id]);
    }

    public function test_seeder_is_idempotent_and_keeps_stable_uuid(): void
    {
        $this->seed(CountrySeeder::class);
        $count = Country::count();
        $this->assertGreaterThan(200, $count);
        $togoId = Country::where('code', 'TG')->value('id');

        // Deuxième exécution : aucun doublon, id inchangé.
        $this->seed(CountrySeeder::class);
        $this->assertSame($count, Country::count());
        $this->assertSame($togoId, Country::where('code', 'TG')->value('id'));
    }
}
