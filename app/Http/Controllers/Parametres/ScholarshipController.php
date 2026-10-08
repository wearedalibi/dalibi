<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreScholarshipRequest;
use App\Http\Requests\UpdateScholarshipRequest;
use App\Models\Scholarship;
use Inertia\Inertia;
use Inertia\Response;

class ScholarshipController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $query = Scholarship::query();
        $search = request('search');

        if ($search) {
            $searchTerm = strtolower($search);
            $query->where(function ($q) use ($searchTerm) {
                $q->whereRaw('LOWER(name) LIKE ?', ["%{$searchTerm}%"])
                    ->orWhereRaw('LOWER(description) LIKE ?', ["%{$searchTerm}%"])
                    ->orWhereRaw('LOWER(type) LIKE ?', ["%{$searchTerm}%"]);
            });
        }

        $scholarships = $query
            ->orderBy('name')
            ->paginate(10)
            ->appends(request()->query());

        return Inertia::render('Parametres/Scholarships/Index', [
            'scholarships' => $scholarships,
            'filters' => ['search' => $search],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        return Inertia::render('Parametres/Scholarships/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreScholarshipRequest $request)
    {
        Scholarship::create($request->validated());

        return redirect()->route('scholarships.index')
            ->with('message', 'Bourse créée avec succès.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Scholarship $scholarship): Response
    {
        return Inertia::render('Parametres/Scholarships/Show', [
            'scholarship' => $scholarship,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Scholarship $scholarship): Response
    {
        return Inertia::render('Parametres/Scholarships/Edit', [
            'scholarship' => $scholarship,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateScholarshipRequest $request, Scholarship $scholarship)
    {
        $scholarship->update($request->validated());

        return redirect()->route('scholarships.index')
            ->with('message', 'Bourse mise à jour avec succès.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Scholarship $scholarship)
    {
        $scholarship->delete();

        return redirect()->route('scholarships.index')
            ->with('message', 'Bourse supprimée avec succès.');
    }
}
