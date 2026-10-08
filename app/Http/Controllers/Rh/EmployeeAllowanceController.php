<?php

namespace App\Http\Controllers\Rh;

use App\Http\Controllers\Controller;
use App\Models\EmployeeAllowance;
use App\Models\SalaryComponent;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Primes / retenues récurrentes propres à un employé, tracées (motif + auteur).
 * Rattachées via l'utilisateur (fiche Administration → Utilisateurs).
 */
class EmployeeAllowanceController extends Controller
{
    public function store(Request $request, User $user): RedirectResponse
    {
        $profile = $user->employeeProfile;
        if (! $profile) {
            return back()->withErrors(['allowance' => 'Créez d\'abord le profil paie de cet utilisateur.']);
        }

        $data = $request->validate([
            'type' => ['required', Rule::in([SalaryComponent::EARNING, SalaryComponent::DEDUCTION])],
            'label' => ['required', 'string', 'max:255'],
            'mode' => ['required', Rule::in([EmployeeAllowance::MODE_FIXED, EmployeeAllowance::MODE_PERCENT_BASE])],
            'amount' => ['required', 'numeric', 'min:0', 'max:999999999'],
            'reason' => ['nullable', 'string', 'max:255'],
            'starts_on' => ['nullable', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
        ], [
            'label.required' => 'Le libellé est obligatoire.',
            'amount.required' => 'Le montant est obligatoire.',
        ]);

        $data['employee_profile_id'] = $profile->id;
        $data['active'] = true;
        $data['created_by'] = auth()->id();

        EmployeeAllowance::create($data);

        return back()->with('success', 'Prime / retenue ajoutée.');
    }

    public function destroy(EmployeeAllowance $allowance): RedirectResponse
    {
        $allowance->delete();

        return back()->with('success', 'Prime / retenue supprimée.');
    }
}
