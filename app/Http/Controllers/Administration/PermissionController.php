<?php

namespace App\Http\Controllers\Administration;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePermissionRequest;
use App\Http\Requests\UpdatePermissionRequest;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    public function index(): Response
    {
        abort_unless(request()->user()->can('manage_roles_permissions'), 403);

        $query = Permission::query();

        if (request('search')) {
            $searchTerm = strtolower(request('search'));
            $query->where(function ($q) use ($searchTerm): void {
                $q->whereRaw('LOWER(name) LIKE ?', ["%{$searchTerm}%"])
                    ->orWhereRaw('LOWER(description) LIKE ?', ["%{$searchTerm}%"]);
            });
        }

        $permissions = $query->withCount('roles')
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Administration/Permissions/Index', [
            'permissions' => $permissions,
            'filters' => ['search' => request('search')],
        ]);
    }

    public function create(): Response
    {
        abort_unless(request()->user()->can('manage_roles_permissions'), 403);

        return Inertia::render('Administration/Permissions/Create');
    }

    public function store(StorePermissionRequest $request): RedirectResponse
    {
        Permission::create($request->validated());

        return redirect()->route('permissions.index')
            ->with('message', 'Permission créée avec succès.');
    }

    public function show(Permission $permission): Response
    {
        abort_unless(request()->user()->can('manage_roles_permissions'), 403);

        $permission->load('roles');

        return Inertia::render('Administration/Permissions/Show', [
            'permission' => $permission,
        ]);
    }

    public function edit(Permission $permission): Response
    {
        abort_unless(request()->user()->can('manage_roles_permissions'), 403);

        return Inertia::render('Administration/Permissions/Edit', [
            'permission' => $permission,
        ]);
    }

    public function update(UpdatePermissionRequest $request, Permission $permission): RedirectResponse
    {
        $permission->update($request->validated());

        return redirect()->route('permissions.index')
            ->with('message', 'Permission mise à jour avec succès.');
    }

    public function destroy(Permission $permission): RedirectResponse
    {
        abort_unless(request()->user()->can('manage_roles_permissions'), 403);

        if ($permission->roles()->exists()) {
            return back()->withErrors([
                'delete' => 'Impossible de supprimer une permission utilisée par des rôles.',
            ]);
        }

        $permission->delete();

        return redirect()->route('permissions.index')
            ->with('message', 'Permission supprimée avec succès.');
    }
}
