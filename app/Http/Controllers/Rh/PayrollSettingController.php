<?php

namespace App\Http\Controllers\Rh;

use App\Http\Controllers\Controller;
use App\Models\PayrollSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Réglages de paie (singleton) : ancienneté, CNSS, ITS.
 */
class PayrollSettingController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Rh/PayrollSettings/Edit', [
            'settings' => PayrollSetting::current(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'seniority_enabled' => ['required', 'boolean'],
            'seniority_rate_per_year' => ['required', 'numeric', 'min:0', 'max:100'],
            'seniority_cap_percent' => ['required', 'numeric', 'min:0', 'max:100'],

            'cnss_enabled' => ['required', 'boolean'],
            'cnss_employee_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'cnss_employer_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'cnss_ceiling' => ['required', 'numeric', 'min:0', 'max:99999999'],

            'its_enabled' => ['required', 'boolean'],
            'its_brackets' => ['nullable', 'array'],
            'its_brackets.*.up_to' => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'its_brackets.*.rate' => ['required_with:its_brackets', 'numeric', 'min:0', 'max:100'],
        ], [
            'its_brackets.*.rate.required_with' => 'Le taux de chaque tranche est obligatoire.',
        ]);

        // Normalise les tranches : up_to numérique ou null, triées croissant.
        if (! empty($data['its_brackets'])) {
            $data['its_brackets'] = collect($data['its_brackets'])
                ->map(fn ($b) => [
                    'up_to' => ($b['up_to'] ?? null) === null || $b['up_to'] === '' ? null : (float) $b['up_to'],
                    'rate' => (float) $b['rate'],
                ])
                ->sortBy(fn ($b) => $b['up_to'] ?? INF)
                ->values()
                ->all();
        }

        PayrollSetting::current()->update($data);

        return back()->with('success', 'Réglages de paie enregistrés.');
    }
}
