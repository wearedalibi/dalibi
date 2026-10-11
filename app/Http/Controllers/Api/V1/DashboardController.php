<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Models\AcademicPeriod;
use App\Models\AcademicYear;
use App\Models\AttendanceRecord;
use App\Models\CalendarEvent;
use App\Models\ClassroomType;
use App\Models\Enrollment;
use App\Models\GradingConfig;
use App\Models\Invoice;
use App\Models\ReportCard;
use App\Models\School;
use App\Models\Student;
use App\Services\GradingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Tableau de bord synthétique du portail parents/élèves : une carte de synthèse
 * par enfant (moyenne du trimestre en cours, assiduité, écolage, dernier bulletin)
 * + les prochains événements du calendrier.
 */
class DashboardController extends ApiController
{
    public function __construct(private readonly GradingService $grading) {}

    public function index(Request $request): JsonResponse
    {
        $year = AcademicYear::where('active', true)->first(['id', 'year', 'start_date', 'end_date']);
        $school = School::query()->first();
        $students = $this->accessibleStudents($request);

        $children = $students->map(fn (Student $student) => $this->childSummary($student, $year, $school))->values();

        $events = CalendarEvent::query()
            ->when($year, fn ($q) => $q->where('academic_year_id', $year->id))
            ->whereDate('start_date', '>=', now()->toDateString())
            ->orderBy('start_date')->orderBy('start_time')
            ->limit(5)
            ->get()
            ->map(fn (CalendarEvent $e) => [
                'id' => $e->id,
                'title' => $e->title,
                'type' => $e->type,
                'start_date' => $e->start_date?->format('Y-m-d'),
            ]);

        return response()->json([
            'year' => $year?->year,
            'children' => $children,
            'upcoming_events' => $events,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function childSummary(Student $student, ?AcademicYear $year, ?School $school): array
    {
        $enrollment = Enrollment::where('student_id', $student->id)
            ->when($year, fn ($q) => $q->where('academic_year_id', $year->id))
            ->where('status', Enrollment::STATUS_ACTIVE)
            ->with('classroom:id,name,code,classroom_type_id')
            ->first();

        $base = [
            'id' => $student->id,
            'name' => trim($student->firstname.' '.$student->lastname),
            'matricule' => $student->matricule,
            'class' => $enrollment?->classroom?->name,
            'enrolled' => (bool) $enrollment,
        ];

        // Moyenne / rang / mention du trimestre en cours.
        $average = $rank = $mention = null;
        if ($enrollment?->classroom) {
            $periods = AcademicPeriod::forClassType($year?->id, $enrollment->classroom->classroom_type_id);
            $periodId = ($periods->firstWhere('is_current', true)->id ?? $periods->first()?->id) ?? null;

            if ($periodId) {
                $config = GradingConfig::resolveOrDefault($school, ClassroomType::find($enrollment->classroom->classroom_type_id));
                $ranking = $this->grading->classRanking($enrollment->classroom, $periodId, $config);
                $me = $ranking->get($student->id);
                $average = $me['average'] ?? null;
                $rank = $me['rank'] ?? null;
                $mention = $this->grading->mention($average, $config);
            }
        }

        // Assiduité sur l'année.
        $records = AttendanceRecord::where('student_id', $student->id)
            ->when($year, fn ($q) => $q->whereHas('attendance', fn ($a) => $a
                ->whereBetween('date', [$year->start_date, $year->end_date])))
            ->get(['status']);
        $counts = $records->countBy('status');
        $total = $records->count();

        // Écolage.
        $invoices = Invoice::whereHas('enrollment', fn ($q) => $q->where('student_id', $student->id)
            ->when($year, fn ($q) => $q->where('academic_year_id', $year->id)))
            ->get(['id', 'total', 'amount_paid', 'amount_remaining']);

        // Dernier bulletin disponible.
        $lastCard = ReportCard::where('student_id', $student->id)
            ->orderByDesc('locked_at')
            ->first(['id', 'payload']);

        return array_merge($base, [
            'average' => $average,
            'rank' => $rank,
            'mention' => $mention,
            'attendance' => [
                'present' => (int) ($counts['present'] ?? 0),
                'absent' => (int) ($counts['absent'] ?? 0),
                'late' => (int) ($counts['late'] ?? 0),
                'excused' => (int) ($counts['excused'] ?? 0),
                'total' => $total,
                'rate' => $total > 0 ? round(((int) ($counts['present'] ?? 0)) / $total * 100) : null,
            ],
            'fees' => [
                'billed' => round((float) $invoices->sum('total'), 2),
                'paid' => round((float) $invoices->sum('amount_paid'), 2),
                'balance' => round((float) $invoices->sum('amount_remaining'), 2),
            ],
            'latest_bulletin' => $lastCard ? [
                'id' => $lastCard->id,
                'period' => $lastCard->payload['period']['name'] ?? null,
            ] : null,
        ]);
    }
}
