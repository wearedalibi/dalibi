<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAcademicYearRequest;
use App\Http\Requests\UpdateAcademicYearRequest;
use App\Jobs\ArchiveAcademicYearJob;
use App\Models\AcademicYear;
use Inertia\Inertia;

class AcademicYearController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $query = AcademicYear::query();
        $search = request('search');

        // Recherche par année
        if ($search) {
            $query->where('year', 'like', "%{$search}%");
        }

        $academicYears = $query->orderBy('start_date', 'desc')->paginate(10)->appends(request()->query());

        return Inertia::render('Parametres/AcademicYears/Index', [
            'academicYears' => $academicYears,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Parametres/AcademicYears/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreAcademicYearRequest $request)
    {
        AcademicYear::create($request->validated());

        return redirect()->route('academic-years.index')
            ->with('message', 'Année académique créée avec succès.');
    }

    /**
     * Display the specified resource.
     */
    public function show(AcademicYear $academicYear)
    {
        return Inertia::render('Parametres/AcademicYears/Show', [
            'academicYear' => $academicYear,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(AcademicYear $academicYear)
    {
        return Inertia::render('Parametres/AcademicYears/Edit', [
            'academicYear' => $academicYear,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateAcademicYearRequest $request, AcademicYear $academicYear)
    {
        $wasActive = (bool) $academicYear->active;

        $academicYear->update($request->validated());

        // Clôture d'année (passage actif → inactif) : archive verrouillée en tâche de fond.
        if ($wasActive && ! $academicYear->fresh()->active) {
            ArchiveAcademicYearJob::dispatch($academicYear->id, $request->user()?->id);

            return redirect()->route('academic-years.index')
                ->with('message', 'Année académique clôturée. Une archive de sauvegarde est en cours de génération.');
        }

        return redirect()->route('academic-years.index')
            ->with('message', 'Année académique mise à jour avec succès.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(AcademicYear $academicYear)
    {
        $academicYear->delete();

        return redirect()->route('academic-years.index')
            ->with('message', 'Année académique supprimée avec succès.');
    }
}
