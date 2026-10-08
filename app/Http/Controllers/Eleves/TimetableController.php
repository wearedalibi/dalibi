<?php

namespace App\Http\Controllers\Eleves;
use App\Http\Controllers\Controller;

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\School;
use App\Services\DocumentRenderer;
use App\Models\Subject;
use App\Models\TimetableSlot;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TimetableController extends Controller
{
    public function index(Request $request): Response
    {
        $classId      = $request->string('class_id')->toString();
        $activeYearId = $this->activeYearId();

        $classrooms = Classroom::orderBy('name')->get(['id', 'name', 'code']);
        $subjects   = Subject::orderBy('name')->get(['id', 'name']);

        $slots = collect();
        if ($classId) {
            $slots = TimetableSlot::with(['subject:id,name', 'teacher:id,firstname,lastname'])
                ->where('class_id', $classId)
                ->when($activeYearId, fn ($q) => $q->where('academic_year_id', $activeYearId))
                ->orderBy('day_of_week')
                ->orderBy('start_time')
                ->get()
                ->map(fn ($s) => [
                    'id'           => $s->id,
                    'day_of_week'  => $s->day_of_week,
                    'start_time'   => substr($s->start_time, 0, 5),
                    'end_time'     => substr($s->end_time, 0, 5),
                    'subject_id'   => $s->subject_id,
                    'subject_name' => $s->subject?->name,
                    'teacher_id'   => $s->teacher_id,
                    'teacher_name' => $s->teacher?->name,
                    'room'         => $s->room,
                ]);
        }

        return Inertia::render('Eleves/Timetable/Index', [
            'classrooms' => $classrooms,
            'subjects'   => $subjects,
            'teachers'   => $this->markTeachers(),
            'slots'      => $slots,
            'days'       => TimetableSlot::DAYS,
            'filters'    => ['class_id' => $classId],
            'canManage'  => $request->user()->can('create_timetable'),
        ]);
    }

    /**
     * Emploi du temps d'un enseignant (toutes classes confondues) pour l'année active.
     */
    public function teacher(Request $request): Response
    {
        $activeYearId = $this->activeYearId();
        $teacherId    = $request->string('teacher_id')->toString();

        $teacher = $teacherId ? User::find($teacherId) : null;
        $slots   = $teacherId
            ? $this->teacherSlots($teacherId, $activeYearId)->map(fn ($s) => [
                'id'           => $s->id,
                'day_of_week'  => $s->day_of_week,
                'start_time'   => substr($s->start_time, 0, 5),
                'end_time'     => substr($s->end_time, 0, 5),
                'subject_name' => $s->subject?->name,
                'class_name'   => $s->classroom?->name,
                'room'         => $s->room,
            ])->values()
            : collect();

        return Inertia::render('Eleves/Timetable/Teacher', [
            'teachers' => $this->markTeachers(),
            'teacher'  => $teacher ? ['id' => $teacher->id, 'name' => $teacher->name] : null,
            'slots'    => $slots,
            'days'     => TimetableSlot::DAYS,
            'filters'  => ['teacher_id' => $teacherId],
        ]);
    }

    public function export(Request $request, string $classId)
    {
        $classroom    = Classroom::findOrFail($classId);
        $school       = School::query()->first();
        $activeYearId = $this->activeYearId();

        $slots = TimetableSlot::with(['subject:id,name', 'teacher:id,firstname,lastname'])
            ->where('class_id', $classId)
            ->when($activeYearId, fn ($q) => $q->where('academic_year_id', $activeYearId))
            ->orderBy('start_time')
            ->get();

        // Lignes = plages horaires distinctes (triées), colonnes = jours
        $timeRanges = $slots
            ->map(fn ($s) => substr($s->start_time, 0, 5) . '-' . substr($s->end_time, 0, 5))
            ->unique()
            ->sort()
            ->values();

        // Index : [plage][jour] => slot
        $grid = [];
        foreach ($slots as $slot) {
            $range = substr($slot->start_time, 0, 5) . '-' . substr($slot->end_time, 0, 5);
            $grid[$range][$slot->day_of_week] = $slot;
        }

        $renderer = app(DocumentRenderer::class);

        $pdf = Pdf::loadView('exports.timetable', [
            'school'     => $school,
            'headerHtml' => $school ? $renderer->headerHtml($school, $renderer->resolveVariables($school)) : '',
            'headerCss'  => $renderer->headerCss(),
            'classroom'  => $classroom,
            'days'       => TimetableSlot::DAYS,
            'timeRanges' => $timeRanges,
            'grid'       => $grid,
        ])->setPaper('a4', 'landscape');

        return $pdf->stream('emploi-du-temps-' . Str::slug($classroom->name) . '.pdf');
    }

    /**
     * Export PDF de l'emploi du temps d'un enseignant (toutes classes, année active).
     */
    public function teacherExport(Request $request)
    {
        $validated = $request->validate([
            'teacher_id' => ['required', 'uuid', 'exists:users,id'],
        ]);

        $activeYearId = $this->activeYearId();
        $teacher      = User::findOrFail($validated['teacher_id']);
        $year         = $activeYearId ? AcademicYear::find($activeYearId) : null;

        $slots = $this->teacherSlots($teacher->id, $activeYearId);

        // Lignes = plages horaires distinctes (triées), colonnes = jours.
        $timeRanges = $slots
            ->map(fn ($s) => substr($s->start_time, 0, 5) . '-' . substr($s->end_time, 0, 5))
            ->unique()->sort()->values();

        $grid = [];
        foreach ($slots as $slot) {
            $range = substr($slot->start_time, 0, 5) . '-' . substr($slot->end_time, 0, 5);
            $grid[$range][$slot->day_of_week] = $slot;
        }

        $school   = School::query()->first();
        $renderer = app(DocumentRenderer::class);

        $pdf = Pdf::loadView('exports.timetable-teacher', [
            'school'     => $school,
            'headerHtml' => $school ? $renderer->headerHtml($school, $renderer->resolveVariables($school)) : '',
            'headerCss'  => $renderer->headerCss(),
            'teacher'    => $teacher,
            'year'       => $year,
            'days'       => TimetableSlot::DAYS,
            'timeRanges' => $timeRanges,
            'grid'       => $grid,
        ])->setPaper('a4', 'landscape');

        return $pdf->stream('emploi-du-temps-' . Str::slug($teacher->name) . '.pdf');
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('create_timetable'), 403);

        $data = $this->validateSlot($request);
        $data['school_id']        = School::query()->value('id');
        $data['academic_year_id'] = AcademicYear::where('active', true)->value('id');

        TimetableSlot::create($data);

        return back()->with('message', 'Créneau ajouté.');
    }

    public function update(Request $request, TimetableSlot $timetableSlot): RedirectResponse
    {
        abort_unless($request->user()->can('edit_timetable'), 403);

        $timetableSlot->update($this->validateSlot($request));

        return back()->with('message', 'Créneau mis à jour.');
    }

    public function destroy(Request $request, TimetableSlot $timetableSlot): RedirectResponse
    {
        abort_unless($request->user()->can('delete_timetable'), 403);

        $timetableSlot->delete();

        return back()->with('message', 'Créneau supprimé.');
    }

    private function validateSlot(Request $request): array
    {
        return $request->validate([
            'class_id'    => ['required', 'uuid', 'exists:classes,id'],
            'day_of_week' => ['required', 'integer', 'min:1', 'max:6'],
            'start_time'  => ['required', 'date_format:H:i'],
            'end_time'    => ['required', 'date_format:H:i', 'after:start_time'],
            'subject_id'  => ['nullable', 'uuid', 'exists:subjects,id'],
            'teacher_id'  => ['nullable', 'uuid', 'exists:users,id'],
            'room'        => ['nullable', 'string', 'max:50'],
        ], [
            'end_time.after' => 'L\'heure de fin doit être après l\'heure de début.',
        ]);
    }

    /** Identifiant de l'année académique active (la plus récente marquée active). */
    private function activeYearId(): ?string
    {
        return AcademicYear::where('active', true)->orderByDesc('year')->value('id');
    }

    /** Enseignants (utilisateurs pouvant saisir des notes), triés par nom. */
    private function markTeachers(): Collection
    {
        return User::permission('create_marks')
            ->orderBy('lastname')->orderBy('firstname')
            ->get(['id', 'firstname', 'lastname'])
            ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name]);
    }

    /** Créneaux d'un enseignant (toutes classes) pour une année, triés jour/heure. */
    private function teacherSlots(string $teacherId, ?string $yearId): Collection
    {
        return TimetableSlot::with(['subject:id,name', 'classroom:id,name'])
            ->where('teacher_id', $teacherId)
            ->when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();
    }
}
