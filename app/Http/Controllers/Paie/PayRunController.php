<?php

namespace App\Http\Controllers\Paie;

use App\Http\Controllers\Controller;
use App\Models\CashAccount;
use App\Models\EmployeeProfile;
use App\Models\PayRun;
use App\Models\Payslip;
use App\Models\SalaryComponent;
use App\Services\PayrollService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PayRunController extends Controller
{
    public function __construct(private readonly PayrollService $payroll) {}

    public function index(Request $request): Response
    {
        $perPage = in_array((int) $request->per_page, [10, 25, 50, 100], true) ? (int) $request->per_page : 25;

        $payRuns = PayRun::query()
            ->withCount('payslips')
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->period_year, fn ($q) => $q->where('period_year', $request->period_year))
            ->when($request->period_month, fn ($q) => $q->where('period_month', $request->period_month))
            ->when($request->search, function ($q) use ($request) {
                $term = '%'.$request->search.'%';
                $q->where(fn ($s) => $s->where('reference', 'like', $term)->orWhere('label', 'like', $term));
            })
            ->orderByDesc('period_year')
            ->orderByDesc('period_month')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Paie/PayRuns/Index', [
            'payRuns' => $payRuns,
            'years' => PayRun::query()->select('period_year')->distinct()->orderByDesc('period_year')->pluck('period_year'),
            'perPage' => $perPage,
            'canDelete' => $request->user()->can('delete_payroll'),
            'filters' => $request->only(['status', 'period_year', 'period_month', 'search']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Paie/PayRuns/Create', [
            'activeEmployees' => EmployeeProfile::where('status', 'active')->count(),
            'defaultComponents' => SalaryComponent::where('active', true)->where('is_default', true)->count(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'period_month' => ['required', 'integer', 'between:1,12'],
            'period_year' => ['required', 'integer', 'between:2000,2100'],
            'label' => ['nullable', 'string', 'max:255'],
        ]);

        $run = $this->payroll->generate((int) $data['period_month'], (int) $data['period_year'], $data['label'] ?? null);

        return redirect()->route('pay-runs.show', $run->id)->with('success', 'Cycle de paie généré.');
    }

    public function show(Request $request, PayRun $payRun): Response
    {
        $payRun->load('cashAccount:id,name,type');

        $payslips = $payRun->payslips()
            ->with('employeeProfile.user:id,firstname,lastname')
            ->join('employee_profiles', 'employee_profiles.id', '=', 'payslips.employee_profile_id')
            ->join('users', 'users.id', '=', 'employee_profiles.user_id')
            ->when($request->search, function ($q) use ($request) {
                $term = '%'.$request->search.'%';
                $q->where(fn ($s) => $s->where('users.firstname', 'like', $term)
                    ->orWhere('users.lastname', 'like', $term)
                    ->orWhere('payslips.reference', 'like', $term));
            })
            ->orderBy('users.firstname')->orderBy('users.lastname')
            ->select('payslips.*')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Paie/PayRuns/Show', [
            'payRun' => $payRun,
            'payslips' => $payslips,
            'filters' => $request->only('search'),
            'canDelete' => $request->user()->can('delete_payroll'),
            'cashAccounts' => CashAccount::where('active', true)->orderBy('type')->orderBy('name')->get(['id', 'name', 'type', 'balance']),
            'components' => SalaryComponent::where('active', true)->orderBy('type')->orderBy('sort_order')->get(['id', 'name', 'code', 'type', 'default_amount']),
        ]);
    }

    /** Met à jour les lignes d'un bulletin (cycle en brouillon uniquement). */
    public function updatePayslip(Request $request, Payslip $payslip): RedirectResponse
    {
        $data = $request->validate([
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.label' => ['required', 'string', 'max:255'],
            'lines.*.type' => ['required', Rule::in([SalaryComponent::EARNING, SalaryComponent::DEDUCTION])],
            'lines.*.amount' => ['required', 'numeric', 'min:0', 'max:999999999'],
            'lines.*.code' => ['nullable', 'string', 'max:50'],
        ]);

        $this->payroll->updatePayslipLines($payslip, $data['lines']);

        return back()->with('success', 'Bulletin mis à jour.');
    }

    public function validateRun(PayRun $payRun): RedirectResponse
    {
        $this->payroll->validate($payRun);

        return back()->with('success', 'Cycle validé.');
    }

    public function pay(Request $request, PayRun $payRun): RedirectResponse
    {
        $data = $request->validate([
            'cash_account_id' => ['required', 'uuid', 'exists:cash_accounts,id'],
        ], [
            'cash_account_id.required' => 'Sélectionnez la caisse de décaissement.',
        ]);

        $this->payroll->pay($payRun, $data['cash_account_id']);

        return back()->with('success', 'Paie décaissée et enregistrée en comptabilité.');
    }

    public function cancel(PayRun $payRun): RedirectResponse
    {
        $this->payroll->cancel($payRun);

        return back()->with('success', 'Cycle annulé (caisse recréditée si nécessaire).');
    }

    public function destroy(PayRun $payRun): RedirectResponse
    {
        $this->payroll->delete($payRun);

        return redirect()->route('pay-runs.index')->with('success', 'Cycle de paie supprimé.');
    }
}
