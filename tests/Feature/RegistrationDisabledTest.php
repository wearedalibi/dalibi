<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationDisabledTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_page_is_not_accessible(): void
    {
        $this->get('/register')->assertNotFound();
    }

    public function test_registration_endpoint_is_disabled(): void
    {
        $response = $this->post('/register', [
            'firstname' => 'Hacker',
            'lastname' => 'Anon',
            'email' => 'hacker@example.com',
            'gender' => 'male',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertNotFound();
        $this->assertDatabaseMissing('users', ['email' => 'hacker@example.com']);
    }

    public function test_login_page_remains_available(): void
    {
        $this->get('/login')->assertOk();
    }
}
