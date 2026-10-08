<?php

namespace App\Http\Controllers\Presences;

use App\Http\Controllers\Controller;
use App\Models\AbsencePermission;
use App\Models\AcademicYear;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class AbsencePermissionController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();
        $studentId = $request->string('student_id')->toString();
        $search = $request->string('search')->toString();

        $permissions = AbsencePermission::query()
            ->with([
                'student:id,firstname,lastname,matricule',
                'requestedBy:id,firstname,lastname',
                'reviewedBy:id,firstname,lastname',
            ])
            ->when($status && in_array($status, ['pending', 'approved', 'rejected'], true), fn ($q) => $q->where('status', $status))
            ->when($studentId, fn ($q) => $q->where('student_id', $studentId))
            ->when($search, function ($q) use ($search): void {
                $like = '%'.strtolower($search).'%';
                $q->whereHas('student', fn ($sq) => $sq->whereRaw("LOWER(lastname || ' ' || firstname) LIKE ?", [$like])
                    ->orWhereRaw('LOWER(matricule) LIKE ?', [$like])
                );
            })
            ->orderByRaw("CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END")
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        $stats = AbsencePermission::selectRaw("
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'pending')  as pending,
            COUNT(*) FILTER (WHERE status = 'approved') as approved,
            COUNT(*) FILTER (WHERE status = 'rejected') as rejected
        ")->first();

        return Inertia::render('Presences/AbsencePermissions/Index', [
            'permissions' => $permissions,
            'stats' => $stats,
            'filters' => compact('status', 'studentId', 'search'),
        ]);
    }

    public function create(Request $request): Response
    {
        $activeYear = AcademicYear::where('active', true)->first(['id']);

        // Élèves inscrits pour l'année active ; fallback sur tous les élèves si aucune inscription
        $students = Student::join('enrollments', 'enrollments.student_id', '=', 'students.id')
            ->where('enrollments.academic_year_id', $activeYear?->id)
            ->orderBy('students.lastname')
            ->select('students.id', 'students.firstname', 'students.lastname', 'students.matricule')
            ->distinct()
            ->get();

        if ($students->isEmpty()) {
            $students = Student::orderBy('lastname')->get(['id', 'firstname', 'lastname', 'matricule']);
        }

        return Inertia::render('Presences/AbsencePermissions/Create', [
            'students' => $students,
            'preStudentId' => $request->string('student_id')->toString(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'student_id' => ['required', 'uuid', 'exists:students,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'gte:start_date'],
            'reason' => ['required', 'in:medical,familial,autre'],
            'description' => ['required', 'string', 'max:2000'],
        ], [
            'end_date.gte' => 'La date de fin doit être après la date de début.',
        ]);

        AbsencePermission::create([
            ...$validated,
            'requested_by' => $request->user()->id,
            'status' => 'pending',
        ]);

        return redirect()->route('absence-permissions.index')
            ->with('message', 'Demande de permission créée avec succès.');
    }

    public function show(AbsencePermission $absencePermission): Response
    {
        $absencePermission->load([
            'student:id,firstname,lastname,matricule',
            'requestedBy:id,firstname,lastname',
            'reviewedBy:id,firstname,lastname',
            'attendanceRecords.attendance:id,date,session,class_id',
            'attendanceRecords.attendance.classroom:id,name,code',
        ]);

        return Inertia::render('Presences/AbsencePermissions/Show', [
            'permission' => $absencePermission,
        ]);
    }

    public function review(Request $request, AbsencePermission $absencePermission): RedirectResponse
    {
        abort_unless(
            $request->user()->can('review_absence_permissions'),
            403
        );

        // Règle « en attente » centralisée dans AbsencePermissionPolicy@review.
        abort_if(Gate::inspect('review', $absencePermission)->denied(), 422, 'Cette demande a déjà été traitée.');

        $validated = $request->validate([
            'decision' => ['required', 'in:approved,rejected'],
            'review_comment' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($validated['decision'] === 'approved') {
            $absencePermission->approve($request->user()->id, $validated['review_comment'] ?? null);
        } else {
            $absencePermission->reject($request->user()->id, $validated['review_comment'] ?? null);
        }

        $msg = $validated['decision'] === 'approved'
            ? 'Permission approuvée. Les absences ont été marquées comme excusées.'
            : 'Permission rejetée.';

        return back()->with('message', $msg);
    }

    public function destroy(Request $request, AbsencePermission $absencePermission): RedirectResponse
    {
        abort_unless(
            $request->user()->can('delete_absence_permissions'),
            403
        );

        abort_if($absencePermission->status === 'approved', 422, 'Impossible de supprimer une permission approuvée.');

        $absencePermission->delete();

        return redirect()->route('absence-permissions.index')
            ->with('message', 'Demande supprimée.');
    }
}
