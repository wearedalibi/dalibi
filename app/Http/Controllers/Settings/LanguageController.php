<?php

namespace App\Http\Controllers\Settings;

use App\Constants\Locales;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LanguageController extends Controller
{
    /**
     * Enregistre la langue préférée sur le profil de l'utilisateur
     * (et en session, pour que le repli invité reste cohérent).
     */
    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'locale' => ['required', 'string', Rule::in(Locales::codes())],
        ]);

        $request->user()?->update(['locale' => $data['locale']]);
        $request->session()->put('locale', $data['locale']);

        return back();
    }
}
