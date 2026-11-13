<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LocaleTest extends TestCase
{
    use RefreshDatabase;

    private function user(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'locale' => null,
            'must_change_password' => false,
        ], $overrides));
    }

    public function test_user_can_change_language(): void
    {
        $user = $this->user();

        $this->actingAs($user)
            ->patch('/settings/language', ['locale' => 'en'])
            ->assertRedirect();

        $this->assertSame('en', $user->fresh()->locale);
    }

    public function test_invalid_locale_is_rejected(): void
    {
        $user = $this->user(['locale' => 'fr']);

        $this->actingAs($user)
            ->patch('/settings/language', ['locale' => 'de'])
            ->assertSessionHasErrors('locale');

        $this->assertSame('fr', $user->fresh()->locale);
    }

    public function test_locale_and_translations_are_shared(): void
    {
        $user = $this->user(['locale' => 'en']);

        $this->actingAs($user)
            ->get('/settings/profile')
            ->assertInertia(fn ($page) => $page
                ->where('locale', 'en')
                ->where('translations.menu.dashboard', 'Dashboard'));
    }
}
