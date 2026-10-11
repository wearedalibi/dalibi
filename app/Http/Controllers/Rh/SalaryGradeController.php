<?php

namespace App\Http\Controllers\Rh;

use App\Http\Controllers\Controller;
use App\Models\EmployeeProfile;
use App\Models\PayrollSetting;
use App\Models\SalaryGrade;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SalaryGradeController extends Controller
{
    public function index(Request $request): Response
    {
        $perPage = in_array((int) $request->per_page, [10, 25, 50, 100], true) ? (int) $request->per_page : 25;

        $grades = SalaryGrade::withCount('employeeProfiles')
            ->when($request->search, function ($q) use ($request) {
                $term = '%'.$request->search.'%';
                $q->where(fn ($s) => $s->where('name', 'like', $term)->orWhere('category', 'like', $term));
            })
            ->when($request->status === 'active', fn ($q) => $q->where('active', true))
            ->when($request->status === 'inactive', fn ($q) => $q->where('active', false))
            ->orderBy('sort_order')->orderBy('category')->orderBy('echelon')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Rh/SalaryGrades/Index', [
            'grades' => $grades,
            'perPage' => $perPage,
            'filters' => $request->only(['search', 'status']),
            'settings' => PayrollSetting::current(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Rh/SalaryGrades/Create');
    }

    public function edit(SalaryGrade $salaryGrade): Response
    {
        return Inertia::render('Rh/SalaryGrades/Edit', ['grade' => $salaryGrade]);
    }

    public function store(Request $request): RedirectResponse
    {
        SalaryGrade::create($this->validateData($request));

        return redirect()->route('salary-grades.index')->with('success', 'Grille créée.');
    }

    public function update(Request $request, SalaryGrade $salaryGrade): RedirectResponse
    {
        $salaryGrade->update($this->validateData($request));

        return redirect()->route('salary-grades.index')->with('success', 'Grille mise à jour.');
    }

    public function destroy(SalaryGrade $salaryGrade): RedirectResponse
    {
        if ($salaryGrade->employeeProfiles()->exists()) {
            return back()->withErrors(['delete' => 'Impossible : des employés sont rattachés à cette grille.']);
        }

        $salaryGrade->delete();

        return back()->with('success', 'Grille supprimée.');
    }

    /** Page d'affectation groupée d'employés à cette grille. */
    public function employees(SalaryGrade $salaryGrade): Response
    {
        $employees = EmployeeProfile::with(['user:id,firstname,lastname', 'salaryGrade:id,name'])
            ->where('status', 'active')
            ->get()
            ->map(fn (EmployeeProfile $e) => [
                'id' => $e->id,
                'name' => $e->fullName() ?: '—',
                'job_title' => $e->job_title,
                'current_grade' => $e->salaryGrade ? ['id' => $e->salaryGrade->id, 'name' => $e->salaryGrade->name] : null,
            ])
            ->sortBy('name')
            ->values();

        return Inertia::render('Rh/SalaryGrades/Employees', [
            'grade' => $salaryGrade->only(['id', 'name', 'base_amount']),
            'employees' => $employees,
            'assignedIds' => EmployeeProfile::where('salary_grade_id', $salaryGrade->id)->pluck('id'),
        ]);
    }

    /** Rattache les employés sélectionnés à la grille et détache les autres. */
    public function syncEmployees(Request $request, SalaryGrade $salaryGrade): RedirectResponse
    {
        $data = $request->validate([
            'employee_ids' => ['array'],
            'employee_ids.*' => ['uuid', 'exists:employee_profiles,id'],
        ]);
        $ids = $data['employee_ids'] ?? [];

        DB::transaction(function () use ($ids, $salaryGrade): void {
            // Détache ceux qui étaient sur cette grille mais ne sont plus cochés.
            $detach = EmployeeProfile::where('salary_grade_id', $salaryGrade->id);
            if (! empty($ids)) {
                $detach->whereNotIn('id', $ids);
            }
            $detach->update(['salary_grade_id' => null]);

            // Rattache les cochés (les déplace depuis une autre grille au besoin).
            if (! empty($ids)) {
                EmployeeProfile::whereIn('id', $ids)->update(['salary_grade_id' => $salaryGrade->id]);
            }
        });

        return redirect()->route('salary-grades.index')->with('success', 'Affectations mises à jour.');
    }

    /** Met à jour la règle d'ancienneté (réglages de paie). */
    public function updateSettings(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'seniority_enabled' => ['required', 'boolean'],
            'seniority_rate_per_year' => ['required', 'numeric', 'min:0', 'max:100'],
            'seniority_cap_percent' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        PayrollSetting::current()->update($data);

        return back()->with('success', 'Réglage d\'ancienneté mis à jour.');
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:50'],
            'echelon' => ['nullable', 'integer', 'min:0', 'max:100'],
            'base_amount' => ['required', 'numeric', 'min:0', 'max:999999999'],
            'active' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ], [
            'name.required' => 'Le nom de la grille est obligatoire.',
            'base_amount.required' => 'Le salaire de base est obligatoire.',
        ]);
    }
}
