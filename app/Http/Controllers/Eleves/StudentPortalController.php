<?php

namespace App\Http\Controllers\Eleves;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class StudentPortalController extends Controller
{
    /** Active l'accès portail de l'élève et (re)définit son mot de passe. */
    public function activate(Request $request, Student $student): RedirectResponse
    {
        abort_unless($request->user()->can('edit_students'), 403);

        $data = $request->validate([
            'password' => ['required', 'string', 'min:8'],
        ]);

        $student->forceFill([
            'portal_active' => true,
            'password' => $data['password'],
        ])->save();

        return back()->with('message', "Accès portail activé pour l'élève.");
    }

    /** Désactive l'accès portail et révoque les sessions actives. */
    public function deactivate(Request $request, Student $student): RedirectResponse
    {
        abort_unless($request->user()->can('edit_students'), 403);

        $student->forceFill(['portal_active' => false, 'password' => null])->save();
        $student->tokens()->delete();

        return back()->with('message', 'Accès portail désactivé.');
    }
}
