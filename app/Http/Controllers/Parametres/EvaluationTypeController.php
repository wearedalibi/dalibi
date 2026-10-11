<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEvaluationTypeRequest;
use App\Http\Requests\UpdateEvaluationTypeRequest;
use App\Models\EvaluationType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EvaluationTypeController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();

        $query = EvaluationType::query();

        if ($search !== '') {
            $query->where(function ($builder) use ($search): void {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $evaluationTypes = $query
            ->orderBy('name')
            ->paginate(10)
            ->appends($request->query());

        return Inertia::render('Parametres/EvaluationTypes/Index', [
            'evaluationTypes' => $evaluationTypes,
            'filters' => ['search' => $search],
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', EvaluationType::class);

        return Inertia::render('Parametres/EvaluationTypes/Create');
    }

    public function store(StoreEvaluationTypeRequest $request): RedirectResponse
    {
        EvaluationType::create($request->validated());

        return redirect()
            ->route('evaluation-types.index')
            ->with('message', 'Type d\'évaluation créé avec succès.');
    }

    public function show(EvaluationType $evaluationType): Response
    {
        return Inertia::render('Parametres/EvaluationTypes/Show', [
            'evaluationType' => $evaluationType,
        ]);
    }

    public function edit(EvaluationType $evaluationType): Response
    {
        $this->authorize('update', $evaluationType);

        return Inertia::render('Parametres/EvaluationTypes/Edit', [
            'evaluationType' => $evaluationType,
        ]);
    }

    public function update(UpdateEvaluationTypeRequest $request, EvaluationType $evaluationType): RedirectResponse
    {
        $evaluationType->update($request->validated());

        return redirect()
            ->route('evaluation-types.index')
            ->with('message', 'Type d\'évaluation mis à jour avec succès.');
    }

    public function destroy(EvaluationType $evaluationType): RedirectResponse
    {
        $this->authorize('delete', $evaluationType);

        $evaluationType->delete();

        return redirect()
            ->route('evaluation-types.index')
            ->with('message', 'Type d\'évaluation supprimé avec succès.');
    }
}
