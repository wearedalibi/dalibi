<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Escalade de privilèges depuis le module Administration.
 *
 * `edit_users` est détenu par le Secrétariat et la Direction : sans garde-fou,
 * ils pourraient réinitialiser le mot de passe d'un administrateur et prendre
 * sa place. Le rôle administrateur doit par ailleurs rester intouchable, sous
 * peine de verrouiller l'instance sans recours.
 */
class AdminEscalationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function withRole(string $role): User
    {
        return tap(User::factory()->create(), fn (User $u) => $u->assignRole($role));
    }

    /** Charge utile complète d'édition d'utilisateur. */
    private function payload(User $user, array $overrides = []): array
    {
        return array_merge([
            'firstname' => $user->firstname,
            'lastname' => $user->lastname,
            'email' => $user->email,
            'gender' => 'male',
        ], $overrides);
    }

    public function test_secretary_cannot_reset_an_administrator_password(): void
    {
        $admin = $this->withRole(Roles::ADMINISTRATOR);
        $secretary = $this->withRole(Roles::SECRETARIAT);

        $this->actingAs($secretary)
            ->put(route('users.update', $admin), $this->payload($admin, [
                'password' => 'MotDePasse-Pirate-2026',
                'password_confirmation' => 'MotDePasse-Pirate-2026',
            ]))
            ->assertForbidden();

        // Le mot de passe de l'administrateur est intact.
        $this->assertTrue(Hash::check('password', $admin->fresh()->password));
    }

    public function test_administrator_can_still_edit_another_administrator(): void
    {
        $actor = $this->withRole(Roles::ADMINISTRATOR);
        $target = $this->withRole(Roles::ADMINISTRATOR);

        $this->actingAs($actor)
            ->put(route('users.update', $target), $this->payload($target, ['firstname' => 'Modifié']))
            ->assertRedirect();

        $this->assertSame('Modifié', $target->fresh()->firstname);
    }

    public function test_password_set_by_someone_else_must_be_changed_at_next_login(): void
    {
        $admin = $this->withRole(Roles::ADMINISTRATOR);
        $teacher = $this->withRole(Roles::TEACHER);

        $this->actingAs($admin)
            ->put(route('users.update', $teacher), $this->payload($teacher, [
                'password' => 'Nouveau-MotDePasse-2026',
                'password_confirmation' => 'Nouveau-MotDePasse-2026',
            ]))
            ->assertRedirect();

        $this->assertTrue($teacher->fresh()->must_change_password);
    }

    public function test_secretary_cannot_grant_roles(): void
    {
        $secretary = $this->withRole(Roles::SECRETARIAT);
        $teacher = $this->withRole(Roles::TEACHER);
        $adminRole = Role::findByName(Roles::ADMINISTRATOR);

        $this->actingAs($secretary)
            ->put(route('users.update', $teacher), $this->payload($teacher, [
                'roles' => [$adminRole->id],
            ]))
            ->assertRedirect();

        // Les rôles sont ignorés sans `manage_roles_permissions`.
        $this->assertFalse($teacher->fresh()->hasRole(Roles::ADMINISTRATOR));
    }

    public function test_administrator_role_cannot_be_stripped_of_its_permissions(): void
    {
        $admin = $this->withRole(Roles::ADMINISTRATOR);
        $adminRole = Role::findByName(Roles::ADMINISTRATOR);
        $before = $adminRole->permissions()->count();

        $this->actingAs($admin)
            ->put(route('roles.update', $adminRole), [
                'name' => 'administrateur',
                'description' => 'Tentative',
                'permissions' => [],
            ])
            ->assertSessionHasErrors('role');

        $this->assertSame($before, $adminRole->fresh()->permissions()->count());
    }
}
