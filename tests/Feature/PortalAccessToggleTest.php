<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Guardian;
use App\Models\School;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PortalAccessToggleTest extends TestCase
{
    use RefreshDatabase;

    private School $school;

    protected function setUp(): void
    {
        parent::setUp();
        $this->school = School::factory()->create(['portal_enabled' => true]);
        AcademicYear::create(['year' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-07-31', 'active' => true]);
    }

    private function guardian(): Guardian
    {
        $g = Guardian::create(['first_name' => 'P', 'last_name' => Str::random(5), 'email' => Str::random(8).'@ex.com', 'is_active' => true]);
        $g->password = 'secret123';
        $g->save();

        return $g;
    }

    public function test_login_works_when_portal_enabled(): void
    {
        $g = $this->guardian();

        $this->postJson('/api/v1/auth/login', ['login' => $g->email, 'password' => 'secret123'])
            ->assertOk()
            ->assertJsonStructure(['token', 'type']);
    }

    public function test_login_is_blocked_when_portal_disabled(): void
    {
        $g = $this->guardian();
        $this->school->update(['portal_enabled' => false]);

        $this->postJson('/api/v1/auth/login', ['login' => $g->email, 'password' => 'secret123'])
            ->assertStatus(503)
            ->assertJsonStructure(['message']);
    }

    public function test_authenticated_endpoints_are_blocked_when_portal_disabled(): void
    {
        $g = $this->guardian();
        Sanctum::actingAs($g, ['read']);

        // Portail ouvert : accès normal.
        $this->getJson('/api/v1/children')->assertOk();

        // Portail fermé : même un jeton valide ne passe plus.
        $this->school->update(['portal_enabled' => false]);
        $this->getJson('/api/v1/children')->assertStatus(503);
        $this->getJson('/api/v1/dashboard')->assertStatus(503);
    }

    public function test_portal_blocked_when_no_school_configured(): void
    {
        $this->school->delete();

        $this->postJson('/api/v1/auth/login', ['login' => 'x@ex.com', 'password' => 'secret123'])
            ->assertStatus(503);
    }
}
