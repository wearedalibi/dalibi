<?php

namespace App\Http\Controllers\Examens;

use App\Http\Controllers\Controller;
use App\Models\AcademicPeriod;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Evaluation;
use App\Models\EvaluationType;
use App\Models\School;
use App\Models\Subject;
use App\Services\DocumentRenderer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EvaluationController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $status = $request->string('status')->toString();
        $periodId = $request->string('period_id')->toString();
        $templateId = $request->string('template_id')->toString();
        $classId = $request->string('class_id')->toString();
        $subjectId = $request->string('subject_id')->toString();
        $evalTypeId = $request->string('evaluation_type_id')->toString();
        $scheduling = $request->string('scheduling')->toString(); // with | without
        $user = $request->user();

        $activeYear = AcademicYear::where('active', true)->first(['id', 'year']);

        $query = Evaluation::query()
            ->with([
                'template:id,name,coefficient,max_score,academic_period_id,evaluation_type_id',
                'template.academicPeriod:id,name',
                'template.evaluationType:id,name',
                'classSubject:id,class_id,subject_id',
                'classSubject.class:id,name,code',
                'classSubject.subject:id,name',
            ])
            ->withCount(['marks', 'marks as graded_count' => fn ($q) => $q->whereNotNull('score')->where('absent', false)])
            ->when($status && in_array($status, ['scheduled', 'completed'], true), fn ($q) => $q->where('status', $status))
            ->when($templateId, fn ($q) => $q->where('evaluation_template_id', $templateId))
            ->when($periodId, fn ($q) => $q->whereHas('template', fn ($tq) => $tq->where('academic_period_id', $periodId)))
            ->when($evalTypeId, fn ($q) => $q->whereHas('template', fn ($tq) => $tq->where('evaluation_type_id', $evalTypeId)))
            ->when($classId, fn ($q) => $q->whereHas('classSubject', fn ($cq) => $cq->where('class_id', $classId)))
            ->when($subjectId, fn ($q) => $q->whereHas('classSubject', fn ($cq) => $cq->where('subject_id', $subjectId)))
            ->when($scheduling === 'with', fn ($q) => $q->whereNotNull('date'))
            ->when($scheduling === 'without', fn ($q) => $q->whereNull('date'))
            ->when($search, function ($q) use ($search): void {
                $like = ['%'.strtolower($search).'%'];
                $expr = 'LOWER(name) LIKE ?';
                $q->whereHas('template', fn ($tq) => $tq->whereRaw($expr, $like))
                    ->orWhereHas('classSubject.class', fn ($cq) => $cq->whereRaw($expr, $like))
                    ->orWhereHas('classSubject.subject', fn ($sq) => $sq->whereRaw($expr, $like));
            });

        $evaluations = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        return Inertia::render('Examens/Evaluations/Index', [
            'evaluations' => $evaluations,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'period_id' => $periodId,
                'template_id' => $templateId,
                'class_id' => $classId,
                'subject_id' => $subjectId,
                'evaluation_type_id' => $evalTypeId,
                'scheduling' => $scheduling,
            ],
            'options' => [
                'classrooms' => Classroom::where('active', true)->orderBy('name')->get(['id', 'name', 'code']),
                'subjects' => Subject::orderBy('name')->get(['id', 'name']),
                'evaluationTypes' => EvaluationType::orderBy('name')->get(['id', 'name']),
                'periods' => AcademicPeriod::when($activeYear, fn ($q) => $q->where('academic_year_id', $activeYear->id))
                    ->orderBy('start_date')->get(['id', 'name']),
            ],
            'canLock' => $user->can('edit_evaluations'),
        ]);
    }

    public function show(Evaluation $evaluation): Response
    {
        $evaluation->load([
            'template:id,name,coefficient,max_score,date,academic_period_id,evaluation_type_id',
            'template.academicPeriod:id,name',
            'template.evaluationType:id,name',
            'classSubject:id,class_id,subject_id,coefficient',
            'classSubject.class:id,name,code',
            'classSubject.subject:id,name',
            'marks.student:id,firstname,lastname,matricule',
        ]);

        return Inertia::render('Examens/Evaluations/Show', [
            'evaluation' => $evaluation,
        ]);
    }

    public function updateStatus(Request $request, Evaluation $evaluation): RedirectResponse
    {
        abort_unless($request->user()->can('edit_evaluations'), 403);

        $validated = $request->validate([
            'status' => ['required', 'in:scheduled,completed'],
        ]);

        $evaluation->update($validated);

        return back()->with('message', 'Statut mis à jour.');
    }

    public function toggleLock(Request $request, Evaluation $evaluation): RedirectResponse
    {
        abort_unless($request->user()->can('edit_evaluations'), 403);

        $isLocked = $evaluation->locked_at !== null;

        $evaluation->update([
            'locked_at' => $isLocked ? null : now(),
            'locked_by' => $isLocked ? null : $request->user()->id,
        ]);

        $msg = $isLocked ? 'Évaluation déclôturée.' : 'Évaluation clôturée.';

        return back()->with('message', $msg);
    }

    public function destroy(Request $request, Evaluation $evaluation): RedirectResponse
    {
        abort_unless($request->user()->can('delete_evaluations'), 403);

        $evaluation->delete();

        return back()->with('message', 'Évaluation supprimée.');
    }

    public function planning(Request $request): Response
    {
        $classroomId = $request->string('classroom_id')->toString();
        $periodId = $request->string('period_id')->toString();

        $activeYear = AcademicYear::where('active', true)->first(['id', 'year']);

        // Classes qui ont au moins une évaluation (via class_subjects de l'année active)
        $classrooms = Classroom::whereHas('classSubjects', function ($q) use ($activeYear): void {
            $q->where('academic_year_id', $activeYear?->id)->whereHas('evaluations');
        })->orderBy('name')->get(['id', 'name', 'code']);

        $evaluations = collect();
        $periods = collect();

        if ($classroomId) {
            $evaluations = Evaluation::query()
                ->with([
                    'template:id,name,coefficient,max_score,academic_period_id,evaluation_type_id',
                    'template.academicPeriod:id,name',
                    'template.evaluationType:id,name',
                    'classSubject:id,class_id,subject_id,coefficient',
                    'classSubject.subject:id,name',
                ])
                ->withCount(['marks', 'marks as graded_count' => fn ($q) => $q->whereNotNull('score')->where('absent', false)])
                ->whereHas('classSubject', fn ($q) => $q->where('class_id', $classroomId))
                ->when($periodId, fn ($q) => $q->whereHas('template', fn ($tq) => $tq->where('academic_period_id', $periodId)))
                ->orderByRaw('date IS NULL, date ASC')->orderByRaw('start_time IS NULL, start_time ASC')
                ->get();

            $periods = AcademicPeriod::when(
                $activeYear,
                fn ($q) => $q->where('academic_year_id', $activeYear->id)
            )->orderBy('start_date')->get(['id', 'name']);
        }

        return Inertia::render('Examens/Planning/Index', [
            'classrooms' => $classrooms,
            'evaluations' => $evaluations,
            'periods' => $periods,
            'filters' => ['classroomId' => $classroomId, 'periodId' => $periodId],
            'activeYear' => $activeYear,
        ]);
    }

    public function updateDate(Request $request, Evaluation $evaluation): RedirectResponse
    {
        abort_unless($request->user()->can('edit_evaluations'), 403);

        $validated = $request->validate([
            'date' => ['nullable', 'date'],
            'start_time' => ['nullable', 'date_format:H:i'],
        ]);

        $evaluation->update([
            'date' => $validated['date'] ?? null,
            // L'heure n'a de sens qu'avec une date
            'start_time' => ($validated['date'] ?? null) ? ($validated['start_time'] ?? null) : null,
        ]);

        return back()->with('message', 'Planification mise à jour.');
    }

    public function exportPlanning(Request $request, string $classroomId): \Illuminate\Http\Response
    {
        $classroom = Classroom::findOrFail($classroomId);
        $periodId = $request->string('period_id')->toString();
        $activeYear = AcademicYear::where('active', true)->first(['id', 'year']);

        $evaluations = Evaluation::query()
            ->with([
                'template:id,name,coefficient,max_score,academic_period_id,evaluation_type_id',
                'template.academicPeriod:id,name',
                'template.evaluationType:id,name',
                'classSubject:id,class_id,subject_id,coefficient',
                'classSubject.subject:id,name',
            ])
            ->whereHas('classSubject', fn ($q) => $q->where('class_id', $classroomId))
            ->when($periodId, fn ($q) => $q->whereHas('template', fn ($tq) => $tq->where('academic_period_id', $periodId)))
            ->orderByRaw('date IS NULL, date ASC')->orderByRaw('start_time IS NULL, start_time ASC')
            ->get();

        $school = School::where('active', true)->first();

        $renderer = app(DocumentRenderer::class);
        $headerHtml = $school ? $renderer->headerHtml($school, $renderer->resolveVariables($school)) : '';
        $headerCss = $renderer->headerCss();

        $html = view('exports.planning', compact('classroom', 'evaluations', 'school', 'activeYear', 'headerHtml', 'headerCss'))->render();

        return response($html)->header('Content-Type', 'text/html');
    }
}
