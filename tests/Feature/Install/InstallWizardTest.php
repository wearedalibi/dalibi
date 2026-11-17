<?php

namespace Tests\Feature\Install;

use App\Support\Install\InstallState;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InstallWizardTest extends TestCase
{
    use RefreshDatabase;

    private function notInstalled(): void
    {
        $this->app->make(InstallState::class)->fake(false);
    }

    private function installed(): void
    {
        $this->app->make(InstallState::class)->fake(true);
    }

    public function test_welcome_screen_renders_when_not_installed(): void
    {
        $this->notInstalled();

        $this->get('/install')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('install/welcome'));
    }

    public function test_requests_are_redirected_to_installer_when_not_installed(): void
    {
        $this->notInstalled();

        $this->get('/login')->assertRedirect('/install');
        $this->get('/dashboard')->assertRedirect('/install');
    }

    public function test_installer_is_locked_once_installed(): void
    {
        $this->installed();

        $this->get('/install')->assertRedirect('/login');
    }

    public function test_language_step_validates_and_advances(): void
    {
        $this->notInstalled();

        $this->post('/install/language', ['locale' => 'xx'])
            ->assertSessionHasErrors('locale');

        $this->post('/install/language', ['locale' => 'en'])
            ->assertRedirect('/install/school')
            ->assertSessionHas('install.language.locale', 'en');
    }

    public function test_school_step_requires_a_name_and_advances(): void
    {
        $this->notInstalled();

        $this->post('/install/school', [])
            ->assertSessionHasErrors('name');

        $this->post('/install/school', ['name' => 'Collège Dalibi'])
            ->assertRedirect('/install/admin')
            ->assertSessionHas('install.school.name', 'Collège Dalibi');
    }

    public function test_admin_step_requires_confirmed_password_and_advances(): void
    {
        $this->notInstalled();

        $this->post('/install/admin', [
            'firstname' => 'Ada',
            'lastname' => 'Admin',
            'email' => 'ada@example.test',
            'password' => 'secret-pass-123',
            'password_confirmation' => 'different',
        ])->assertSessionHasErrors('password');

        $this->post('/install/admin', [
            'firstname' => 'Ada',
            'lastname' => 'Admin',
            'email' => 'ada@example.test',
            'password' => 'secret-pass-123',
            'password_confirmation' => 'secret-pass-123',
        ])->assertRedirect('/install/security');
    }

    public function test_security_step_advances_to_run(): void
    {
        $this->notInstalled();

        $this->post('/install/security', [
            'force_2fa' => '1',
            'app_debug_off' => '1',
            'force_https' => '1',
            'enable_sentry' => '0',
            'password_policy' => 'strong',
        ])->assertRedirect('/install/run');
    }

    public function test_run_screen_renders_without_executing(): void
    {
        $this->notInstalled();

        $this->get('/install/run')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('install/running'));
    }
}
