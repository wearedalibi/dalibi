<?php

namespace App\Http\Controllers\Administration;

use App\Constants\Roles;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(): Response
    {
        abort_unless(request()->user()->can('manage_roles_permissions'), 403);

        $query = Role::query();

        if (request('search')) {
            $searchTerm = strtolower(request('search'));
            $query->where(function ($q) use ($searchTerm): void {
                $q->whereRaw('LOWER(name) LIKE ?', ["%{$searchTerm}%"])
                    ->orWhereRaw('LOWER(description) LIKE ?', ["%{$searchTerm}%"]);
            });
        }

        $roles = $query->withCount('permissions')
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Administration/Roles/Index', [
            'roles' => $roles,
            'filters' => ['search' => request('search')],
        ]);
    }

    public function create(): Response
    {
        abort_unless(request()->user()->can('manage_roles_permissions'), 403);

        $permissions = Permission::orderBy('name')->get();

        return Inertia::render('Administration/Roles/Create', [
            'permissions' => $permissions,
        ]);
    }

    public function store(StoreRoleRequest $request): RedirectResponse
    {
        $role = Role::create([
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
        ]);

        if ($request->has('permissions')) {
            $permissionIds = $request->validated('permissions') ?? [];
            $permissions = Permission::whereIn('id', $permissionIds)->pluck('name');
            $role->syncPermissions($permissions);
        }

        return redirect()->route('roles.index')
            ->with('message', 'Rôle créé avec succès.');
    }

    public function show(Role $role): Response
    {
        abort_unless(request()->user()->can('manage_roles_permissions'), 403);

        $role->load('permissions');

        return Inertia::render('Administration/Roles/Show', [
            'role' => $role,
        ]);
    }

    public function edit(Role $role): Response
    {
        abort_unless(request()->user()->can('manage_roles_permissions'), 403);

        $role->load('permissions');
        $permissions = Permission::orderBy('name')->get();

        return Inertia::render('Administration/Roles/Edit', [
            'role' => $role,
            'permissions' => $permissions,
        ]);
    }

    public function update(UpdateRoleRequest $request, Role $role): RedirectResponse
    {
        // Le rôle administrateur est le seul filet de sécurité de l'instance :
        // le renommer ou lui retirer des permissions verrouillerait l'application
        // sans aucun moyen de rétablissement depuis l'interface.
        if ($role->name === Roles::ADMINISTRATOR) {
            return back()->withErrors([
                'role' => "Le rôle administrateur ne peut pas être modifié : il doit conserver l'ensemble des permissions.",
            ]);
        }

        $role->update([
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
        ]);

        $permissionIds = $request->has('permissions') ? ($request->validated('permissions') ?? []) : [];
        $permissions = Permission::whereIn('id', $permissionIds)->pluck('name');
        $role->syncPermissions($permissions);

        return redirect()->route('roles.index')
            ->with('message', 'Rôle mis à jour avec succès.');
    }

    public function destroy(Role $role): RedirectResponse
    {
        abort_unless(request()->user()->can('manage_roles_permissions'), 403);

        if ($role->users()->exists()) {
            return back()->withErrors([
                'delete' => 'Impossible de supprimer un rôle assigné à des utilisateurs.',
            ]);
        }

        $role->delete();

        return redirect()->route('roles.index')
            ->with('message', 'Rôle supprimé avec succès.');
    }
}
