<?php

namespace App\Http\Controllers\Eleves;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\School;
use App\Services\DocumentRenderer;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class RosterController extends Controller
{
    public function index(Request $request): Response
    {
        $yearId = $request->string('academic_year_id')->toString();
        $classId = $request->string('class_id')->toString();
        $statusF = $request->string('academic_status')->toString();
        $search = $request->string('search')->toString();

        $activeYear = AcademicYear::where('active', true)->first(['id', 'year']);
        $years = AcademicYear::orderByDesc('start_date')->get(['id', 'year', 'active']);

        // Année par défaut : celle demandée, sinon l'année active
        if ($yearId === '') {
            $yearId = $activeYear?->id ?? '';
        }

        $classrooms = Classroom::where('active', true)->orderBy('name')->get(['id', 'name', 'code']);

        $enrollments = collect();
        $stats = ['total' => 0, 'en_cours' => 0, 'valide' => 0, 'non_valide' => 0, 'abandon' => 0, 'transfere' => 0];

        if ($yearId && $classId) {
            $rows = Enrollment::query()
                ->with(['student:id,firstname,lastname,matricule,gender', 'invoice:id,enrollment_id,status'])
                ->where('academic_year_id', $yearId)
                ->where('class_id', $classId)
                ->when($statusF && array_key_exists($statusF, Enrollment::ACADEMIC_STATUSES), fn ($q) => $q->where('academic_status', $statusF))
                ->when($search, function ($q) use ($search) {
                    $like = '%'.strtolower($search).'%';
                    $q->whereHas('student', fn ($sq) => $sq->whereRaw("LOWER(lastname || ' ' || firstname) LIKE ?", [$like])
                        ->orWhereRaw('LOWER(matricule) LIKE ?', [$like]));
                })
                ->get();

            $enrollments = $rows
                ->sortBy(fn ($e) => $e->student?->lastname)
                ->map(fn ($e) => [
                    'id' => $e->id,
                    'student_id' => $e->student_id,
                    'student_name' => $e->student ? $e->student->lastname.' '.$e->student->firstname : '—',
                    'matricule' => $e->student?->matricule,
                    'gender' => $e->student?->gender,
                    'payment_status' => $e->invoice?->status ?? 'NONE',
                    'academic_status' => $e->academic_status ?? 'en_cours',
                    'status_reason' => $e->status_reason,
                ])->values();

            // Stats (sur l'ensemble de la classe/année, sans filtre statut)
            $all = Enrollment::where('academic_year_id', $yearId)->where('class_id', $classId)->get(['academic_status']);
            $stats['total'] = $all->count();
            foreach (array_keys(Enrollment::ACADEMIC_STATUSES) as $k) {
                $stats[$k] = $all->where('academic_status', $k)->count();
            }
        }

        return Inertia::render('Eleves/Roster/Index', [
            'years' => $years,
            'classrooms' => $classrooms,
            'enrollments' => $enrollments,
            'stats' => $stats,
            'statuses' => Enrollment::ACADEMIC_STATUSES,
            'filters' => [
                'academic_year_id' => $yearId,
                'class_id' => $classId,
                'academic_status' => $statusF,
                'search' => $search,
            ],
            'canManage' => $request->user()->can('edit_enrollments'),
        ]);
    }

    public function export(Request $request)
    {
        abort_unless($request->user()->can('export_roster'), 403);

        $validated = $request->validate([
            'academic_year_id' => ['required', 'uuid', 'exists:academic_years,id'],
            'class_id' => ['required', 'uuid', 'exists:classes,id'],
            'academic_status' => ['nullable', 'string'],
        ]);

        $year = AcademicYear::findOrFail($validated['academic_year_id']);
        $classroom = Classroom::findOrFail($validated['class_id']);
        $statusF = $validated['academic_status'] ?? '';

        $students = Enrollment::with('student:id,firstname,lastname,matricule,gender,birth_date')
            ->where('academic_year_id', $year->id)
            ->where('class_id', $classroom->id)
            ->when($statusF && array_key_exists($statusF, Enrollment::ACADEMIC_STATUSES), fn ($q) => $q->where('academic_status', $statusF))
            ->get()
            ->sortBy(fn ($e) => $e->student?->lastname)
            ->values();

        $school = School::where('active', true)->first() ?? School::query()->first();
        $renderer = app(DocumentRenderer::class);

        $pdf = Pdf::loadView('exports.roster', [
            'school' => $school,
            'headerHtml' => $school ? $renderer->headerHtml($school, $renderer->resolveVariables($school)) : '',
            'headerCss' => $renderer->headerCss(),
            'classroom' => $classroom,
            'year' => $year,
            'students' => $students,
            'statuses' => Enrollment::ACADEMIC_STATUSES,
        ])->setPaper('a4', 'portrait');

        return $pdf->stream('effectifs-'.Str::slug($classroom->name.'-'.$year->year).'.pdf');
    }

    public function updateStatus(Request $request, Enrollment $enrollment): RedirectResponse
    {
        abort_unless($request->user()->can('edit_enrollments'), 403);

        $validated = $request->validate([
            'academic_status' => ['required', 'in:en_cours,valide,non_valide,abandon,transfere'],
            'status_reason' => ['nullable', 'string', 'max:300'],
        ]);

        $enrollment->update([
            'academic_status' => $validated['academic_status'],
            'status_reason' => $validated['status_reason'] ?? null,
            'status_changed_at' => now(),
        ]);

        return back()->with('message', 'Statut de scolarité mis à jour.');
    }

    public function bulkStatus(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('edit_enrollments'), 403);

        $validated = $request->validate([
            'enrollment_ids' => ['required', 'array', 'min:1'],
            'enrollment_ids.*' => ['uuid', 'exists:enrollments,id'],
            'academic_status' => ['required', 'in:en_cours,valide,non_valide,abandon,transfere'],
        ]);

        DB::transaction(function () use ($validated): void {
            Enrollment::whereIn('id', $validated['enrollment_ids'])->update([
                'academic_status' => $validated['academic_status'],
                'status_changed_at' => now(),
            ]);
        });

        return back()->with('message', count($validated['enrollment_ids']).' inscription(s) mise(s) à jour.');
    }
}
