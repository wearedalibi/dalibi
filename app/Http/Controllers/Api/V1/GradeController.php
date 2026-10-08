<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Models\AcademicPeriod;
use App\Models\AcademicYear;
use App\Models\ClassroomType;
use App\Models\ClassSubject;
use App\Models\Enrollment;
use App\Models\GradingConfig;
use App\Models\School;
use App\Services\GradingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GradeController extends ApiController
{
    public function __construct(private readonly GradingService $grading) {}

    public function index(Request $request, string $student): JsonResponse
    {
        $studentModel = $this->resolveStudent($request, $student);

        $year = AcademicYear::where('active', true)->first(['id', 'year']);
        $enrollment = Enrollment::where('student_id', $studentModel->id)
            ->when($year, fn ($q) => $q->where('academic_year_id', $year->id))
            ->where('status', Enrollment::STATUS_ACTIVE)
            ->with('classroom:id,name,code,classroom_type_id')
            ->first();

        if (! $enrollment) {
            return response()->json(['enrolled' => false, 'periods' => [], 'subjects' => []]);
        }

        $periods = AcademicPeriod::forClassType($year?->id, $enrollment->classroom?->classroom_type_id)
            ->map(fn ($p) => ['id' => $p->id, 'name' => $p->name, 'is_current' => (bool) $p->is_current])
            ->values();

        $periodId = $request->string('period')->toString()
            ?: (collect($periods)->firstWhere('is_current', true)['id'] ?? collect($periods)->first()['id'] ?? '');

        $subjects = [];
        $average = $rank = $mention = null;

        if ($periodId !== '') {
            $config = GradingConfig::resolveOrDefault(School::query()->first(), ClassroomType::find($enrollment->classroom?->classroom_type_id));
            $classSubjects = ClassSubject::where('class_id', $enrollment->class_id)
                ->when($year, fn ($q) => $q->where('academic_year_id', $year->id))
                ->with(['subject:id,name,code', 'grades' => fn ($q) => $q->where('student_id', $studentModel->id)->where('academic_period_id', $periodId)])
                ->get();

            $subjects = $classSubjects->map(fn ($cs) => [
                'subject' => $cs->subject?->name,
                'coefficient' => (float) $cs->coefficient,
                'score' => $cs->grades->first()?->score !== null ? (float) $cs->grades->first()->score : null,
                'rank' => $this->grading->subjectRanking($cs, $periodId, $config)->get($studentModel->id)['rank'] ?? null,
                'comment' => $cs->grades->first()?->comments,
            ])->values();

            if ($enrollment->classroom) {
                $ranking = $this->grading->classRanking($enrollment->classroom, $periodId, $config);
                $me = $ranking->get($studentModel->id);
                $average = $me['average'] ?? null;
                $rank = $me['rank'] ?? null;
                $mention = $this->grading->mention($average, $config);
            }
        }

        return response()->json([
            'enrolled' => true,
            'class' => $enrollment->classroom?->name,
            'period_id' => $periodId,
            'periods' => $periods,
            'average' => $average,
            'rank' => $rank,
            'mention' => $mention,
            'subjects' => $subjects,
        ]);
    }
}
