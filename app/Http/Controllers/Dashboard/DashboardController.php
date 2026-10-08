<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\AbsencePermission;
use App\Models\AcademicYear;
use App\Models\AccountingTransaction;
use App\Models\AttendanceRecord;
use App\Models\CashAccount;
use App\Models\Classroom;
use App\Models\ClassSubject;
use App\Models\DocumentIssuance;
use App\Models\Enrollment;
use App\Models\Evaluation;
use App\Models\Invoice;
use App\Models\OfficialExam;
use App\Models\OfficialExamRegistration;
use App\Models\Payment;
use App\Models\Student;
use App\Models\SubjectAssignment;
use App\Models\TimetableSlot;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = auth()->user();
        $activeYear = AcademicYear::where('active', true)->first();
        $years = AcademicYear::orderByDesc('start_date')->get(['id', 'year', 'active']);

        // Année sélectionnée via le filtre, par défaut l'année académique active
        $requested = $request->string('academic_year_id')->toString();
        $yearId = ($requested && $years->contains('id', $requested))
            ? $requested
            : $activeYear?->id;

        $selectedYear = $years->firstWhere('id', $yearId);

        $data = [
            'activeYear' => $activeYear ? ['id' => $activeYear->id, 'year' => $activeYear->year] : null,
            'selectedYearId' => $yearId,
            'selectedYear' => $selectedYear ? ['id' => $selectedYear->id, 'year' => $selectedYear->year] : null,
            'academicYears' => $years,
            'userRole' => $user->roles->first()?->name,
        ];

        /* ── Section financière (permission view_finances) ──────────────── */
        if ($user->can('view_finances')) {
            /* Statistiques globales factures */
            $stats = DB::table('invoices')
                ->join('enrollments', 'invoices.enrollment_id', '=', 'enrollments.id')
                ->when($yearId, fn ($q) => $q->where('enrollments.academic_year_id', $yearId))
                ->selectRaw("
                    COUNT(invoices.id)                                              AS total_invoices,
                    COALESCE(SUM(invoices.total), 0)                               AS total_amount,
                    COALESCE(SUM(invoices.amount_paid), 0)                         AS total_paid,
                    COALESCE(SUM(invoices.amount_remaining), 0)                    AS total_remaining,
                    COUNT(CASE WHEN invoices.status = 'PAID'           THEN 1 END) AS paid_count,
                    COUNT(CASE WHEN invoices.status = 'PARTIALLY_PAID' THEN 1 END) AS partial_count,
                    COUNT(CASE WHEN invoices.status = 'ISSUED'         THEN 1 END) AS issued_count
                ")
                ->first();

            /* Évolution mensuelle des paiements — 6 derniers mois */
            $driver = DB::getDriverName();
            $monthExpr = match ($driver) {
                'mysql' => "DATE_FORMAT(payments.paid_at, '%Y-%m')",
                'sqlite' => "strftime('%Y-%m', payments.paid_at)",
                default => "to_char(payments.paid_at, 'YYYY-MM')",
            };
            $monthLabelExpr = match ($driver) {
                'mysql' => "DATE_FORMAT(payments.paid_at, '%b %Y')",
                'sqlite' => "strftime('%m/%Y', payments.paid_at)",
                default => "to_char(payments.paid_at, 'Mon YYYY')",
            };

            $monthlyPayments = DB::table('payments')
                ->join('invoices', 'payments.invoice_id', '=', 'invoices.id')
                ->join('enrollments', 'invoices.enrollment_id', '=', 'enrollments.id')
                ->when($yearId, fn ($q) => $q->where('enrollments.academic_year_id', $yearId))
                ->where('payments.paid_at', '>=', now()->subMonths(5)->startOfMonth())
                ->selectRaw("
                    {$monthExpr} AS month,
                    {$monthLabelExpr} AS month_label,
                    COALESCE(SUM(payments.amount), 0) AS total
                ")
                ->groupByRaw("{$monthExpr}, {$monthLabelExpr}")
                ->orderBy('month')
                ->get();

            /* Soldes des caisses */
            $cashAccounts = CashAccount::where('active', true)
                ->orderBy('type')
                ->orderBy('name')
                ->get(['id', 'name', 'type', 'balance']);

            /* 5 derniers paiements */
            $recentPayments = Payment::with([
                'invoice.enrollment.student:id,firstname,lastname',
                'invoice.enrollment.classroom:id,name',
                'cashAccount:id,name,type',
            ])
                ->latest('paid_at')
                ->limit(5)
                ->get()
                ->map(fn ($p) => [
                    'id' => $p->id,
                    'amount' => (float) $p->amount,
                    'payment_method' => $p->payment_method,
                    'paid_at' => $p->paid_at?->toDateString(),
                    'cash_account' => $p->cashAccount?->name,
                    'student_name' => $p->invoice?->enrollment?->student
                        ? $p->invoice->enrollment->student->firstname.' '.$p->invoice->enrollment->student->lastname
                        : '—',
                    'class_name' => $p->invoice?->enrollment?->classroom?->name ?? '—',
                ]);

            /* Élèves avec aucun paiement (status ISSUED) — top 5 restant le + élevé */
            $studentsNoPay = Enrollment::with([
                'student:id,firstname,lastname,matricule',
                'classroom:id,name,code',
                'invoice:id,enrollment_id,total,amount_remaining,status',
            ])
                ->when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))
                ->whereHas('invoice', fn ($q) => $q->where('status', 'ISSUED'))
                ->orderByDesc(
                    Invoice::select('amount_remaining')
                        ->whereColumn('enrollment_id', 'enrollments.id')
                        ->limit(1)
                )
                ->limit(5)
                ->get();

            /* Ce mois-ci : encaissé, dépenses, solde net */
            $startMonth = now()->startOfMonth();
            $endMonth = now()->endOfMonth();

            $incomeMonth = DB::table('payments')
                ->join('invoices', 'payments.invoice_id', '=', 'invoices.id')
                ->join('enrollments', 'invoices.enrollment_id', '=', 'enrollments.id')
                ->when($yearId, fn ($q) => $q->where('enrollments.academic_year_id', $yearId))
                ->whereBetween('payments.paid_at', [$startMonth, $endMonth])
                ->sum('payments.amount');

            $expensesMonth = AccountingTransaction::where('type', 'EXPENSE')
                ->whereBetween('transaction_date', [$startMonth, $endMonth])
                ->sum('amount');

            /* Répartition des encaissements par moyen de paiement (année sélectionnée) */
            $methodRows = DB::table('payments')
                ->join('invoices', 'payments.invoice_id', '=', 'invoices.id')
                ->join('enrollments', 'invoices.enrollment_id', '=', 'enrollments.id')
                ->when($yearId, fn ($q) => $q->where('enrollments.academic_year_id', $yearId))
                ->selectRaw('payments.payment_method AS method, COALESCE(SUM(payments.amount), 0) AS total')
                ->groupBy('payments.payment_method')
                ->orderByDesc('total')
                ->get()
                ->map(fn ($r) => ['method' => $r->method ?? 'AUTRE', 'total' => (float) $r->total]);

            $data['financial'] = [
                'stats' => $stats,
                'monthlyPayments' => $monthlyPayments,
                'cashAccounts' => $cashAccounts,
                'recentPayments' => $recentPayments,
                'studentsNoPay' => $studentsNoPay,
                'month' => [
                    'income' => (float) $incomeMonth,
                    'expenses' => (float) $expensesMonth,
                    'net' => (float) $incomeMonth - (float) $expensesMonth,
                ],
                'paymentMethods' => $methodRows,
            ];
        }

        /* ── Section inscriptions (permission view_enrollments) ─────────── */
        if ($user->can('view_enrollments')) {
            $recentEnrollments = Enrollment::with([
                'student:id,firstname,lastname,matricule',
                'classroom:id,name,code',
            ])
                ->when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))
                ->latest('enrollment_date')
                ->limit(6)
                ->get()
                ->map(fn ($e) => [
                    'id' => $e->id,
                    'enrollment_code' => $e->enrollment_code,
                    'enrollment_date' => $e->enrollment_date?->toDateString(),
                    'status' => $e->status,
                    'student_name' => $e->student
                        ? $e->student->firstname.' '.$e->student->lastname
                        : '—',
                    'matricule' => $e->student?->matricule,
                    'class_name' => $e->classroom?->name ?? '—',
                    'class_code' => $e->classroom?->code ?? '—',
                ]);

            /* Répartition des inscriptions par classe (pour le graphe) */
            $enrollmentsByClass = Enrollment::query()
                ->join('classes', 'enrollments.class_id', '=', 'classes.id')
                ->when($yearId, fn ($q) => $q->where('enrollments.academic_year_id', $yearId))
                ->selectRaw('classes.name AS class_name, COUNT(*) AS total')
                ->groupBy('classes.name')
                ->orderByDesc('total')
                ->limit(8)
                ->get();

            /* Répartition par sexe (élèves inscrits sur l'année sélectionnée) */
            $genderRows = Enrollment::query()
                ->join('students', 'enrollments.student_id', '=', 'students.id')
                ->when($yearId, fn ($q) => $q->where('enrollments.academic_year_id', $yearId))
                ->selectRaw('students.gender AS gender, COUNT(DISTINCT students.id) AS total')
                ->groupBy('students.gender')
                ->pluck('total', 'gender');

            $data['enrollments'] = [
                'total_students' => Student::count(),
                'active_students' => Student::where('active', true)->count(),
                'students_by_gender' => [
                    'male' => (int) ($genderRows['male'] ?? 0),
                    'female' => (int) ($genderRows['female'] ?? 0),
                    'other' => (int) ($genderRows['other'] ?? 0),
                ],
                'active_classrooms' => Classroom::where('active', true)->count(),
                'total_users' => User::count(),
                'enrollments_year' => Enrollment::when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))->count(),
                'enrollments_week' => Enrollment::when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))
                    ->where('enrollment_date', '>=', now()->startOfWeek())
                    ->count(),
                'recentEnrollments' => $recentEnrollments,
                'byClass' => $enrollmentsByClass,
            ];
        }

        /* ── Section vie scolaire & pédagogie (permission view_attendances) ─ */
        if ($user->can('view_attendances')) {
            $today = now()->toDateString();

            $presentToday = AttendanceRecord::whereHas('attendance', fn ($q) => $q->where('date', $today))
                ->where('status', 'present')->count();
            $absentToday = AttendanceRecord::whereHas('attendance', fn ($q) => $q->where('date', $today))
                ->where('status', 'absent')->count();

            /* Demandes de permission en attente */
            $pendingPermissions = AbsencePermission::with('student:id,firstname,lastname')
                ->where('status', 'pending')
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn ($p) => [
                    'id' => $p->id,
                    'student_name' => $p->student ? $p->student->lastname.' '.$p->student->firstname : '—',
                    'reason' => $p->reason,
                    'start_date' => $p->start_date?->format('d/m/Y'),
                    'end_date' => $p->end_date?->format('d/m/Y'),
                ]);

            /* Prochains examens officiels */
            $upcomingExams = OfficialExam::withCount('registrations')
                ->whereNotNull('exam_date')
                ->where('exam_date', '>=', $today)
                ->orderBy('exam_date')
                ->limit(5)
                ->get()
                ->map(fn ($e) => [
                    'id' => $e->id,
                    'name' => $e->name,
                    'type' => $e->type,
                    'exam_date' => $e->exam_date?->format('d/m/Y'),
                    'center' => $e->center,
                    'registrations' => $e->registrations_count,
                ]);

            $data['academic'] = [
                'present_today' => $presentToday,
                'absent_today' => $absentToday,
                'pending_permissions' => AbsencePermission::where('status', 'pending')->count(),
                'documents_month' => DocumentIssuance::whereYear('issued_at', now()->year)
                    ->whereMonth('issued_at', now()->month)->count(),
                'exams_open' => OfficialExam::where('status', 'ouvert')->count(),
                'exam_registrations' => OfficialExamRegistration::count(),
                'pendingPermissions' => $pendingPermissions,
                'upcomingExams' => $upcomingExams,
            ];
        }

        /* ── Section enseignant : personnalisée (create_marks) ──────────── */
        if ($user->can('create_marks')) {
            $assignments = SubjectAssignment::with(['subject:id,name', 'classroom:id,name,code'])
                ->where('teacher_id', $user->id)
                ->when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))
                ->where('active', true)
                ->get();

            $myAssignments = $assignments->map(fn ($a) => [
                'id' => $a->id,
                'subject' => $a->subject?->name ?? '—',
                'class_id' => $a->class_id,
                'class_name' => $a->classroom?->name ?? '—',
                'class_code' => $a->classroom?->code ?? '—',
            ]);

            /* Emploi du temps du jour (1=lundi … 6=samedi) */
            $dow = (int) now()->dayOfWeekIso;
            $todaySlots = TimetableSlot::with(['subject:id,name', 'classroom:id,name'])
                ->where('teacher_id', $user->id)
                ->when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))
                ->where('day_of_week', $dow)
                ->orderBy('start_time')
                ->get()
                ->map(fn ($s) => [
                    'id' => $s->id,
                    'start_time' => substr((string) $s->start_time, 0, 5),
                    'end_time' => substr((string) $s->end_time, 0, 5),
                    'subject' => $s->subject?->name ?? '—',
                    'class_name' => $s->classroom?->name ?? '—',
                    'room' => $s->room,
                ]);

            /* Notes à saisir : ses évaluations non « terminées » (statut != completed) */
            $classSubjectIds = collect();
            if ($assignments->isNotEmpty()) {
                $classSubjectIds = ClassSubject::query()
                    ->when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))
                    ->where(function ($q) use ($assignments) {
                        foreach ($assignments as $a) {
                            $q->orWhere(fn ($w) => $w->where('class_id', $a->class_id)->where('subject_id', $a->subject_id));
                        }
                    })
                    ->pluck('id');
            }

            $pendingQuery = Evaluation::whereIn('class_subject_id', $classSubjectIds)
                ->where('status', '!=', 'completed');

            $pendingItems = (clone $pendingQuery)
                ->with(['classSubject.subject:id,name', 'classSubject.class:id,name', 'template:id,name'])
                ->orderByDesc('date')
                ->limit(6)
                ->get()
                ->map(fn ($e) => [
                    'id' => $e->id,
                    'name' => $e->template?->name ?? 'Évaluation',
                    'subject' => $e->classSubject?->subject?->name ?? '—',
                    'class_name' => $e->classSubject?->class?->name ?? '—',
                    'date' => $e->date?->format('d/m/Y'),
                ]);

            $data['teaching'] = [
                'assignments' => $myAssignments,
                'today' => $todaySlots,
                'pendingMarks' => [
                    'count' => (clone $pendingQuery)->count(),
                    'items' => $pendingItems,
                ],
            ];
        }

        return Inertia::render('dashboard', $data);
    }
}
