<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAcademicPeriodRequest;
use App\Http\Requests\UpdateAcademicPeriodRequest;
use App\Models\AcademicPeriod;
use App\Models\AcademicYear;
use App\Models\ClassroomType;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AcademicPeriodController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $query = AcademicPeriod::with('academicYear');

        // Search by name, description or academic year
        if ($request->filled('search')) {
            $searchTerm = strtolower($request->string('search')->toString());
            $query->where(function ($q) use ($searchTerm): void {
                $q->whereRaw('LOWER(name) LIKE ?', ["%{$searchTerm}%"])
                    ->orWhereRaw('LOWER(description) LIKE ?', ["%{$searchTerm}%"])
                    ->orWhereHas('academicYear', function ($q) use ($searchTerm): void {
                        $q->whereRaw('LOWER(year) LIKE ?', ["%{$searchTerm}%"]);
                    });
            });
        }

        // Filter by type
        if ($request->has('type') && $request->type) {
            $query->where('type', $request->type);
        }

        // Filter by academic year
        if ($request->has('academic_year_id') && $request->academic_year_id) {
            $query->where('academic_year_id', $request->academic_year_id);
        }

        $academicPeriods = $query->orderBy('order', 'asc')
            ->orderBy('start_date', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Parametres/AcademicPeriods/Index', [
            'academicPeriods' => $academicPeriods,
            'filters' => $request->only(['search', 'type', 'academic_year_id']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        $academicYears = AcademicYear::orderBy('start_date', 'desc')->get();

        return Inertia::render('Parametres/AcademicPeriods/Create', [
            'academicYears' => $academicYears,
            'classroomTypes' => ClassroomType::where('active', true)->orderBy('name')->get(['id', 'name', 'period_system']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreAcademicPeriodRequest $request)
    {
        $validated = $request->validated();

        if (! empty($validated['is_current'])) {
            AcademicPeriod::where('academic_year_id', $validated['academic_year_id'])
                ->where('is_current', true)
                ->update(['is_current' => false]);
        }

        AcademicPeriod::create($validated);

        return redirect()->route('academic-periods.index')
            ->with('success', 'Période académique créée avec succès.');
    }

    /**
     * Display the specified resource.
     */
    public function show(AcademicPeriod $academicPeriod): Response
    {
        $academicPeriod->load('academicYear');

        return Inertia::render('Parametres/AcademicPeriods/Show', [
            'academicPeriod' => $academicPeriod,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(AcademicPeriod $academicPeriod): Response
    {
        $academicPeriod->load('academicYear');
        $academicYears = AcademicYear::orderBy('start_date', 'desc')->get();

        return Inertia::render('Parametres/AcademicPeriods/Edit', [
            'academicPeriod' => $academicPeriod,
            'academicYears' => $academicYears,
            'classroomTypes' => ClassroomType::where('active', true)->orderBy('name')->get(['id', 'name', 'period_system']),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateAcademicPeriodRequest $request, AcademicPeriod $academicPeriod)
    {
        $validated = $request->validated();

        if (! empty($validated['is_current'])) {
            AcademicPeriod::where('academic_year_id', $validated['academic_year_id'])
                ->where('id', '!=', $academicPeriod->id)
                ->where('is_current', true)
                ->update(['is_current' => false]);
        }

        $academicPeriod->update($validated);

        return redirect()->route('academic-periods.index')
            ->with('success', 'Période académique mise à jour avec succès.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(AcademicPeriod $academicPeriod)
    {
        $academicPeriod->delete();

        return redirect()->route('academic-periods.index')
            ->with('success', 'Période académique supprimée avec succès.');
    }
}
