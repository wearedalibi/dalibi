<?php

namespace App\Http\Controllers\Administration;
use App\Http\Controllers\Controller;

use App\Http\Requests\StoreSubjectAssignmentRequest;
use App\Http\Requests\UpdateSubjectAssignmentRequest;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\School;
use App\Models\Subject;
use App\Models\SubjectAssignment;
use App\Models\User;
use App\Services\DocumentRenderer;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SubjectAssignmentController extends Controller
{
    public function index(Request $request): Response
    {
        $query = SubjectAssignment::with(['subject', 'teacher', 'academicYear', 'classroom']);

        if ($request->filled('search')) {
            $searchTerm = strtolower($request->search);
            $query->where(function ($q) use ($searchTerm): void {
                $q->whereHas('subject', fn ($q) =>
                    $q->whereRaw('LOWER(name) LIKE ?', ["%{$searchTerm}%"])
                )
                ->orWhereHas('teacher', fn ($q) =>
                    $q->whereRaw('LOWER(firstname) LIKE ?', ["%{$searchTerm}%"])
                      ->orWhereRaw('LOWER(lastname)  LIKE ?', ["%{$searchTerm}%"])
                )
                ->orWhereHas('classroom', fn ($q) =>
                    $q->whereRaw('LOWER(name) LIKE ?', ["%{$searchTerm}%"])
                );
            });
        }

        if ($request->has('active') && $request->active !== null) {
            $query->where('active', $request->active === 'true');
        }

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->class_id);
        }

        // Filtre année : par défaut sur l'année active tant qu'aucun paramètre n'est
        // fourni. Un paramètre vide (« Toutes les années ») désactive le filtre.
        $activeYearId = AcademicYear::where('active', true)->orderBy('year', 'desc')->value('id');
        $yearFilter = $request->has('academic_year_id')
            ? $request->input('academic_year_id')
            : $activeYearId;
        if (! empty($yearFilter)) {
            $query->where('academic_year_id', $yearFilter);
        }

        $assignments = $query->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Administration/SubjectAssignments/Index', [
            'assignments'   => $assignments,
            'academicYears' => AcademicYear::orderBy('year', 'desc')->get(['id', 'year']),
            'classrooms'    => Classroom::where('active', true)->orderBy('name')->get(['id', 'name']),
            'filters'       => [
                'search'           => $request->input('search', ''),
                'active'           => $request->input('active'),
                'academic_year_id' => (string) ($yearFilter ?? ''),
                'class_id'         => $request->input('class_id', ''),
            ],
        ]);
    }

    /**
     * Statistiques des affectations : pour une année (active par défaut) et un
     * enseignant sélectionné, liste ses affectations avec un récapitulatif.
     */
    public function statistics(Request $request): Response
    {
        $yearFilter = $request->has('academic_year_id')
            ? (string) $request->input('academic_year_id')
            : (string) $this->activeYearId();

        $teacherId = (string) $request->input('teacher_id', '');
        $selected  = $teacherId !== '' && $yearFilter !== '';

        $teacher   = $selected ? User::find($teacherId) : null;
        $assignments = $selected
            ? $this->teacherAssignments($teacherId, $yearFilter)->map(fn ($a) => [
                'id'        => $a->id,
                'subject'   => $a->subject?->name ?? '—',
                'classroom' => $a->classroom?->name ?? '—',
                'active'    => (bool) $a->active,
            ])
            : collect();

        return Inertia::render('Administration/SubjectAssignments/Statistics', [
            'teachers'      => $this->markTeachers(),
            'academicYears' => AcademicYear::orderBy('year', 'desc')->get(['id', 'year']),
            'filters'       => [
                'academic_year_id' => $yearFilter,
                'teacher_id'       => $teacherId,
            ],
            'teacher'       => $teacher
                ? ['id' => $teacher->id, 'name' => trim($teacher->firstname . ' ' . $teacher->lastname)]
                : null,
            'assignments'   => $assignments->values(),
            'summary'       => [
                'total'    => $assignments->count(),
                'active'   => $assignments->where('active', true)->count(),
                'subjects' => $assignments->pluck('subject')->unique()->count(),
                'classes'  => $assignments->pluck('classroom')->unique()->count(),
            ],
        ]);
    }

    /**
     * Export PDF de la fiche d'affectations d'un enseignant (en-tête officielle).
     */
    public function exportStatistics(Request $request)
    {
        $validated = $request->validate([
            'teacher_id'       => ['required', 'uuid', 'exists:users,id'],
            'academic_year_id' => ['nullable', 'uuid', 'exists:academic_years,id'],
        ]);

        $yearId  = (string) ($validated['academic_year_id'] ?? $this->activeYearId());
        $year    = AcademicYear::find($yearId);
        $teacher = User::findOrFail($validated['teacher_id']);

        $school   = School::where('active', true)->first() ?? School::query()->first();
        $renderer = app(DocumentRenderer::class);

        $pdf = Pdf::loadView('exports.subject-assignments', [
            'school'      => $school,
            'headerHtml'  => $school ? $renderer->headerHtml($school, $renderer->resolveVariables($school)) : '',
            'headerCss'   => $renderer->headerCss(),
            'teacher'     => $teacher,
            'year'        => $year,
            'assignments' => $this->teacherAssignments($teacher->id, $yearId),
        ])->setPaper('a4', 'portrait');

        return $pdf->stream('affectations-' . Str::slug(trim($teacher->firstname . ' ' . $teacher->lastname) . '-' . ($year?->year ?? '')) . '.pdf');
    }

    /** Identifiant de l'année académique active (la plus récente marquée active). */
    private function activeYearId(): ?string
    {
        return AcademicYear::where('active', true)->orderBy('year', 'desc')->value('id');
    }

    /** Enseignants (utilisateurs pouvant saisir des notes), triés par nom. */
    private function markTeachers(): Collection
    {
        return User::permission('create_marks')
            ->orderBy('firstname')->orderBy('lastname')
            ->get(['id', 'firstname', 'lastname']);
    }

    /**
     * Affectations d'un enseignant pour une année, triées par matière puis classe.
     * Source unique partagée par l'affichage des statistiques et l'export PDF.
     */
    private function teacherAssignments(string $teacherId, string $yearId): Collection
    {
        return SubjectAssignment::with(['subject:id,name', 'classroom:id,name'])
            ->where('teacher_id', $teacherId)
            ->where('academic_year_id', $yearId)
            ->get()
            ->sortBy(fn ($a) => ($a->subject?->name ?? '') . ' ' . ($a->classroom?->name ?? ''))
            ->values();
    }

    public function create(): Response
    {
        $subjects      = Subject::orderBy('name')->get();
        $teachers      = User::permission('create_marks')->orderBy('firstname')->orderBy('lastname')->get();
        $academicYears = AcademicYear::where('active', true)->orderBy('year', 'desc')->get();
        $classrooms    = Classroom::where('active', true)->orderBy('name')->get();

        return Inertia::render('Administration/SubjectAssignments/Create', [
            'subjects'      => $subjects,
            'teachers'      => $teachers,
            'academicYears' => $academicYears,
            'classrooms'    => $classrooms,
        ]);
    }

    public function store(StoreSubjectAssignmentRequest $request): RedirectResponse
    {
        SubjectAssignment::create($request->validated());

        return redirect()->route('subject-assignments.index')
            ->with('success', 'Affectation créée avec succès.');
    }

    public function show(SubjectAssignment $subjectAssignment): Response
    {
        $subjectAssignment->load(['subject', 'teacher', 'academicYear', 'classroom.type']);

        return Inertia::render('Administration/SubjectAssignments/Show', [
            'assignment' => $subjectAssignment,
        ]);
    }

    public function edit(SubjectAssignment $subjectAssignment): Response
    {
        $subjectAssignment->load(['subject', 'teacher', 'academicYear', 'classroom']);

        $subjects      = Subject::orderBy('name')->get();
        $teachers      = User::permission('create_marks')->orderBy('firstname')->orderBy('lastname')->get();
        $academicYears = AcademicYear::where('active', true)->orderBy('year', 'desc')->get();
        $classrooms    = Classroom::where('active', true)->orderBy('name')->get();

        return Inertia::render('Administration/SubjectAssignments/Edit', [
            'assignment'    => $subjectAssignment,
            'subjects'      => $subjects,
            'teachers'      => $teachers,
            'academicYears' => $academicYears,
            'classrooms'    => $classrooms,
        ]);
    }

    public function update(UpdateSubjectAssignmentRequest $request, SubjectAssignment $subjectAssignment): RedirectResponse
    {
        $subjectAssignment->update($request->validated());

        return redirect()->route('subject-assignments.index')
            ->with('success', 'Affectation mise à jour avec succès.');
    }

    public function destroy(SubjectAssignment $subjectAssignment): RedirectResponse
    {
        abort_unless(
            request()->user()->can('delete_subject_assignments'),
            403
        );

        $subjectAssignment->delete();

        return redirect()->route('subject-assignments.index')
            ->with('success', 'Affectation supprimée avec succès.');
    }
}
