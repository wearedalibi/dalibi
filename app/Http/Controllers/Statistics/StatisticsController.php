<?php

namespace App\Http\Controllers\Statistics;

use App\Exports\StatisticsExport;
use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\School;
use App\Services\DocumentRenderer;
use App\Services\StatisticsService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class StatisticsController extends Controller
{
    private const SECTIONS = ['effectifs', 'finances', 'reussite', 'encadrement', 'assiduite', 'comparaisons', 'geographie'];

    public function __construct(private readonly StatisticsService $stats) {}

    public function index(Request $request): Response
    {
        $filters = $this->filters($request);

        return Inertia::render('Statistiques/Index', [
            'filters' => $filters,
            'academicYears' => AcademicYear::orderByDesc('start_date')->get(['id', 'year', 'active']),
            'classes' => Classroom::where('active', true)->orderBy('name')->get(['id', 'name']),
            'enrollment' => $this->stats->enrollmentStats($filters),
            'finance' => $this->stats->financeStats($filters),
            'success' => $this->stats->successStats($filters),
            'resources' => $this->stats->resourcesStats($filters),
            'attendance' => $this->stats->attendanceStats($filters),
            'trends' => $this->stats->trendsStats(),
            'geography' => $this->stats->geographyStats($filters),
        ]);
    }

    public function export(Request $request, string $section, string $format)
    {
        abort_unless($request->user()->can('export_statistics'), 403);
        abort_unless(in_array($section, self::SECTIONS, true), 404);

        $filters = $this->filters($request);
        $data = $this->stats->section($this->mapSection($section), $filters);
        $stamp = now()->format('Y-m-d');
        $file = "statistiques-{$section}-{$stamp}";

        if ($format === 'xlsx') {
            return Excel::download(new StatisticsExport($section, $data), "{$file}.xlsx");
        }

        if ($format === 'pdf') {
            $school = School::query()->first() ?? new School;
            $renderer = app(DocumentRenderer::class);
            $vars = $renderer->resolveVariables($school);

            $html = view('statistics.report', [
                'header' => $renderer->headerHtml($school, $vars),
                'headerCss' => $renderer->headerCss(),
                'section' => $section,
                'data' => $data,
                'year' => optional(AcademicYear::find($filters['academic_year_id']))->year,
                'date' => now()->locale('fr')->isoFormat('D MMMM YYYY'),
                'currency' => $school->currencySymbol(),
            ])->render();

            return Pdf::loadHTML($html)->setPaper('a4', 'portrait')->download("{$file}.pdf");
        }

        abort(404);
    }

    private function mapSection(string $section): string
    {
        return match ($section) {
            'finances' => 'finances',
            'reussite' => 'reussite',
            'encadrement' => 'encadrement',
            'assiduite' => 'assiduite',
            'comparaisons' => 'comparaisons',
            'geographie' => 'geographie',
            default => 'effectifs',
        };
    }

    /** @return array{academic_year_id: ?string, class_id: ?string, gender: ?string} */
    private function filters(Request $request): array
    {
        $activeYear = AcademicYear::where('active', true)->first();

        return [
            'academic_year_id' => $request->string('academic_year_id')->toString() ?: $activeYear?->id,
            'class_id' => $request->string('class_id')->toString() ?: null,
            'gender' => $request->string('gender')->toString() ?: null,
        ];
    }
}
