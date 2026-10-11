<?php

namespace App\Http\Controllers\Notes;

use App\Http\Controllers\Controller;
use App\Models\AcademicPeriod;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\GradingConfig;
use App\Models\ReportCard;
use App\Models\School;
use App\Models\Student;
use App\Services\BulletinRenderer;
use App\Services\GradingService;
use App\Services\ReportCardBuilder;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class BulletinController extends Controller
{
    public function __construct(
        private readonly GradingService $grading,
        private readonly ReportCardBuilder $builder,
    ) {}

    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('view_bulletins'), 403);

        $classId = $request->string('class_id')->toString();
        $periodId = $request->string('academic_period_id')->toString();
        $year = AcademicYear::where('active', true)->first(['id', 'year']);

        $classrooms = Classroom::where('active', true)->orderBy('name')->get(['id', 'name', 'classroom_type_id']);

        $periods = collect();
        if ($classId !== '') {
            $class = Classroom::find($classId, ['id', 'classroom_type_id']);
            $periods = AcademicPeriod::forClassType($year?->id, $class?->classroom_type_id)
                ->map(fn ($p) => ['id' => $p->id, 'name' => $p->name, 'is_current' => (bool) $p->is_current])
                ->values();
        }

        $rows = [];
        if ($classId !== '' && $periodId !== '') {
            $class = Classroom::with('classroomType')->findOrFail($classId);
            $config = GradingConfig::resolveOrDefault(School::query()->first(), $class->classroomType);
            $classSubjects = $this->builder->classSubjects($class, $year?->id);
            $students = $this->builder->activeStudents($classId, $year?->id);

            $index = $this->grading->loadEvaluationIndex($classSubjects, $students->pluck('id')->all(), [$periodId]);
            $averages = $students->map(fn ($s) => [
                'student_id' => $s->id,
                'average' => $this->grading->periodAverageFromIndex($index, $s->id, $periodId, $classSubjects, $config),
            ]);
            $ranking = $this->grading->rank($averages);

            $cards = ReportCard::where('academic_period_id', $periodId)
                ->whereIn('student_id', $students->pluck('id'))
                ->pluck('id', 'student_id');

            $rows = $students->map(function ($s) use ($ranking, $config, $cards) {
                $info = $ranking->get($s->id, ['average' => null, 'rank' => null]);

                return [
                    'student_id' => $s->id,
                    'name' => $s->lastname.' '.$s->firstname,
                    'matricule' => $s->matricule,
                    'average' => $info['average'],
                    'rank' => $info['rank'],
                    'mention' => $this->grading->mention($info['average'], $config),
                    'validated' => $cards->has($s->id),
                    'report_card_id' => $cards->get($s->id),
                ];
            })->values();
        }

        return Inertia::render('Notes/Bulletins/Index', [
            'classrooms' => $classrooms,
            'periods' => $periods,
            'rows' => $rows,
            'activeYear' => $year,
            'filters' => ['class_id' => $classId, 'academic_period_id' => $periodId],
        ]);
    }

    /** Valide (fige) les bulletins de toute la classe pour une période. */
    public function validateClass(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('validate_bulletins'), 403);

        $validated = $request->validate([
            'class_id' => ['required', 'uuid', 'exists:classes,id'],
            'academic_period_id' => ['required', 'uuid', 'exists:academic_periods,id'],
            'observations' => ['nullable', 'string', 'max:1000'],
            // Par défaut, une re-validation conserve les éditions manuelles (appréciations,
            // observations, décision, discipline). `regenerate=true` repart de zéro.
            'regenerate' => ['sometimes', 'boolean'],
        ]);

        $year = AcademicYear::where('active', true)->first();
        $class = Classroom::with('classroomType')->findOrFail($validated['class_id']);
        $period = AcademicPeriod::findOrFail($validated['academic_period_id']);

        $result = $this->builder->build(
            $class,
            $period,
            $year,
            $validated['observations'] ?? null,
            $request->boolean('regenerate'),
            $request->user()->id,
        );

        $message = "Bulletins validés pour {$result['effectif']} élève(s).";
        if ($result['preserved'] > 0) {
            $message .= " Éditions manuelles conservées sur {$result['preserved']} bulletin(s).";
        }

        return back()->with('message', $message);
    }

    public function download(Request $request, Student $student)
    {
        abort_unless($request->user()->can('download_bulletins'), 403);

        $periodId = $request->string('academic_period_id')->toString();

        $card = ReportCard::with('student')
            ->where('student_id', $student->id)
            ->where('academic_period_id', $periodId)
            ->firstOrFail();

        $school = School::query()->first() ?? new School;

        $html = app(BulletinRenderer::class)->render($card, $school);

        $filename = Str::slug('bulletin-'.$student->lastname.'-'.$student->firstname.'-'.($card->payload['period']['name'] ?? '')).'.pdf';

        return Pdf::loadHTML($html)->setPaper('a4', 'portrait')->download($filename);
    }

    /** Télécharge en un seul PDF tous les bulletins validés d'une classe pour une période. */
    public function downloadClass(Request $request)
    {
        abort_unless($request->user()->can('download_bulletins'), 403);

        $classId = $request->string('class_id')->toString();
        $periodId = $request->string('academic_period_id')->toString();

        $class = Classroom::findOrFail($classId);
        $period = AcademicPeriod::findOrFail($periodId);

        $cards = ReportCard::with('student')
            ->where('class_id', $classId)
            ->where('academic_period_id', $periodId)
            ->get()
            ->sortBy(fn ($c) => $c->payload['student']['name'] ?? '')
            ->values();

        abort_if($cards->isEmpty(), 404, 'Aucun bulletin validé pour cette classe et cette période.');

        $school = School::query()->first() ?? new School;
        $html = app(BulletinRenderer::class)->renderClass($cards, $school);

        $filename = Str::slug('bulletins-'.$class->name.'-'.($period->name ?? '')).'.pdf';

        return Pdf::loadHTML($html)->setPaper('a4', 'portrait')->download($filename);
    }

    /** Dévalide (supprime) un bulletin figé — ex. validation par erreur ou élève parti. */
    public function destroyCard(Request $request, ReportCard $reportCard): RedirectResponse
    {
        $this->authorize('delete', $reportCard);

        $classId = $reportCard->class_id;
        $periodId = $reportCard->academic_period_id;

        $reportCard->delete();

        return redirect()->route('bulletins.index', [
            'class_id' => $classId,
            'academic_period_id' => $periodId,
        ])->with('message', 'Bulletin dévalidé.');
    }

    /** Écran d'édition d'un bulletin validé (appréciations, observations, discipline). */
    public function editCard(Request $request, ReportCard $reportCard): Response
    {
        $this->authorize('update', $reportCard);

        $p = $reportCard->payload;

        return Inertia::render('Notes/Bulletins/Edit', [
            'card' => [
                'id' => $reportCard->id,
                'student' => $p['student'] ?? [],
                'period' => $p['period'] ?? [],
                'observations' => $p['observations'] ?? '',
                'decision' => $p['decision'] ?? ($p['mention'] ?? ''),
                'retards' => $p['retards'] ?? 0,
                'absences' => $p['absences'] ?? 0,
                'punitions' => $p['punitions'] ?? 0,
                'exclusions' => $p['exclusions'] ?? 0,
                'lines' => collect($p['lines'] ?? [])->map(fn ($l, $i) => [
                    'index' => $i,
                    'subject' => $l['subject'] ?? '',
                    'moyenne' => $l['moyenne'] ?? null,
                    'appreciation' => $l['appreciation'] ?? '',
                ])->values(),
            ],
        ]);
    }

    /** Enregistre les champs éditables dans le snapshot (sans recalcul des notes). */
    public function updateCard(Request $request, ReportCard $reportCard): RedirectResponse
    {
        $this->authorize('update', $reportCard);

        $validated = $request->validate([
            'appreciations' => ['array'],
            'appreciations.*' => ['nullable', 'string', 'max:255'],
            'observations' => ['nullable', 'string', 'max:1000'],
            'decision' => ['nullable', 'string', 'max:150'],
            'punitions' => ['nullable', 'integer', 'min:0'],
            'exclusions' => ['nullable', 'integer', 'min:0'],
        ]);

        $payload = $reportCard->payload;

        foreach ($validated['appreciations'] ?? [] as $index => $text) {
            if (isset($payload['lines'][$index])) {
                $payload['lines'][$index]['appreciation'] = $text ?? '';
            }
        }

        $payload['observations'] = $validated['observations'] ?? ($payload['observations'] ?? '');
        $payload['decision'] = $validated['decision'] ?? ($payload['decision'] ?? '');
        $payload['punitions'] = $validated['punitions'] ?? 0;
        $payload['exclusions'] = $validated['exclusions'] ?? 0;

        $reportCard->update(['payload' => $payload]);

        return redirect()->route('bulletins.index', [
            'class_id' => $reportCard->class_id,
            'academic_period_id' => $reportCard->academic_period_id,
        ])->with('message', 'Bulletin mis à jour.');
    }
}
