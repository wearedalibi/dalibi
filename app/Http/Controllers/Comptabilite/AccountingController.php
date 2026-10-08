<?php

namespace App\Http\Controllers\Comptabilite;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\AccountingTransaction;
use App\Models\CashAccount;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AccountingController extends Controller
{
    public function index(Request $request): Response
    {
        $yearId = $request->string('academic_year_id')->toString() ?: null;
        $classId = $request->string('class_id')->toString() ?: null;

        if (! $yearId) {
            $activeYear = AcademicYear::where('active', true)->first()
                ?? AcademicYear::orderByDesc('year')->first();
            $yearId = $activeYear?->id;
        }

        $academicYears = AcademicYear::orderByDesc('year')->get(['id', 'year', 'active']);
        $classrooms = Classroom::where('active', true)->orderBy('name')->get(['id', 'name', 'code']);

        /* -------------------------------------------------------------- */
        /* Stats globales pour l'année */
        /* -------------------------------------------------------------- */
        $globalStats = DB::table('invoices')
            ->join('enrollments', 'invoices.enrollment_id', '=', 'enrollments.id')
            ->where('enrollments.academic_year_id', $yearId)
            ->when($classId, fn ($q) => $q->where('enrollments.class_id', $classId))
            ->selectRaw("
                count(invoices.id)                                                        as total_invoices,
                coalesce(sum(invoices.total), 0)                                          as total_amount,
                coalesce(sum(invoices.amount_paid), 0)                                    as total_paid,
                coalesce(sum(invoices.amount_remaining), 0)                               as total_remaining,
                count(case when invoices.status = 'PAID'           then 1 end)            as paid_count,
                count(case when invoices.status = 'PARTIALLY_PAID' then 1 end)            as partial_count,
                count(case when invoices.status = 'ISSUED'         then 1 end)            as issued_count,
                count(case when invoices.status = 'CANCELLED'      then 1 end)            as cancelled_count
            ")
            ->first();

        /* -------------------------------------------------------------- */
        /* Évolution mensuelle des paiements — format portable multi-DB */
        /* -------------------------------------------------------------- */
        $driver = DB::getDriverName();

        $monthExpr = match ($driver) {
            'mysql' => "DATE_FORMAT(payments.paid_at, '%Y-%m')",
            'sqlite' => "strftime('%Y-%m', payments.paid_at)",
            default => "to_char(payments.paid_at, 'YYYY-MM')",   // pgsql
        };
        $monthLabelExpr = match ($driver) {
            'mysql' => "DATE_FORMAT(payments.paid_at, '%b %Y')",
            'sqlite' => "strftime('%m/%Y', payments.paid_at)",
            default => "to_char(payments.paid_at, 'Mon YYYY')",   // pgsql
        };

        $monthlyPayments = DB::table('payments')
            ->join('invoices', 'payments.invoice_id', '=', 'invoices.id')
            ->join('enrollments', 'invoices.enrollment_id', '=', 'enrollments.id')
            ->where('enrollments.academic_year_id', $yearId)
            ->when($classId, fn ($q) => $q->where('enrollments.class_id', $classId))
            ->selectRaw("
                {$monthExpr} as month,
                {$monthLabelExpr} as month_label,
                coalesce(sum(payments.amount), 0) as total
            ")
            ->groupByRaw("{$monthExpr}, {$monthLabelExpr}")
            ->orderBy('month')
            ->get();

        /* -------------------------------------------------------------- */
        /* Répartition par classe */
        /* -------------------------------------------------------------- */
        $byClass = DB::table('invoices')
            ->join('enrollments', 'invoices.enrollment_id', '=', 'enrollments.id')
            ->join('classes', 'enrollments.class_id', '=', 'classes.id')
            ->where('enrollments.academic_year_id', $yearId)
            ->when($classId, fn ($q) => $q->where('enrollments.class_id', $classId))
            ->groupBy('classes.id', 'classes.name', 'classes.code')
            ->selectRaw("
                classes.id                                                                as class_id,
                classes.name                                                              as class_name,
                classes.code                                                              as class_code,
                count(invoices.id)                                                        as total_enrollments,
                coalesce(sum(invoices.total), 0)                                          as total_amount,
                coalesce(sum(invoices.amount_paid), 0)                                    as amount_paid,
                coalesce(sum(invoices.amount_remaining), 0)                               as amount_remaining,
                count(case when invoices.status = 'PAID'           then 1 end)            as paid_count,
                count(case when invoices.status = 'ISSUED'         then 1 end)            as issued_count,
                count(case when invoices.status = 'PARTIALLY_PAID' then 1 end)            as partial_count
            ")
            ->orderByDesc('amount_remaining')
            ->get();

        /* -------------------------------------------------------------- */
        /* Élèves avec solde impayé — tri SQL via sous-requête corrélée */
        /* -------------------------------------------------------------- */
        // Limité aux plus gros soldes (perf + lisibilité) ; le total sert au « Voir tout ».
        $unpaidQuery = Enrollment::where('academic_year_id', $yearId)
            ->when($classId, fn ($q) => $q->where('class_id', $classId))
            ->whereHas('invoice', fn ($q) => $q->whereIn('status', ['ISSUED', 'PARTIALLY_PAID'])
                ->where('amount_remaining', '>', 0)
            );

        $studentsUnpaidTotal = (clone $unpaidQuery)->count();

        $studentsUnpaid = $unpaidQuery
            ->with([
                'student:id,firstname,lastname,matricule',
                'classroom:id,name,code',
                'invoice:id,enrollment_id,invoice_number,total,amount_paid,amount_remaining,status',
            ])
            ->orderByDesc(
                Invoice::select('amount_remaining')
                    ->whereColumn('enrollment_id', 'enrollments.id')
                    ->limit(1)
            )
            ->limit(15)
            ->get();

        /* -------------------------------------------------------------- */
        /* Soldes des caisses + stats de transactions */
        /* -------------------------------------------------------------- */
        $cashAccounts = CashAccount::where('active', true)
            ->orderBy('type')
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'balance']);

        $transactionStats = AccountingTransaction::selectRaw("
            coalesce(sum(case when type = 'INCOME'  then amount end), 0) as total_income,
            coalesce(sum(case when type = 'EXPENSE' then amount end), 0) as total_expense
        ")->first();

        return Inertia::render('Comptabilite/Accounting/Dashboard', [
            'academicYears' => $academicYears,
            'classrooms' => $classrooms,
            'filters' => [
                'academic_year_id' => $yearId,
                'class_id' => $classId,
            ],
            'globalStats' => $globalStats,
            'monthlyPayments' => $monthlyPayments,
            'byClass' => $byClass,
            'studentsUnpaid' => $studentsUnpaid,
            'studentsUnpaidTotal' => $studentsUnpaidTotal,
            'cashAccounts' => $cashAccounts,
            'transactionStats' => $transactionStats,
        ]);
    }
}
