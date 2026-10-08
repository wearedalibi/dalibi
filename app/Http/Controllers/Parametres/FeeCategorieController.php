<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFeeCategorieRequest;
use App\Http\Requests\UpdateFeeCategorieRequest;
use App\Models\FeeCategorie;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FeeCategorieController extends Controller
{
    public function index(Request $request): Response
    {
        $query = FeeCategorie::query();

        if ($request->filled('search')) {
            $searchTerm = strtolower($request->string('search')->toString());
            $query->whereRaw('LOWER(name) LIKE ?', ["%{$searchTerm}%"])
                ->orWhereRaw('LOWER(description) LIKE ?', ["%{$searchTerm}%"]);
        }

        $feeCategories = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('Parametres/FeeCategories/Index', [
            'feeCategories' => $feeCategories,
            'filters' => $request->only(['search']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Parametres/FeeCategories/Create');
    }

    public function store(StoreFeeCategorieRequest $request): RedirectResponse
    {
        $feeCategorie = FeeCategorie::create($request->validated());

        return redirect()->route('fee-categories.show', $feeCategorie->id)
            ->with('success', 'Catégorie de frais créée avec succès.');
    }

    public function show(FeeCategorie $feeCategorie): Response
    {
        return Inertia::render('Parametres/FeeCategories/Show', [
            'feeCategorie' => $feeCategorie,
        ]);
    }

    public function edit(FeeCategorie $feeCategorie): Response
    {
        return Inertia::render('Parametres/FeeCategories/Edit', [
            'feeCategorie' => $feeCategorie,
        ]);
    }

    public function update(UpdateFeeCategorieRequest $request, FeeCategorie $feeCategorie): RedirectResponse
    {
        $feeCategorie->update($request->validated());

        return redirect()->route('fee-categories.index')
            ->with('success', 'Catégorie de frais mise à jour avec succès.');
    }

    public function destroy(FeeCategorie $feeCategorie): RedirectResponse
    {
        $feeCategorie->delete();

        return redirect()->route('fee-categories.index')
            ->with('success', 'Catégorie de frais supprimée avec succès.');
    }
}
