<?php

namespace App\Http\Controllers\Comptabilite;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SituationController extends Controller
{
    public function index(Request $request)
    {
        $yearId = $request->academic_year_id;
        $classId = $request->class_id;

        $academicYears = AcademicYear::orderBy('year', 'desc')->get(['id', 'year', 'active']);
        $classrooms = Classroom::orderBy('name')->get(['id', 'name', 'code']);

        /* ── Résumé par classe (SQL) ── */
        $byClass = DB::table('enrollments')
            ->join('classes', 'enrollments.class_id', '=', 'classes.id')
            ->leftJoin('invoices', 'enrollments.id', '=', 'invoices.enrollment_id')
            ->when($yearId, fn ($q) => $q->where('enrollments.academic_year_id', $yearId))
            ->when($classId, fn ($q) => $q->where('enrollments.class_id', $classId))
            ->groupBy('classes.id', 'classes.name', 'classes.code')
            ->selectRaw("
                classes.id                                                                 AS class_id,
                classes.name                                                               AS class_name,
                classes.code                                                               AS class_code,
                COUNT(enrollments.id)                                                      AS total_students,
                COALESCE(SUM(invoices.total), 0)                                           AS total_amount,
                COALESCE(SUM(invoices.amount_paid), 0)                                     AS amount_paid,
                COALESCE(SUM(invoices.amount_remaining), 0)                                AS amount_remaining,
                SUM(CASE WHEN invoices.status = 'PAID'           THEN 1 ELSE 0 END)        AS paid_count,
                SUM(CASE WHEN invoices.status = 'PARTIALLY_PAID' THEN 1 ELSE 0 END)        AS partial_count,
                SUM(CASE WHEN invoices.status = 'ISSUED'         THEN 1 ELSE 0 END)        AS issued_count,
                SUM(CASE WHEN invoices.status = 'CANCELLED'      THEN 1 ELSE 0 END)        AS cancelled_count
            ")
            ->orderBy('classes.name')
            ->get();

        /* ── Stats globales (SQL) ── */
        $globalStatsRaw = DB::table('enrollments')
            ->leftJoin('invoices', 'enrollments.id', '=', 'invoices.enrollment_id')
            ->when($yearId, fn ($q) => $q->where('enrollments.academic_year_id', $yearId))
            ->when($classId, fn ($q) => $q->where('enrollments.class_id', $classId))
            ->selectRaw("
                COUNT(enrollments.id)                                                       AS total_students,
                COALESCE(SUM(invoices.total), 0)                                            AS total_amount,
                COALESCE(SUM(invoices.amount_paid), 0)                                      AS amount_paid,
                COALESCE(SUM(invoices.amount_remaining), 0)                                 AS amount_remaining,
                SUM(CASE WHEN invoices.status = 'PAID'           THEN 1 ELSE 0 END)         AS paid_count,
                SUM(CASE WHEN invoices.status = 'PARTIALLY_PAID' THEN 1 ELSE 0 END)         AS partial_count,
                SUM(CASE WHEN invoices.status = 'ISSUED'         THEN 1 ELSE 0 END)         AS issued_count
            ")
            ->first();

        $globalStats = [
            'total_students' => (int) ($globalStatsRaw->total_students ?? 0),
            'total_amount' => (float) ($globalStatsRaw->total_amount ?? 0),
            'amount_paid' => (float) ($globalStatsRaw->amount_paid ?? 0),
            'amount_remaining' => (float) ($globalStatsRaw->amount_remaining ?? 0),
            'paid_count' => (int) ($globalStatsRaw->paid_count ?? 0),
            'partial_count' => (int) ($globalStatsRaw->partial_count ?? 0),
            'issued_count' => (int) ($globalStatsRaw->issued_count ?? 0),
        ];

        /* ── Liste élèves (uniquement quand une classe est sélectionnée) ── */
        $students = collect();
        if ($classId) {
            $students = Enrollment::with([
                'student:id,firstname,lastname,matricule',
                'invoice:id,enrollment_id,invoice_number,total,amount_paid,amount_remaining,status',
            ])
                ->where('class_id', $classId)
                ->when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))
                ->orderByDesc(
                    Invoice::select('amount_remaining')
                        ->whereColumn('enrollment_id', 'enrollments.id')
                        ->limit(1)
                )
                ->get()
                ->map(fn ($e) => [
                    'enrollment_id' => $e->id,
                    'enrollment_code' => $e->enrollment_code,
                    'student_id' => $e->student?->id,
                    'firstname' => $e->student?->firstname,
                    'lastname' => $e->student?->lastname,
                    'matricule' => $e->student?->matricule,
                    'invoice_number' => $e->invoice?->invoice_number,
                    'total' => (float) ($e->invoice?->total ?? 0),
                    'amount_paid' => (float) ($e->invoice?->amount_paid ?? 0),
                    'amount_remaining' => (float) ($e->invoice?->amount_remaining ?? 0),
                    'status' => $e->invoice?->status ?? 'ISSUED',
                ]);
        }

        return Inertia::render('Comptabilite/Accounting/Situation', [
            'academicYears' => $academicYears,
            'classrooms' => $classrooms,
            'filters' => [
                'academic_year_id' => $yearId,
                'class_id' => $classId,
            ],
            'globalStats' => $globalStats,
            'byClass' => $byClass,
            'students' => $students,
        ]);
    }

    /**
     * Export CSV : toute la classe ou uniquement les impayés.
     */
    public function export(Request $request)
    {
        $yearId = $request->academic_year_id;
        $classId = $request->class_id;
        $type = $request->get('type', 'all');

        $query = Enrollment::with(['student:id,firstname,lastname,matricule', 'classroom:id,name', 'invoice:id,enrollment_id,invoice_number,total,amount_paid,amount_remaining,status'])
            ->when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))
            ->when($classId, fn ($q) => $q->where('class_id', $classId));

        if ($type === 'unpaid') {
            $query->whereHas('invoice', fn ($q) => $q->whereIn('status', ['ISSUED', 'PARTIALLY_PAID']));
        }

        $suffix = $type === 'unpaid' ? 'impayes' : 'complet';
        $date = now()->format('Y-m-d');
        $filename = "situation_{$suffix}_{$date}.csv";

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'no-cache, no-store',
        ];

        $enrollments = $query->orderBy('enrollments.created_at')->cursor();

        $callback = function () use ($enrollments) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [
                'Matricule', 'Nom', 'Prénom', 'Classe',
                'N° Facture', 'Total (F)', 'Payé (F)', 'Reste (F)', 'Statut',
            ], ';');

            foreach ($enrollments as $e) {
                $inv = $e->invoice;
                fputcsv($out, [
                    $e->student?->matricule ?? '—',
                    $e->student?->lastname ?? '—',
                    $e->student?->firstname ?? '—',
                    $e->classroom?->name ?? '—',
                    $inv?->invoice_number ?? '—',
                    number_format((float) ($inv?->total ?? 0), 0, ',', ' '),
                    number_format((float) ($inv?->amount_paid ?? 0), 0, ',', ' '),
                    number_format((float) ($inv?->amount_remaining ?? 0), 0, ',', ' '),
                    $this->statusLabel($inv?->status),
                ], ';');
            }

            fclose($out);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function statusLabel(?string $status): string
    {
        return match ($status) {
            'PAID' => 'Soldé',
            'PARTIALLY_PAID' => 'Partiel',
            'ISSUED' => 'Non payé',
            'CANCELLED' => 'Annulé',
            default => '—',
        };
    }
}
