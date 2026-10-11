<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClassroomRequest;
use App\Http\Requests\UpdateClassroomRequest;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\ClassroomType;
use Inertia\Inertia;

class ClassroomController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $search = request()->string('search')->toString();

        $query = Classroom::with('type')
            ->when($search, fn ($q) => $q->where(fn ($s) => $s
                ->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%")
            ));

        $classrooms = $query->orderBy('created_at', 'desc')->paginate(15)->withQueryString();
        $activeCount = Classroom::where('active', true)->count();

        return Inertia::render('Parametres/Classrooms/Index', [
            'classrooms' => $classrooms,
            'activeCount' => $activeCount,
            'filters' => ['search' => $search],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $classroomTypes = ClassroomType::select('id', 'name')->where('active', true)->get();

        return Inertia::render('Parametres/Classrooms/Create', [
            'classroomTypes' => $classroomTypes,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreClassroomRequest $request)
    {
        Classroom::create($request->validated());

        return redirect()->route('classrooms.index')
            ->with('message', 'Classe créée avec succès.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Classroom $classroom)
    {
        $classroom->load('type');

        // Get academic years with active first
        $academicYears = AcademicYear::orderBy('active', 'desc')
            ->orderBy('start_date', 'desc')
            ->get(['id', 'year', 'start_date', 'end_date', 'active']);

        // Get all class subjects with subjects and academic year, optimized
        $subjectAssignments = $classroom->classSubjects()
            ->with(['subject:id,name,code', 'academicYear:id,year,active'])
            ->orderBy('academic_year_id')
            ->get()
            ->groupBy('academic_year_id')
            ->map(fn ($items) => $items->map(fn ($assignment) => [
                'id' => $assignment->id,
                'subject' => $assignment->subject,
                'coefficient' => (float) $assignment->coefficient,
                'academic_year' => $assignment->academicYear,
            ])->values())
            ->toArray();

        return Inertia::render('Parametres/Classrooms/Show', [
            'classroom' => $classroom,
            'academicYears' => $academicYears,
            'subjectAssignments' => $subjectAssignments,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Classroom $classroom)
    {
        $classroom->load('type:id,name');
        $classroomTypes = ClassroomType::select('id', 'name')->where('active', true)->get();

        return Inertia::render('Parametres/Classrooms/Edit', [
            'classroom' => $classroom,
            'classroomTypes' => $classroomTypes,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateClassroomRequest $request, Classroom $classroom)
    {
        $classroom->update($request->validated());

        return redirect()->route('classrooms.index')
            ->with('message', 'Classe mise à jour avec succès.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Classroom $classroom)
    {
        $classroom->delete();

        return redirect()->route('classrooms.index')
            ->with('message', 'Classe supprimée avec succès.');
    }
}
