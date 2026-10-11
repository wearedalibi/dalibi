<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClassSubjectRequest;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\ClassSubject;
use App\Models\Subject;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ClassroomSubjectAssignmentController extends Controller
{
    /**
     * Show the class subject assignment management form.
     */
    public function create(Classroom $classroom): Response
    {
        $subjects = Subject::orderBy('name')->get(['id', 'name', 'code']);

        $academicYears = AcademicYear::where('active', true)
            ->select(['id', 'year', 'start_date', 'end_date'])
            ->orderBy('start_date', 'desc')
            ->get();

        $existingAssignmentsByYear = ClassSubject::query()
            ->where('class_id', $classroom->id)
            ->with('subject:id,name,code')
            ->get()
            ->groupBy('academic_year_id')
            ->map(fn ($items) => $items->map(fn ($assignment) => [
                'subject_id' => $assignment->subject_id,
                'coefficient' => (float) $assignment->coefficient,
                'subject' => $assignment->subject,
            ])->values())
            ->toArray();

        return Inertia::render('Parametres/Classrooms/SubjectAssignments', [
            'classroom' => $classroom->only(['id', 'name', 'code']),
            'subjects' => $subjects,
            'academicYears' => $academicYears,
            'existingAssignmentsByYear' => $existingAssignmentsByYear,
        ]);
    }

    /**
     * Store class subject assignments for a given class and academic year.
     */
    public function store(StoreClassSubjectRequest $request, Classroom $classroom)
    {
        $validated = $request->validated();
        $assignments = $validated['assignments'];
        $academicYearId = $validated['academic_year_id'];

        DB::transaction(function () use ($classroom, $assignments, $academicYearId): void {
            ClassSubject::where('class_id', $classroom->id)
                ->where('academic_year_id', $academicYearId)
                ->delete();

            foreach ($assignments as $assignment) {
                ClassSubject::create([
                    'class_id' => $classroom->id,
                    'subject_id' => $assignment['subject_id'],
                    'academic_year_id' => $academicYearId,
                    'coefficient' => $assignment['coefficient'],
                ]);
            }
        });

        return redirect()
            ->route('classrooms.index')
            ->with('message', 'Attributions enregistrées avec succès.');
    }
}
