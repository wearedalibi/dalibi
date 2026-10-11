<?php

namespace App\Http\Controllers\Administration;

use App\Constants\ContractTypes;
use App\Constants\Roles;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\AcademicYear;
use App\Models\SalaryGrade;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(): Response
    {
        $query = User::query()->with('roles');
        $roles = Role::select('id', 'name')->orderBy('name')->get();

        $search = request('search');
        $roleId = request('role');
        $gender = request('gender');

        $normalizedGender = match ($gender) {
            'M' => 'male',
            'F' => 'female',
            'O' => 'other',
            default => $gender,
        };

        if ($search) {
            $searchTerm = strtolower($search);
            $query->where(function ($q) use ($searchTerm): void {
                $q->whereRaw('LOWER(firstname) LIKE ?', ["%{$searchTerm}%"])
                    ->orWhereRaw('LOWER(lastname)  LIKE ?', ["%{$searchTerm}%"])
                    ->orWhereRaw('LOWER(email)     LIKE ?', ["%{$searchTerm}%"])
                    ->orWhereRaw('LOWER(natricule) LIKE ?', ["%{$searchTerm}%"]);
            });
        }

        if ($roleId) {
            $query->whereHas('roles', fn ($q) => $q->where('roles.id', $roleId));
        }

        if ($normalizedGender) {
            $query->where('gender', $normalizedGender);
        }

        $perPage = in_array((int) request('per_page'), [10, 25, 50, 100], true)
            ? (int) request('per_page') : 25;

        $users = $query->orderBy('created_at', 'desc')->paginate($perPage)->withQueryString();

        return Inertia::render('Administration/Users/Index', [
            'users' => $users,
            'roles' => $roles,
            'perPage' => $perPage,
            'filters' => [
                'search' => $search,
                'role' => $roleId,
                'gender' => $normalizedGender,
                'per_page' => request('per_page'),
            ],
        ]);
    }

    public function create(): Response
    {
        $roles = Role::orderBy('name')->get();

        return Inertia::render('Administration/Users/Create', [
            'roles' => $roles,
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $user = User::create([
            'firstname' => $request->validated('firstname'),
            'lastname' => $request->validated('lastname'),
            'email' => $request->validated('email'),
            'password' => Hash::make($request->validated('password')),
            'gender' => $request->validated('gender'),
            'birth_date' => $request->validated('birth_date'),
            'telephone' => $request->validated('telephone'),
            'address' => $request->validated('address'),
            'profile' => $request->validated('profile'),
        ]);

        if ($request->has('roles') && auth()->user()->can('manage_roles_permissions')) {
            $roleIds = $request->validated('roles');
            $roles = Role::whereIn('id', $roleIds)->pluck('name');
            $user->syncRoles($roles);
        }

        return redirect()->route('users.index')
            ->with('message', 'Utilisateur créé avec succès.');
    }

    public function show(User $user): Response
    {
        $activeYear = AcademicYear::where('active', true)->first(['id', 'year']);
        $activeYearId = $activeYear?->id;

        $user->load([
            'roles.permissions',
            'employeeProfile.salaryGrade:id,name,base_amount',
            'employeeProfile.allowances' => fn ($q) => $q->orderByDesc('created_at'),
            'employeeProfile.allowances.createdBy:id,firstname,lastname',
            'employeeProfile.payslips' => fn ($q) => $q->orderByDesc('created_at')->limit(6),
            'employeeProfile.payslips.payRun:id,reference,period_month,period_year,status',
            // Affectations matières de l'année active (enseignant)
            'subjectAssignments' => fn ($q) => $q->when($activeYearId, fn ($sub) => $sub->where('academic_year_id', $activeYearId)),
            'subjectAssignments.subject:id,name',
            'subjectAssignments.classroom:id,name',
            'subjectAssignments.academicYear:id,year',
            // Emploi du temps de l'année active (enseignant)
            'timetableSlots' => fn ($q) => $q->when($activeYearId, fn ($sub) => $sub->where('academic_year_id', $activeYearId))
                ->orderBy('day_of_week')->orderBy('start_time'),
            'timetableSlots.subject:id,name',
            'timetableSlots.classroom:id,name',
        ]);

        return Inertia::render('Administration/Users/Show', [
            'user' => $user,
            'activeYear' => $activeYear?->year,
            'contractTypes' => ContractTypes::options(),
            'salaryGrades' => SalaryGrade::where('active', true)->orderBy('sort_order')->orderBy('category')->get(['id', 'name', 'base_amount']),
            'canManagePayroll' => auth()->user()->can('edit_employees'),
        ]);
    }

    public function edit(User $user): Response
    {
        $user->load('roles');
        $roles = Role::orderBy('name')->get();

        return Inertia::render('Administration/Users/Edit', [
            'user' => $user,
            'roles' => $roles,
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        // `edit_users` est détenu par le Secrétariat et la Direction. Sans ce garde-fou,
        // ils pourraient réinitialiser le mot de passe d'un administrateur et prendre
        // sa place : on aligne `update` sur la protection déjà appliquée à `destroy`.
        if ($user->hasRole(Roles::ADMINISTRATOR) && ! auth()->user()->hasRole(Roles::ADMINISTRATOR)) {
            abort(403, 'Seul un administrateur peut modifier un compte administrateur.');
        }

        $data = [
            'firstname' => $request->validated('firstname'),
            'lastname' => $request->validated('lastname'),
            'email' => $request->validated('email'),
            'gender' => $request->validated('gender'),
            'birth_date' => $request->validated('birth_date'),
            'telephone' => $request->validated('telephone'),
            'address' => $request->validated('address'),
            'profile' => $request->validated('profile'),
        ];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->validated('password'));

            // Mot de passe défini par un tiers : son titulaire doit en choisir un
            // lui-même à la prochaine connexion (l'administrateur ne doit pas
            // conserver un mot de passe qu'il connaît).
            if ($user->id !== auth()->id()) {
                $data['must_change_password'] = true;
            }
        }

        $user->update($data);

        if (auth()->user()->can('manage_roles_permissions')) {
            $roleIds = $request->has('roles') ? ($request->validated('roles') ?? []) : [];
            $roles = Role::whereIn('id', $roleIds)->pluck('name');
            $user->syncRoles($roles);
        }

        return redirect()->route('users.index')
            ->with('message', 'Utilisateur mis à jour avec succès.');
    }

    public function destroy(User $user): RedirectResponse
    {
        abort_unless(auth()->user()->can('delete_users'), 403);

        if ($user->id === auth()->id()) {
            return back()->withErrors(['delete' => 'Vous ne pouvez pas supprimer votre propre compte.']);
        }

        if ($user->hasRole(Roles::ADMINISTRATOR) && ! auth()->user()->hasRole(Roles::ADMINISTRATOR)) {
            return back()->withErrors(['delete' => 'Seul un administrateur peut supprimer un compte administrateur.']);
        }

        $user->delete();

        return redirect()->route('users.index')
            ->with('message', 'Utilisateur supprimé avec succès.');
    }
}
