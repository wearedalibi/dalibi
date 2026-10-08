<?php

namespace App\Http\Controllers\Eleves;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Enrollment;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class StudentStatsController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless(
            $request->user()->can('view_students'),
            403
        );

        // Année sélectionnée (défaut = année active). Toutes les stats sont
        // scopées sur la cohorte des élèves inscrits (scolarité active) cette année-là.
        $academicYears = AcademicYear::orderByDesc('year')->get(['id', 'year', 'active']);
        $defaultYearId = optional($academicYears->firstWhere('active', true) ?? $academicYears->first())->id;
        $selectedYearId = $request->filled('academic_year_id')
            ? $request->string('academic_year_id')->toString()
            : $defaultYearId;
        $selectedYear = $academicYears->firstWhere('id', $selectedYearId);

        // Cohorte : élèves ayant une inscription à scolarité active pour l'année.
        $studentIds = $selectedYearId
            ? Enrollment::where('academic_year_id', $selectedYearId)
                ->whereIn('academic_status', Enrollment::ACTIVE_ACADEMIC_STATUSES)
                ->distinct()->pluck('student_id')
            : collect();

        $total = $studentIds->count();
        $active = Student::whereIn('id', $studentIds)->where('active', true)->count();

        // Répartition par sexe (cohorte)
        $byGender = [
            'male' => Student::whereIn('id', $studentIds)->where('gender', 'male')->count(),
            'female' => Student::whereIn('id', $studentIds)->where('gender', 'female')->count(),
        ];

        // Répartition par nationalité (top 6, cohorte)
        $byNationality = Student::query()
            ->whereIn('id', $studentIds)
            ->select('nationality', DB::raw('COUNT(*) as count'))
            ->whereNotNull('nationality')
            ->where('nationality', '!=', '')
            ->groupBy('nationality')
            ->orderByDesc('count')
            ->limit(6)
            ->get()
            ->map(fn ($r) => ['label' => $r->nationality, 'count' => (int) $r->count]);

        // Répartition par tranche d'âge (cohorte)
        $brackets = [
            'Moins de 6 ans' => 0,
            '6 à 10 ans' => 0,
            '11 à 14 ans' => 0,
            '15 à 18 ans' => 0,
            'Plus de 18 ans' => 0,
        ];
        $ages = [];
        foreach (Student::whereIn('id', $studentIds)->whereNotNull('birth_date')->pluck('birth_date') as $dob) {
            $age = Carbon::parse($dob)->age;
            $ages[] = $age;
            $key = match (true) {
                $age < 6 => 'Moins de 6 ans',
                $age <= 10 => '6 à 10 ans',
                $age <= 14 => '11 à 14 ans',
                $age <= 18 => '15 à 18 ans',
                default => 'Plus de 18 ans',
            };
            $brackets[$key]++;
        }
        $byAge = collect($brackets)->map(fn ($count, $label) => ['label' => $label, 'count' => $count])->values();
        $ageMoyen = $ages !== [] ? round(array_sum($ages) / count($ages), 1) : null;

        // Parité (indice IPS = filles / garçons).
        $femalePct = $total > 0 ? round($byGender['female'] / $total * 100, 1) : 0.0;
        $ips = $byGender['male'] > 0 ? round($byGender['female'] / $byGender['male'], 2) : null;

        // Sur-âge (retard scolaire) : âge de l'élève >= âge attendu de sa classe + 2.
        $overAgeThreshold = 2;
        $ageRows = Enrollment::query()
            ->join('classes', 'classes.id', '=', 'enrollments.class_id')
            ->join('students', 'students.id', '=', 'enrollments.student_id')
            ->where('enrollments.academic_year_id', $selectedYearId)
            ->whereIn('enrollments.academic_status', Enrollment::ACTIVE_ACADEMIC_STATUSES)
            ->whereNotNull('students.birth_date')
            ->whereNotNull('classes.expected_age')
            ->get(['students.birth_date', 'classes.expected_age']);
        $overEval = $ageRows->count();
        $overCount = $ageRows->filter(fn ($r) => (Carbon::parse($r->birth_date)->age - (int) $r->expected_age) >= $overAgeThreshold)->count();

        // Effectifs par classe (année sélectionnée, scolarité active), enrichis du
        // cycle, du sexe et de la capacité pour permettre filtre et empilage côté client.
        $byClass = $selectedYearId
            ? Enrollment::query()
                ->join('classes', 'classes.id', '=', 'enrollments.class_id')
                ->join('students', 'students.id', '=', 'enrollments.student_id')
                ->leftJoin('classroom_types', 'classroom_types.id', '=', 'classes.classroom_type_id')
                ->where('enrollments.academic_year_id', $selectedYearId)
                ->whereIn('enrollments.academic_status', Enrollment::ACTIVE_ACADEMIC_STATUSES)
                ->selectRaw("classes.name AS label, classroom_types.name AS cycle, classes.capacity AS capacity,
                    classes.expected_age AS level,
                    COUNT(*) AS total,
                    COUNT(CASE WHEN students.gender = 'male' THEN 1 END) AS male,
                    COUNT(CASE WHEN students.gender = 'female' THEN 1 END) AS female")
                ->groupBy('classes.name', 'classroom_types.name', 'classes.capacity', 'classes.expected_age')
                ->orderByRaw('classes.expected_age NULLS LAST')
                ->orderBy('classes.name')
                ->get()
                ->map(fn ($r) => [
                    'label' => $r->label,
                    'cycle' => $this->cycleLabel($r->cycle),
                    'capacity' => (int) $r->capacity,
                    'level' => $r->level !== null ? (int) $r->level : null,
                    'count' => (int) $r->total,
                    'male' => (int) $r->male,
                    'female' => (int) $r->female,
                ])
            : collect();

        return Inertia::render('Eleves/Students/Stats', [
            'summary' => [
                'enrolled' => $total,
                'active' => $active,
                'inactive' => $total - $active,
                'classes' => $byClass->count(),
            ],
            'byGender' => $byGender,
            'byNationality' => $byNationality,
            'byAge' => $byAge,
            'byClass' => $byClass,
            'parite' => ['female_pct' => $femalePct, 'ips' => $ips],
            'ageMoyen' => $ageMoyen,
            'overAge' => [
                'evaluated' => $overEval,
                'count' => $overCount,
                'rate' => $overEval > 0 ? round($overCount / $overEval * 100, 1) : 0.0,
            ],
            'academicYears' => $academicYears->map(fn ($y) => ['id' => $y->id, 'year' => $y->year])->values(),
            'selectedYear' => $selectedYear ? ['id' => $selectedYear->id, 'year' => $selectedYear->year] : null,
        ]);
    }

    /** Cycle court à partir du libellé du type de classe (pour le filtre). */
    private function cycleLabel(?string $type): string
    {
        $t = Str::lower($type ?? '');

        return match (true) {
            str_contains($t, 'maternelle') => 'Maternelle',
            str_contains($t, 'primaire') => 'Primaire',
            str_contains($t, 'collège') => 'Collège',
            str_contains($t, 'technique') => 'Lycée technique',
            str_contains($t, 'lycée') => 'Lycée',
            default => 'Autre',
        };
    }
}
