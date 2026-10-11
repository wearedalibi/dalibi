<?php

namespace App\Http\Middleware;

use App\Constants\Currencies;
use App\Models\School;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
                // Rôles et permissions de l'utilisateur (pour conditionner la vue côté front)
                'roles' => $user ? $user->getRoleNames()->values() : [],
                'permissions' => $user ? $user->getAllPermissions()->pluck('name')->values() : [],
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            // Réglages d'établissement partagés (monnaie pour l'affichage des montants).
            'settings' => [
                'currency' => $user ? $this->currency() : self::defaultCurrency(),
            ],
        ];
    }

    /**
     * Monnaie de l'établissement (code + symbole) pour le formatage des montants côté front.
     *
     * @return array{code: string, symbol: string}
     */
    private function currency(): array
    {
        $code = School::query()->value('currency') ?: Currencies::DEFAULT;

        return ['code' => $code, 'symbol' => Currencies::symbol($code)];
    }

    /** @return array{code: string, symbol: string} */
    private static function defaultCurrency(): array
    {
        $code = Currencies::DEFAULT;

        return ['code' => $code, 'symbol' => Currencies::symbol($code)];
    }
}
