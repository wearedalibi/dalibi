<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClassSubjectRequest;
use App\Http\Requests\UpdateClassSubjectRequest;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\ClassSubject;
use App\Models\Subject;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ClassSubjectController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $query = ClassSubject::query()
            ->with(['class:id,name,code', 'subject:id,name,code', 'academicYear:id,year,start_date,end_date']);

        if (request('search')) {
            $search = request('search');
            $query->where(function ($q) use ($search) {
                $q->whereHas('class', function ($q) use ($search) {
                    $q->where('name', 'ilike', "%{$search}%");
                })
                    ->orWhereHas('subject', function ($q) use ($search) {
                        $q->where('name', 'ilike', "%{$search}%");
                    });
            });
        }

        if (request('class_id')) {
            $query->where('class_id', request('class_id'));
        }

        if (request('academic_year_id')) {
            $query->where('academic_year_id', request('academic_year_id'));
        }

        $classSubjects = $query
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->through(fn ($item) => [
                'id' => $item->id,
                'class_id' => $item->class_id,
                'subject_id' => $item->subject_id,
                'academic_year_id' => $item->academic_year_id,
                'coefficient' => (float) $item->coefficient,
                'created_at' => $item->created_at,
                'class' => $item->class,
                'subject' => $item->subject,
                'academicYear' => $item->academicYear,
            ])
            ->withQueryString();

        return Inertia::render('Parametres/ClassSubjects/Index', [
            'classSubjects' => $classSubjects,
            'filters' => request()->only(['search', 'class_id', 'academic_year_id']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        $classrooms = Classroom::where('active', true)
            ->orderBy('name')
            ->get();
        $subjects = Subject::orderBy('name')->get();
        $academicYears = AcademicYear::where('active', true)
            ->select(['id', 'year', 'start_date', 'end_date'])
            ->orderBy('start_date', 'desc')
            ->get();

        return Inertia::render('Parametres/ClassSubjects/Create', [
            'classrooms' => $classrooms,
            'subjects' => $subjects,
            'academicYears' => $academicYears,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreClassSubjectRequest $request)
    {
        $validated = $request->validated();
        $assignments = $validated['assignments'];

        DB::transaction(function () use ($validated, $assignments): void {
            foreach ($assignments as $assignment) {
                ClassSubject::updateOrCreate([
                    'class_id' => $validated['class_id'],
                    'subject_id' => $assignment['subject_id'],
                    'academic_year_id' => $validated['academic_year_id'],
                ], [
                    'coefficient' => $assignment['coefficient'],
                    'group' => $assignment['group'] ?? 'obligatoire',
                ]);
            }
        });

        return redirect()->route('class-subjects.index')
            ->with('message', 'Matières attribuées à la classe avec succès.');
    }

    /**
     * Display the specified resource.
     */
    public function show(ClassSubject $classSubject): Response
    {
        $classSubject->load(['class', 'subject', 'academicYear', 'grades']);

        return Inertia::render('Parametres/ClassSubjects/Show', [
            'classSubject' => [
                'id' => $classSubject->id,
                'class_id' => $classSubject->class_id,
                'subject_id' => $classSubject->subject_id,
                'academic_year_id' => $classSubject->academic_year_id,
                'coefficient' => (float) $classSubject->coefficient,
                'created_at' => $classSubject->created_at,
                'updated_at' => $classSubject->updated_at,
                'class' => $classSubject->class,
                'subject' => $classSubject->subject,
                'academicYear' => $classSubject->academicYear,
                'grades' => $classSubject->grades,
            ],
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(ClassSubject $classSubject): Response
    {
        $classrooms = Classroom::where('active', true)
            ->orderBy('name')
            ->get();

        // Get all subjects and mark the ones already assigned for this class+year
        $subjects = Subject::orderBy('name')->get();
        $assignedSubjects = ClassSubject::where('class_id', $classSubject->class_id)
            ->where('academic_year_id', $classSubject->academic_year_id)
            ->with('subject:id,name,code')
            ->get()
            ->map(fn ($assignment) => [
                'subject_id' => $assignment->subject_id,
                'coefficient' => (float) $assignment->coefficient,
                'group' => $assignment->group ?? 'obligatoire',
                'subject' => $assignment->subject,
            ])
            ->values();

        $academicYears = AcademicYear::where('active', true)
            ->select(['id', 'year', 'start_date', 'end_date'])
            ->orderBy('start_date', 'desc')
            ->get();

        return Inertia::render('Parametres/ClassSubjects/Edit', [
            'classSubject' => $classSubject,
            'classrooms' => $classrooms,
            'subjects' => $subjects,
            'assignedSubjects' => $assignedSubjects,
            'academicYears' => $academicYears,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateClassSubjectRequest $request, ClassSubject $classSubject)
    {
        $validated = $request->validated();
        $assignments = $validated['assignments'];

        DB::transaction(function () use ($validated, $assignments, $classSubject): void {
            $oldClassId = $classSubject->class_id;
            $oldAcademicYearId = $classSubject->academic_year_id;

            $newClassId = $validated['class_id'];
            $newAcademicYearId = $validated['academic_year_id'];

            ClassSubject::where('class_id', $oldClassId)
                ->where('academic_year_id', $oldAcademicYearId)
                ->delete();

            ClassSubject::where('class_id', $newClassId)
                ->where('academic_year_id', $newAcademicYearId)
                ->delete();

            foreach ($assignments as $assignment) {
                ClassSubject::create([
                    'class_id' => $newClassId,
                    'subject_id' => $assignment['subject_id'],
                    'academic_year_id' => $newAcademicYearId,
                    'coefficient' => $assignment['coefficient'],
                    'group' => $assignment['group'] ?? 'obligatoire',
                ]);
            }
        });

        return redirect()->route('class-subjects.index')
            ->with('message', 'Attribution mise à jour avec succès.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ClassSubject $classSubject)
    {
        $classSubject->delete();

        return redirect()->route('class-subjects.index')
            ->with('message', 'Attribution supprimée avec succès.');
    }
}
