<?php

namespace App\Http\Controllers\Eleves;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\School;
use App\Services\InvoiceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PromotionController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('execute_promotion'), 403);

        $sourceYearId = $request->string('source_year_id')->toString();
        $sourceClassId = $request->string('source_class_id')->toString();
        $targetYearId = $request->string('target_year_id')->toString();

        $years = AcademicYear::orderByDesc('start_date')->get(['id', 'year', 'active']);
        $classrooms = Classroom::where('active', true)->orderBy('name')->get(['id', 'name', 'code']);

        $students = collect();
        $stats = ['total' => 0, 'valide' => 0, 'non_valide' => 0, 'deja_reinscrit' => 0];

        if ($sourceYearId && $sourceClassId) {
            // Élèves déjà réinscrits dans l'année cible (toutes classes)
            $alreadyTarget = $targetYearId
                ? Enrollment::where('academic_year_id', $targetYearId)->pluck('student_id')->all()
                : [];

            $rows = Enrollment::with('student:id,firstname,lastname,matricule')
                ->where('academic_year_id', $sourceYearId)
                ->where('class_id', $sourceClassId)
                ->get();

            $students = $rows
                ->sortBy(fn ($e) => $e->student?->lastname)
                ->map(fn ($e) => [
                    'enrollment_id' => $e->id,
                    'student_id' => $e->student_id,
                    'student_name' => $e->student ? $e->student->lastname.' '.$e->student->firstname : '—',
                    'matricule' => $e->student?->matricule,
                    'academic_status' => $e->academic_status ?? 'en_cours',
                    'already_enrolled' => in_array($e->student_id, $alreadyTarget, true),
                ])->values();

            $stats['total'] = $students->count();
            $stats['valide'] = $students->where('academic_status', 'valide')->count();
            $stats['non_valide'] = $students->where('academic_status', 'non_valide')->count();
            $stats['deja_reinscrit'] = $students->where('already_enrolled', true)->count();
        }

        return Inertia::render('Eleves/Promotion/Index', [
            'years' => $years,
            'classrooms' => $classrooms,
            'students' => $students,
            'stats' => $stats,
            'statuses' => Enrollment::ACADEMIC_STATUSES,
            'filters' => [
                'source_year_id' => $sourceYearId,
                'source_class_id' => $sourceClassId,
                'target_year_id' => $targetYearId,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('execute_promotion'), 403);

        $validated = $request->validate([
            'target_year_id' => ['required', 'uuid', 'exists:academic_years,id'],
            'target_class_id' => ['required', 'uuid', 'exists:classes,id'],
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['uuid', 'exists:students,id'],
        ]);

        $schoolId = School::query()->value('id');
        $invoiceService = app(InvoiceService::class);
        $created = 0;
        $skipped = 0;

        DB::transaction(function () use ($validated, $schoolId, $invoiceService, &$created, &$skipped): void {
            foreach ($validated['student_ids'] as $studentId) {
                // Évite les doublons : un élève déjà inscrit dans l'année cible est ignoré
                $exists = Enrollment::where('academic_year_id', $validated['target_year_id'])
                    ->where('student_id', $studentId)
                    ->exists();

                if ($exists) {
                    $skipped++;

                    continue;
                }

                $enrollment = Enrollment::create([
                    'school_id' => $schoolId,
                    'student_id' => $studentId,
                    'class_id' => $validated['target_class_id'],
                    'academic_year_id' => $validated['target_year_id'],
                    'enrollment_code' => $this->generateEnrollmentCode(),
                    'enrolled_by' => auth()->id(),
                    'enrollment_date' => now()->toDateString(),
                    'status' => 'unpaid',
                    'academic_status' => 'en_cours',
                ]);

                // Génère la facture des frais de la nouvelle année (best-effort)
                try {
                    $invoiceService->createFromEnrollment($enrollment);
                } catch (\Throwable) {
                    // Pas de structure de frais configurée : l'inscription reste valide
                }

                $created++;
            }
        });

        $msg = "{$created} élève(s) réinscrit(s)."
            .($skipped > 0 ? " {$skipped} ignoré(s) (déjà inscrits)." : '');

        return back()->with('message', $msg);
    }

    private function generateEnrollmentCode(): string
    {
        do {
            $code = 'INS-'.now()->format('Y').'-'.str_pad((string) random_int(1, 99999), 5, '0', STR_PAD_LEFT);
        } while (Enrollment::where('enrollment_code', $code)->exists());

        return $code;
    }
}
