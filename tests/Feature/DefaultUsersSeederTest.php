<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\User;
use Database\Seeders\DefaultUsersSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DefaultUsersSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_one_demo_user_is_seeded_per_role(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(DefaultUsersSeeder::class);

        $expected = [
            'admin@dalibi.tg' => Roles::ADMINISTRATOR,
            'directeur@dalibi.tg' => Roles::DIRECTOR,
            'enseignant@dalibi.tg' => Roles::TEACHER,
            'comptable@dalibi.tg' => Roles::ACCOUNTING,
            'secretaire@dalibi.tg' => Roles::SECRETARIAT,
        ];

        foreach ($expected as $email => $role) {
            $user = User::where('email', $email)->first();
            $this->assertNotNull($user, "Compte manquant : {$email}");
            $this->assertTrue($user->is_demo);
            $this->assertNotNull($user->email_verified_at);
            $this->assertTrue($user->hasRole($role));
        }
    }

    public function test_seeder_is_idempotent(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(DefaultUsersSeeder::class);
        $this->seed(DefaultUsersSeeder::class);

        $this->assertEquals(1, User::where('email', 'admin@dalibi.tg')->count());
    }
}
