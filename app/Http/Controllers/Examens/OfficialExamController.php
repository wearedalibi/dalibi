<?php

namespace App\Http\Controllers\Examens;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\OfficialExam;
use App\Models\OfficialExamRegistration;
use App\Models\School;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OfficialExamController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('view_official_exams'), 403);

        $activeYear = AcademicYear::where('active', true)->first(['id', 'year']);
        $years = AcademicYear::orderByDesc('start_date')->get(['id', 'year', 'active']);

        // Année par défaut = année académique active
        $yearId = $request->string('academic_year_id')->toString() ?: ($activeYear?->id ?? '');
        $type = $request->string('type')->toString();
        $session = $request->string('session')->toString();
        $status = $request->string('status')->toString();
        $search = $request->string('search')->toString();

        $exams = OfficialExam::withCount([
            'registrations',
            'registrations as admis_count' => fn ($q) => $q->where('status', 'admis'),
        ])
            ->with('classroom:id,name')
            ->when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))
            ->when($type && array_key_exists($type, OfficialExam::TYPES), fn ($q) => $q->where('type', $type))
            ->when($session && array_key_exists($session, OfficialExam::SESSIONS), fn ($q) => $q->where('session', $session))
            ->when($status && array_key_exists($status, OfficialExam::STATUSES), fn ($q) => $q->where('status', $status))
            ->when($search, fn ($q) => $q->whereRaw('LOWER(name) LIKE ?', ['%'.strtolower($search).'%']))
            ->orderByDesc('exam_date')
            ->orderBy('type')
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'type' => $e->type,
                'type_label' => $e->typeLabel(),
                'name' => $e->name,
                'year' => $e->year,
                'session' => $e->session,
                'class_id' => $e->class_id,
                'class_name' => $e->classroom?->name,
                'exam_date' => $e->exam_date?->format('Y-m-d'),
                'center' => $e->center,
                'status' => $e->status,
                'total' => $e->registrations_count,
                'admis' => $e->admis_count,
            ]);

        return Inertia::render('Examens/OfficialExams/Index', [
            'exams' => $exams,
            'years' => $years,
            'activeYear' => $activeYear,
            'classrooms' => Classroom::where('active', true)->orderBy('name')->get(['id', 'name']),
            'types' => OfficialExam::TYPES,
            'sessions' => OfficialExam::SESSIONS,
            'statuses' => OfficialExam::STATUSES,
            'filters' => [
                'academic_year_id' => $yearId,
                'type' => $type,
                'session' => $session,
                'status' => $status,
                'search' => $search,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('create_official_exams'), 403);

        $data = $this->validateExam($request);
        $data['school_id'] = School::query()->value('id');
        // Rattaché à l'année académique active
        $data['academic_year_id'] = AcademicYear::where('active', true)->value('id');

        OfficialExam::create($data);

        return redirect()->route('official-exams.index')->with('message', 'Examen officiel créé.');
    }

    public function update(Request $request, OfficialExam $officialExam): RedirectResponse
    {
        abort_unless($request->user()->can('edit_official_exams'), 403);

        $officialExam->update($this->validateExam($request));

        return redirect()->route('official-exams.index')->with('message', 'Examen mis à jour.');
    }

    public function destroy(Request $request, OfficialExam $officialExam): RedirectResponse
    {
        abort_unless($request->user()->can('delete_official_exams'), 403);

        $officialExam->delete();

        return redirect()->route('official-exams.index')->with('message', 'Examen supprimé.');
    }

    public function show(Request $request, OfficialExam $officialExam): Response
    {
        abort_unless($request->user()->can('view_official_exams'), 403);

        $registrations = $officialExam->registrations()
            ->with('student:id,firstname,lastname,matricule')
            ->get()
            ->sortBy(fn ($r) => $r->student?->lastname)
            ->map(fn ($r) => [
                'id' => $r->id,
                'student_id' => $r->student_id,
                'student_name' => $r->student ? $r->student->lastname.' '.$r->student->firstname : '—',
                'matricule' => $r->student?->matricule,
                'registration_number' => $r->registration_number,
                'serie' => $r->serie,
                'status' => $r->status,
                'average' => $r->average,
                'mention' => $r->mention,
            ])->values();

        // Candidats : élèves inscrits dans la classe de l'examen pour son année
        // académique (scolarité active), non encore inscrits à cet examen.
        // Fallback (examens anciens sans classe) : tous les élèves actifs.
        $registeredIds = $officialExam->registrations()->pluck('student_id');
        $availableQuery = Student::whereNotIn('id', $registeredIds)->where('active', true);

        if ($officialExam->class_id) {
            $cohortIds = Enrollment::where('class_id', $officialExam->class_id)
                ->where('academic_year_id', $officialExam->academic_year_id)
                ->whereIn('academic_status', Enrollment::ACTIVE_ACADEMIC_STATUSES)
                ->pluck('student_id');
            $availableQuery->whereIn('id', $cohortIds);
        }

        $availableStudents = $availableQuery
            ->orderBy('lastname')
            ->get(['id', 'firstname', 'lastname', 'matricule'])
            ->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->lastname.' '.$s->firstname,
                'matricule' => $s->matricule,
            ]);

        $stats = [
            'total' => $registrations->count(),
            'admis' => $registrations->where('status', 'admis')->count(),
            'echoue' => $registrations->where('status', 'echoue')->count(),
            'absent' => $registrations->where('status', 'absent')->count(),
        ];
        $stats['taux'] = $stats['total'] > 0 ? round($stats['admis'] / $stats['total'] * 100, 1) : 0;

        return Inertia::render('Examens/OfficialExams/Show', [
            'exam' => [
                'id' => $officialExam->id,
                'type' => $officialExam->type,
                'type_label' => $officialExam->typeLabel(),
                'name' => $officialExam->name,
                'year' => $officialExam->year,
                'session' => $officialExam->session,
                'class_name' => $officialExam->classroom?->name,
                'exam_date' => $officialExam->exam_date?->format('Y-m-d'),
                'center' => $officialExam->center,
                'status' => $officialExam->status,
            ],
            'registrations' => $registrations,
            'availableStudents' => $availableStudents,
            'stats' => $stats,
            'statuses' => OfficialExamRegistration::STATUSES,
            'mentions' => OfficialExamRegistration::MENTIONS,
            'isBac' => $officialExam->type === 'bac',
        ]);
    }

    public function registerStudents(Request $request, OfficialExam $officialExam): RedirectResponse
    {
        abort_unless($request->user()->can('edit_official_exams'), 403);

        $validated = $request->validate([
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['uuid', 'exists:students,id'],
        ]);

        foreach ($validated['student_ids'] as $studentId) {
            OfficialExamRegistration::firstOrCreate([
                'official_exam_id' => $officialExam->id,
                'student_id' => $studentId,
            ]);
        }

        return back()->with('message', count($validated['student_ids']).' élève(s) inscrit(s).');
    }

    public function updateResults(Request $request, OfficialExam $officialExam): RedirectResponse
    {
        abort_unless($request->user()->can('edit_official_exams'), 403);

        $validated = $request->validate([
            'results' => ['required', 'array'],
            'results.*.id' => ['required', 'uuid'],
            'results.*.registration_number' => ['nullable', 'string', 'max:50'],
            'results.*.serie' => ['nullable', 'string', 'max:20'],
            'results.*.status' => ['required', 'in:inscrit,admis,echoue,absent'],
            'results.*.average' => ['nullable', 'numeric', 'min:0', 'max:20'],
            'results.*.mention' => ['nullable', 'in:passable,assez_bien,bien,tres_bien'],
        ]);

        DB::transaction(function () use ($validated, $officialExam): void {
            foreach ($validated['results'] as $row) {
                OfficialExamRegistration::where('id', $row['id'])
                    ->where('official_exam_id', $officialExam->id)
                    ->update([
                        'registration_number' => $row['registration_number'] ?? null,
                        'serie' => $row['serie'] ?? null,
                        'status' => $row['status'],
                        'average' => $row['average'] ?? null,
                        'mention' => $row['mention'] ?? null,
                    ]);
            }
        });

        return back()->with('message', 'Résultats enregistrés.');
    }

    public function removeRegistration(Request $request, OfficialExam $officialExam, OfficialExamRegistration $registration): RedirectResponse
    {
        abort_unless($request->user()->can('edit_official_exams'), 403);

        $registration->delete();

        return back()->with('message', 'Inscription retirée.');
    }

    private function validateExam(Request $request): array
    {
        return $request->validate([
            'type' => ['required', 'in:cepd,bepc,bac'],
            'name' => ['required', 'string', 'max:150'],
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'session' => ['required', 'in:normale,rattrapage'],
            'class_id' => ['required', 'uuid', 'exists:classes,id'],
            'exam_date' => ['nullable', 'date'],
            'center' => ['nullable', 'string', 'max:150'],
            'status' => ['required', 'in:ouvert,clos,termine'],
        ]);
    }
}
