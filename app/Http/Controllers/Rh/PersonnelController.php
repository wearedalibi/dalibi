<?php

namespace App\Http\Controllers\Rh;

use App\Constants\ContractTypes;
use App\Http\Controllers\Controller;
use App\Models\EmployeeProfile;
use App\Models\PayRun;
use App\Models\SalaryGrade;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Hub du module Personnel & Paie : liste du personnel (orientée paie) avec
 * assignation de grille en ligne, et vue d'ensemble.
 */
class PersonnelController extends Controller
{
    private const PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CHEQUE'];

    private const STATUSES = ['active', 'suspended', 'terminated'];

    public function index(Request $request): Response
    {
        $perPage = in_array((int) $request->per_page, [10, 25, 50, 100], true) ? (int) $request->per_page : 25;

        $employees = EmployeeProfile::query()
            ->with(['user:id,firstname,lastname,email', 'salaryGrade:id,name,base_amount'])
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->salary_grade_id, fn ($q) => $q->where('salary_grade_id', $request->salary_grade_id))
            ->when($request->boolean('ungraded'), fn ($q) => $q->whereNull('salary_grade_id'))
            ->when($request->search, function ($q) use ($request) {
                $term = '%'.$request->search.'%';
                $q->where(fn ($sub) => $sub
                    ->where('job_title', 'like', $term)
                    ->orWhere('employee_number', 'like', $term)
                    ->orWhereHas('user', fn ($u) => $u->where('firstname', 'like', $term)->orWhere('lastname', 'like', $term)));
            })
            ->join('users', 'users.id', '=', 'employee_profiles.user_id')
            ->orderBy('users.firstname')->orderBy('users.lastname')
            ->select('employee_profiles.*')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (EmployeeProfile $e) => [
                'id' => $e->id,
                'name' => $e->fullName() ?: '—',
                'user_id' => $e->user_id,
                'employee_number' => $e->employee_number,
                'job_title' => $e->job_title,
                'status' => $e->status,
                'salary_grade_id' => $e->salary_grade_id,
                'effective_base' => $e->effectiveBaseSalary(),
            ]);

        return Inertia::render('Rh/Personnel/Index', [
            'employees' => $employees,
            'salaryGrades' => SalaryGrade::where('active', true)->orderBy('sort_order')->orderBy('category')->get(['id', 'name', 'base_amount']),
            'ungradedCount' => EmployeeProfile::where('status', 'active')->whereNull('salary_grade_id')->count(),
            'assignableUsers' => User::whereDoesntHave('employeeProfile')->orderBy('firstname')->get(['id', 'firstname', 'lastname'])
                ->map(fn ($u) => ['id' => $u->id, 'name' => trim($u->firstname.' '.$u->lastname)]),
            'contractTypes' => ContractTypes::options(),
            'canManage' => $request->user()->can('edit_employees'),
            'perPage' => $perPage,
            'filters' => $request->only(['status', 'salary_grade_id', 'ungraded', 'search']),
        ]);
    }

    /** Vue d'ensemble du module. */
    public function overview(): Response
    {
        $active = EmployeeProfile::with('salaryGrade:id,base_amount')->where('status', 'active')->get();

        $monthlyBase = $active->sum(fn (EmployeeProfile $e) => $e->effectiveBaseSalary());

        $lastRun = PayRun::orderByDesc('period_year')->orderByDesc('period_month')->first();

        return Inertia::render('Rh/Personnel/Overview', [
            'stats' => [
                'active' => $active->count(),
                'ungraded' => $active->whereNull('salary_grade_id')->count(),
                'grades' => SalaryGrade::where('active', true)->count(),
                'monthly_base' => (float) $monthlyBase,
            ],
            'lastRun' => $lastRun ? [
                'id' => $lastRun->id,
                'period_label' => $lastRun->periodLabel(),
                'status' => $lastRun->status,
                'total_net' => $lastRun->total_net,
            ] : null,
        ]);
    }

    /** Ajoute un utilisateur au personnel (crée son profil paie minimal). */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'uuid', 'exists:users,id', Rule::unique('employee_profiles', 'user_id')],
            'job_title' => ['required', 'string', 'max:255'],
            'contract_type' => ['required', Rule::in(ContractTypes::keys())],
            'salary_grade_id' => ['nullable', 'uuid', 'exists:salary_grades,id'],
            'base_salary' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'payment_method' => ['required', Rule::in(self::PAYMENT_METHODS)],
            'status' => ['required', Rule::in(self::STATUSES)],
        ], [
            'user_id.required' => 'Sélectionnez l\'utilisateur.',
            'user_id.unique' => 'Cet utilisateur est déjà dans le personnel.',
            'job_title.required' => 'Le poste est obligatoire.',
        ]);

        $data['base_salary'] = $data['base_salary'] ?? 0;
        $data['employee_number'] = $this->generateNumber();

        EmployeeProfile::create($data);

        return back()->with('success', 'Employé ajouté au personnel.');
    }

    /** Assignation de grille en ligne (ou détachement si null). */
    public function assignGrade(Request $request, EmployeeProfile $employee): RedirectResponse
    {
        $data = $request->validate([
            'salary_grade_id' => ['nullable', 'uuid', 'exists:salary_grades,id'],
        ]);

        $employee->update(['salary_grade_id' => $data['salary_grade_id'] ?? null]);

        return back()->with('success', 'Grille mise à jour.');
    }

    private function generateNumber(): string
    {
        do {
            $number = 'EMP-'.Str::upper(Str::random(5));
        } while (EmployeeProfile::where('employee_number', $number)->exists());

        return $number;
    }
}
