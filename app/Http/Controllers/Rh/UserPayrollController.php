<?php

namespace App\Http\Controllers\Rh;

use App\Constants\ContractTypes;
use App\Http\Controllers\Controller;
use App\Models\EmployeeProfile;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Gère le profil RH / paie directement rattaché à un utilisateur
 * (Administration → Utilisateurs). Un utilisateur = au plus un profil employé.
 */
class UserPayrollController extends Controller
{
    private const PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CHEQUE'];

    private const STATUSES = ['active', 'suspended', 'terminated'];

    /** Crée ou met à jour le profil paie de l'utilisateur. */
    public function update(Request $request, User $user): RedirectResponse
    {
        $profile = $user->employeeProfile;

        $data = $request->validate([
            'employee_number' => ['nullable', 'string', 'max:50', Rule::unique('employee_profiles', 'employee_number')->ignore($profile?->id)],
            'job_title' => ['required', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'contract_type' => ['required', Rule::in(ContractTypes::keys())],
            'salary_grade_id' => ['nullable', 'uuid', 'exists:salary_grades,id'],
            'hire_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:hire_date'],
            // Repli si l'employé n'est pas (encore) rattaché à une grille.
            'base_salary' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'payment_method' => ['required', Rule::in(self::PAYMENT_METHODS)],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'bank_account' => ['nullable', 'string', 'max:255'],
            'momo_number' => ['nullable', 'string', 'max:50'],
            'cnss_number' => ['nullable', 'string', 'max:50'],
            'status' => ['required', Rule::in(self::STATUSES)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ], [
            'job_title.required' => 'Le poste est obligatoire.',
            'base_salary.required' => 'Le salaire de base est obligatoire.',
        ]);

        $data['employee_number'] = ($data['employee_number'] ?? null) ?: ($profile?->employee_number ?: $this->generateNumber());
        $data['base_salary'] = $data['base_salary'] ?? 0; // colonne non nullable ; la grille prime au calcul

        $user->employeeProfile()->updateOrCreate(['user_id' => $user->id], $data);

        return back()->with('success', 'Profil paie enregistré.');
    }

    /** Retire l'utilisateur de la paie (supprime son profil), sauf s'il a des bulletins. */
    public function destroy(User $user): RedirectResponse
    {
        $profile = $user->employeeProfile;

        if (! $profile) {
            return back();
        }

        if ($profile->payslips()->exists()) {
            return back()->withErrors(['payroll' => 'Impossible de retirer : cet employé a des bulletins de paie.']);
        }

        $profile->delete();

        return back()->with('success', 'Profil paie supprimé.');
    }

    private function generateNumber(): string
    {
        do {
            $number = 'EMP-'.Str::upper(Str::random(5));
        } while (EmployeeProfile::where('employee_number', $number)->exists());

        return $number;
    }
}
