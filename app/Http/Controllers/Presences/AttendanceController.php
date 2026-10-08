<?php

namespace App\Http\Controllers\Presences;

use App\Http\Controllers\Controller;
use App\Models\AbsencePermission;
use App\Models\AcademicPeriod;
use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\AttendanceRecord;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\SubjectAssignment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    public function index(Request $request): Response
    {
        $classroomId = $request->string('classroom_id')->toString();
        $periodId = $request->string('period_id')->toString();
        $date = $request->string('date', now()->toDateString())->toString();
        $session = $request->string('session', 'journee')->toString();

        $activeYear = AcademicYear::where('active', true)->first(['id', 'year']);

        $classrooms = Classroom::whereHas('classSubjects', fn ($q) => $q->where('academic_year_id', $activeYear?->id))
            ->orderBy('name')->get(['id', 'name', 'code']);

        $periods = AcademicPeriod::when($activeYear, fn ($q) => $q->where('academic_year_id', $activeYear->id))
            ->orderBy('start_date')->get(['id', 'name']);

        $studentsWithStatus = collect();
        $existingAttendance = null;

        if ($classroomId && $date) {
            // Appel existant pour cette classe/date/session
            $existingAttendance = Attendance::where('class_id', $classroomId)
                ->where('date', $date)
                ->where('session', $session)
                ->with('records')
                ->first();

            // Élèves inscrits dans la classe pour l'année active (hors abandon / transfert)
            $enrollments = Enrollment::where('enrollments.class_id', $classroomId)
                ->where('enrollments.academic_year_id', $activeYear?->id)
                ->whereIn('enrollments.academic_status', Enrollment::ACTIVE_ACADEMIC_STATUSES)
                ->join('students', 'students.id', '=', 'enrollments.student_id')
                ->orderBy('students.lastname')
                ->orderBy('students.firstname')
                ->select('enrollments.*')
                ->with('student:id,firstname,lastname,matricule')
                ->get();

            // Permissions approuvées couvrant cette date
            $permissionsByStudent = AbsencePermission::where('status', 'approved')
                ->where('start_date', '<=', $date)
                ->where('end_date', '>=', $date)
                ->whereIn('student_id', $enrollments->pluck('student_id'))
                ->get()
                ->keyBy('student_id');

            $existingRecords = $existingAttendance
                ? $existingAttendance->records->keyBy('student_id')
                : collect();

            $studentsWithStatus = $enrollments->map(function ($enrollment) use ($existingRecords, $permissionsByStudent) {
                $record = $existingRecords->get($enrollment->student_id);
                $permission = $permissionsByStudent->get($enrollment->student_id);

                return [
                    'student_id' => $enrollment->student_id,
                    'student' => $enrollment->student,
                    'record_id' => $record?->id,
                    'status' => $record?->status ?? ($permission ? 'excused' : 'present'),
                    'minutes_late' => $record?->minutes_late,
                    'comment' => $record?->comment,
                    'has_permission' => (bool) $permission,
                    'permission_dates' => $permission
                        ? $permission->start_date->format('d/m').'→'.$permission->end_date->format('d/m')
                        : null,
                ];
            });
        }

        return Inertia::render('Presences/Attendances/Index', [
            'classrooms' => $classrooms,
            'periods' => $periods,
            'studentsWithStatus' => $studentsWithStatus,
            'existingAttendance' => $existingAttendance ? [
                'id' => $existingAttendance->id,
                'session' => $existingAttendance->session,
                'notes' => $existingAttendance->notes,
            ] : null,
            'filters' => compact('classroomId', 'periodId', 'date', 'session'),
            'activeYear' => $activeYear,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $classId = $request->string('class_id')->toString();

        $this->assertCanRecordFor($request, $classId);

        // Seuls les élèves réellement inscrits (activement) dans cette classe peuvent
        // être pointés : `exists:students,id` laisserait passer un élève d'une autre
        // classe et fausserait les statistiques d'assiduité.
        $enrolledIds = Enrollment::where('class_id', $classId)
            ->where('status', Enrollment::STATUS_ACTIVE)
            ->pluck('student_id')
            ->all();

        $validated = $request->validate([
            'class_id' => ['required', 'uuid', 'exists:classes,id'],
            'academic_period_id' => ['required', 'uuid', 'exists:academic_periods,id'],
            'date' => ['required', 'date'],
            'session' => ['required', 'in:matin,apres-midi,journee'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'records' => ['required', 'array', 'min:1'],
            'records.*.student_id' => ['required', 'uuid', Rule::in($enrolledIds)],
            'records.*.status' => ['required', 'in:present,absent,late,excused'],
            'records.*.minutes_late' => ['nullable', 'integer', 'min:1', 'max:240'],
            'records.*.comment' => ['nullable', 'string', 'max:300'],
        ], [
            'records.*.student_id.in' => "Cet élève n'est pas inscrit dans cette classe.",
        ]);

        DB::transaction(function () use ($validated, $request): void {
            $attendance = Attendance::updateOrCreate(
                [
                    'class_id' => $validated['class_id'],
                    'date' => $validated['date'],
                    'session' => $validated['session'],
                ],
                [
                    'academic_period_id' => $validated['academic_period_id'],
                    'recorded_by' => $request->user()->id,
                    'notes' => $validated['notes'] ?? null,
                ]
            );

            foreach ($validated['records'] as $rec) {
                AttendanceRecord::updateOrCreate(
                    [
                        'attendance_id' => $attendance->id,
                        'student_id' => $rec['student_id'],
                    ],
                    [
                        'status' => $rec['status'],
                        'minutes_late' => $rec['status'] === 'late' ? ($rec['minutes_late'] ?? null) : null,
                        'comment' => $rec['comment'] ?? null,
                    ]
                );
            }
        });

        return back()->with('message', 'Appel enregistré avec succès.');
    }

    /**
     * Cloisonnement enseignant : qui porte des affectations est un enseignant et ne
     * fait l'appel que dans SES classes (toutes matières confondues — l'appel n'est
     * pas lié à une matière). Les profils sans affectation (administration, vie
     * scolaire) restent transverses.
     */
    private function assertCanRecordFor(Request $request, string $classId): void
    {
        $userId = $request->user()->id;

        if (! SubjectAssignment::where('teacher_id', $userId)->where('active', true)->exists()) {
            return;
        }

        $assigned = SubjectAssignment::where('teacher_id', $userId)
            ->where('class_id', $classId)
            ->where('active', true)
            ->exists();

        abort_unless($assigned, 403, "Vous n'êtes pas affecté à cette classe.");
    }

    public function stats(Request $request): Response
    {
        $classroomId = $request->string('classroom_id')->toString();
        $periodId = $request->string('period_id')->toString();

        $activeYear = AcademicYear::where('active', true)->first(['id', 'year']);

        $classrooms = Classroom::whereHas('classSubjects', fn ($q) => $q->where('academic_year_id', $activeYear?->id))
            ->orderBy('name')->get(['id', 'name', 'code']);

        $periods = AcademicPeriod::when($activeYear, fn ($q) => $q->where('academic_year_id', $activeYear->id))
            ->orderBy('start_date')->get(['id', 'name']);

        $stats = collect();
        $topAbsent = collect();
        $dailySummary = collect();

        if ($classroomId) {
            $attendanceIds = Attendance::where('class_id', $classroomId)
                ->when($periodId, fn ($q) => $q->where('academic_period_id', $periodId))
                ->pluck('id');

            $totalSessions = $attendanceIds->count();

            // Stats par élève
            $stats = AttendanceRecord::whereIn('attendance_id', $attendanceIds)
                ->with('student:id,firstname,lastname,matricule')
                ->get()
                ->groupBy('student_id')
                ->map(function ($records) use ($totalSessions) {
                    $student = $records->first()->student;

                    return [
                        'student' => $student,
                        'total' => $totalSessions,
                        'present' => $records->where('status', 'present')->count(),
                        'absent' => $records->where('status', 'absent')->count(),
                        'late' => $records->where('status', 'late')->count(),
                        'excused' => $records->where('status', 'excused')->count(),
                        'absence_rate' => $totalSessions > 0
                            ? round($records->whereIn('status', ['absent'])->count() / $totalSessions * 100, 1)
                            : 0,
                    ];
                })
                ->sortByDesc('absent')
                ->values();

            // Top 5 absentéistes
            $topAbsent = $stats->take(5);

            // Résumé journalier
            $dailySummary = Attendance::where('class_id', $classroomId)
                ->when($periodId, fn ($q) => $q->where('academic_period_id', $periodId))
                ->withCount([
                    'records',
                    'records as absent_count' => fn ($q) => $q->where('status', 'absent'),
                    'records as present_count' => fn ($q) => $q->where('status', 'present'),
                    'records as late_count' => fn ($q) => $q->where('status', 'late'),
                    'records as excused_count' => fn ($q) => $q->where('status', 'excused'),
                ])
                ->orderBy('date')
                ->get(['id', 'date', 'session']);
        }

        return Inertia::render('Presences/Attendances/Stats', [
            'classrooms' => $classrooms,
            'periods' => $periods,
            'stats' => $stats,
            'topAbsent' => $topAbsent,
            'dailySummary' => $dailySummary,
            'filters' => compact('classroomId', 'periodId'),
            'activeYear' => $activeYear,
        ]);
    }
}
