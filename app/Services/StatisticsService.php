<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Agrégations statistiques (socle V1) : effectifs & parité, finances & recouvrement,
 * réussite & examens officiels. Centralise la donnée pour la page ET les exports.
 *
 * Indicateurs 🇹🇬 : IPS (parité), taux de redoublement / abandon / promotion,
 * taux de recouvrement (dont Mobile Money), taux d'admission aux examens officiels.
 */
class StatisticsService
{
    /** Filtres normalisés. */
    private function filters(array $f): array
    {
        return [
            'year' => $f['academic_year_id'] ?? null,
            'class' => $f['class_id'] ?? null,
            'gender' => in_array($f['gender'] ?? null, ['male', 'female', 'other'], true) ? $f['gender'] : null,
        ];
    }

    /* ================= Effectifs & parité ================= */

    public function enrollmentStats(array $filters): array
    {
        $f = $this->filters($filters);

        $base = DB::table('enrollments')
            ->join('students', 'enrollments.student_id', '=', 'students.id')
            ->when($f['year'], fn ($q) => $q->where('enrollments.academic_year_id', $f['year']))
            ->when($f['class'], fn ($q) => $q->where('enrollments.class_id', $f['class']))
            ->when($f['gender'], fn ($q) => $q->where('students.gender', $f['gender']));

        // Répartition par sexe
        $byGender = (clone $base)
            ->selectRaw('students.gender AS gender, COUNT(DISTINCT students.id) AS total')
            ->groupBy('students.gender')
            ->pluck('total', 'gender');

        $male = (int) ($byGender['male'] ?? 0);
        $female = (int) ($byGender['female'] ?? 0);
        $other = (int) ($byGender['other'] ?? 0);
        $total = $male + $female + $other;

        // Effectifs par classe (avec cycle, pour le filtre côté client)
        $byClass = (clone $base)
            ->join('classes', 'enrollments.class_id', '=', 'classes.id')
            ->leftJoin('classroom_types', 'classroom_types.id', '=', 'classes.classroom_type_id')
            ->selectRaw('classes.name AS name, classroom_types.name AS cycle,
                COUNT(DISTINCT CASE WHEN students.gender = ? THEN students.id END) AS male,
                COUNT(DISTINCT CASE WHEN students.gender = ? THEN students.id END) AS female,
                COUNT(DISTINCT students.id) AS total', ['male', 'female'])
            ->groupBy('classes.name', 'classroom_types.name', 'classes.expected_age')
            ->orderByRaw('classes.expected_age NULLS LAST')
            ->orderBy('classes.name')
            ->get()
            ->map(fn ($r) => [
                'name' => $r->name,
                'cycle' => $this->cycleLabel($r->cycle),
                'male' => (int) $r->male,
                'female' => (int) $r->female,
                'total' => (int) $r->total,
            ]);

        // Répartition par statut académique (promotion / redoublement / abandon)
        $status = (clone $base)
            ->selectRaw('enrollments.academic_status AS s, COUNT(*) AS total')
            ->groupBy('enrollments.academic_status')
            ->pluck('total', 's');

        $valide = (int) ($status['valide'] ?? 0);
        $nonValide = (int) ($status['non_valide'] ?? 0);
        $abandon = (int) ($status['abandon'] ?? 0);
        $transfere = (int) ($status['transfere'] ?? 0);
        $enCours = (int) ($status['en_cours'] ?? 0);
        $decided = $valide + $nonValide + $abandon; // décisions de fin d'année
        $enrolTotal = $valide + $nonValide + $abandon + $transfere + $enCours;

        // Distribution des âges PAR SEXE (calcul PHP, portable pgsql/sqlite) —
        // alimente la pyramide des âges garçons/filles.
        $ageRows = (clone $base)
            ->whereNotNull('students.birth_date')
            ->get(['students.birth_date', 'students.gender']);
        $ageBuckets = [];
        $ages = [];
        foreach ($ageRows as $r) {
            $age = Carbon::parse($r->birth_date)->age;
            if ($age < 2 || $age > 30) {
                continue;
            }
            $ages[] = $age;
            $ageBuckets[$age] ??= ['male' => 0, 'female' => 0];
            if ($r->gender === 'male') {
                $ageBuckets[$age]['male']++;
            } elseif ($r->gender === 'female') {
                $ageBuckets[$age]['female']++;
            }
        }
        ksort($ageBuckets);
        $ageDistribution = collect($ageBuckets)->map(fn ($g, $a) => [
            'age' => (int) $a,
            'male' => $g['male'],
            'female' => $g['female'],
            'total' => $g['male'] + $g['female'],
        ])->values();
        $ages = collect($ages);

        // Origine géographique (top villes), ventilée par sexe
        $byCity = (clone $base)
            ->whereNotNull('students.city')
            ->where('students.city', '!=', '')
            ->selectRaw("students.city AS city,
                COUNT(DISTINCT students.id) AS total,
                COUNT(DISTINCT CASE WHEN students.gender = 'male' THEN students.id END) AS male,
                COUNT(DISTINCT CASE WHEN students.gender = 'female' THEN students.id END) AS female")
            ->groupBy('students.city')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn ($r) => ['city' => $r->city, 'male' => (int) $r->male, 'female' => (int) $r->female, 'total' => (int) $r->total]);

        $rate = fn (int $n, int $d) => $d > 0 ? round($n / $d * 100, 1) : 0.0;

        // Sur-âge (retard scolaire) : âge de l'élève supérieur à l'âge attendu de sa classe.
        $overAgeThreshold = 2;
        $ageRows = (clone $base)
            ->join('classes', 'enrollments.class_id', '=', 'classes.id')
            ->whereNotNull('students.birth_date')
            ->whereNotNull('classes.expected_age')
            ->get(['students.birth_date', 'classes.expected_age']);
        $overEval = $ageRows->count();
        $overCount = $ageRows->filter(fn ($r) => (Carbon::parse($r->birth_date)->age - (int) $r->expected_age) >= $overAgeThreshold)->count();

        return [
            'total' => $total,
            'gender' => ['male' => $male, 'female' => $female, 'other' => $other],
            'ips' => $male > 0 ? round($female / $male, 2) : ($female > 0 ? null : 0),
            'part_filles' => $rate($female, $total),
            'by_class' => $byClass,
            'academic_status' => [
                'valide' => $valide, 'non_valide' => $nonValide, 'abandon' => $abandon,
                'transfere' => $transfere, 'en_cours' => $enCours,
            ],
            'rates' => [
                'promotion' => $rate($valide, $decided),
                'redoublement' => $rate($nonValide, $decided),
                'abandon' => $rate($abandon, max($enrolTotal, 1)),
            ],
            'age_distribution' => $ageDistribution,
            'age_moyen' => $ages->count() ? round($ages->avg(), 1) : null,
            'by_city' => $byCity,
            'over_age' => [
                'evaluated' => $overEval,
                'count' => $overCount,
                'rate' => $overEval > 0 ? round($overCount / $overEval * 100, 1) : 0.0,
                'threshold' => $overAgeThreshold,
            ],
        ];
    }

    /* ================= Finances & recouvrement ================= */

    public function financeStats(array $filters): array
    {
        $f = $this->filters($filters);

        $inv = DB::table('invoices')
            ->join('enrollments', 'invoices.enrollment_id', '=', 'enrollments.id')
            ->when($f['year'], fn ($q) => $q->where('enrollments.academic_year_id', $f['year']))
            ->when($f['class'], fn ($q) => $q->where('enrollments.class_id', $f['class']));

        $stats = (clone $inv)->selectRaw("
            COUNT(invoices.id) AS total_invoices,
            COALESCE(SUM(invoices.total), 0) AS billed,
            COALESCE(SUM(invoices.amount_paid), 0) AS collected,
            COALESCE(SUM(invoices.amount_remaining), 0) AS remaining,
            COUNT(CASE WHEN invoices.status = 'PAID' THEN 1 END) AS paid_count,
            COUNT(CASE WHEN invoices.status = 'PARTIALLY_PAID' THEN 1 END) AS partial_count,
            COUNT(CASE WHEN invoices.status = 'ISSUED' THEN 1 END) AS unpaid_count
        ")->first();

        $billed = (float) ($stats->billed ?? 0);
        $collected = (float) ($stats->collected ?? 0);

        // Recouvrement par classe (avec cycle + reste, pour filtre et charts détaillés)
        $byClass = (clone $inv)
            ->join('classes', 'enrollments.class_id', '=', 'classes.id')
            ->leftJoin('classroom_types', 'classroom_types.id', '=', 'classes.classroom_type_id')
            ->selectRaw('classes.name AS name, classroom_types.name AS cycle,
                COALESCE(SUM(invoices.total), 0) AS billed,
                COALESCE(SUM(invoices.amount_paid), 0) AS collected,
                COALESCE(SUM(invoices.amount_remaining), 0) AS remaining')
            ->groupBy('classes.name', 'classroom_types.name', 'classes.expected_age')
            ->orderByRaw('classes.expected_age NULLS LAST')
            ->orderBy('classes.name')
            ->get()
            ->map(fn ($r) => [
                'name' => $r->name,
                'cycle' => $this->cycleLabel($r->cycle),
                'billed' => (float) $r->billed,
                'collected' => (float) $r->collected,
                'remaining' => (float) $r->remaining,
                'rate' => $r->billed > 0 ? round($r->collected / $r->billed * 100, 1) : 0.0,
            ]);

        // Répartition par mode de paiement (dont Mobile Money)
        $byMethod = DB::table('payments')
            ->join('invoices', 'payments.invoice_id', '=', 'invoices.id')
            ->join('enrollments', 'invoices.enrollment_id', '=', 'enrollments.id')
            ->when($f['year'], fn ($q) => $q->where('enrollments.academic_year_id', $f['year']))
            ->when($f['class'], fn ($q) => $q->where('enrollments.class_id', $f['class']))
            ->selectRaw('payments.payment_method AS method, COALESCE(SUM(payments.amount), 0) AS total, COUNT(*) AS count')
            ->groupBy('payments.payment_method')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => ['method' => $r->method, 'total' => (float) $r->total, 'count' => (int) $r->count]);

        // Évolution mensuelle (12 derniers mois) — driver-aware
        $driver = DB::getDriverName();
        $monthExpr = match ($driver) {
            'mysql' => "DATE_FORMAT(payments.paid_at, '%Y-%m')",
            'sqlite' => "strftime('%Y-%m', payments.paid_at)",
            default => "to_char(payments.paid_at, 'YYYY-MM')",
        };
        $monthly = DB::table('payments')
            ->join('invoices', 'payments.invoice_id', '=', 'invoices.id')
            ->join('enrollments', 'invoices.enrollment_id', '=', 'enrollments.id')
            ->when($f['year'], fn ($q) => $q->where('enrollments.academic_year_id', $f['year']))
            ->where('payments.paid_at', '>=', now()->subMonths(11)->startOfMonth())
            ->selectRaw("{$monthExpr} AS month, COALESCE(SUM(payments.amount), 0) AS total")
            ->groupByRaw($monthExpr)
            ->orderBy('month')
            ->get()
            ->map(fn ($r) => ['month' => $r->month, 'total' => (float) $r->total]);

        return [
            'billed' => $billed,
            'collected' => $collected,
            'remaining' => (float) ($stats->remaining ?? 0),
            'recovery_rate' => $billed > 0 ? round($collected / $billed * 100, 1) : 0.0,
            'total_invoices' => (int) ($stats->total_invoices ?? 0),
            'paid_count' => (int) ($stats->paid_count ?? 0),
            'partial_count' => (int) ($stats->partial_count ?? 0),
            'unpaid_count' => (int) ($stats->unpaid_count ?? 0),
            'by_class' => $byClass,
            'by_method' => $byMethod,
            'monthly' => $monthly,
        ];
    }

    /* ================= Réussite & examens officiels ================= */

    public function successStats(array $filters): array
    {
        $f = $this->filters($filters);

        // Bulletins validés (locked_at non nul)
        $rc = DB::table('report_cards')
            ->when($f['year'], fn ($q) => $q->where('academic_year_id', $f['year']))
            ->when($f['class'], fn ($q) => $q->where('class_id', $f['class']))
            ->whereNotNull('locked_at');

        $rcStats = (clone $rc)->selectRaw('
            COUNT(*) AS total,
            AVG(average) AS avg_moy,
            COUNT(CASE WHEN average >= 10 THEN 1 END) AS pass_count
        ')->first();

        // Les mentions sont stockées telles qu'affichées ("Très bien", "Assez bien"…),
        // selon le barème de l'école. On les replie vers les quatre paliers standard
        // en ignorant accents, casse et ponctuation — sinon la répartition reste vide
        // dès que le libellé n'est pas exactement la clé normalisée.
        $mentionRows = (clone $rc)
            ->whereNotNull('mention')->where('mention', '!=', '')
            ->selectRaw('mention, COUNT(*) AS total')
            ->groupBy('mention')
            ->get();

        $mentions = ['passable' => 0, 'assez_bien' => 0, 'bien' => 0, 'tres_bien' => 0];
        foreach ($mentionRows as $row) {
            $key = Str::of($row->mention)->ascii()->lower()->replaceMatches('/[^a-z0-9]+/', '_')->trim('_')->value();
            if (array_key_exists($key, $mentions)) {
                $mentions[$key] += (int) $row->total;
            }
        }

        $rcTotal = (int) ($rcStats->total ?? 0);

        // Examens officiels : inscriptions par examen + taux d'admission
        $exams = DB::table('official_exam_registrations AS r')
            ->join('official_exams AS e', 'r.official_exam_id', '=', 'e.id')
            ->when($f['year'], fn ($q) => $q->where('e.academic_year_id', $f['year']))
            ->selectRaw("
                e.name AS name, e.type AS type, e.center AS center,
                COUNT(*) AS registered,
                COUNT(CASE WHEN r.status = 'admis' THEN 1 END) AS admitted,
                COUNT(CASE WHEN r.status = 'echoue' THEN 1 END) AS failed,
                COUNT(CASE WHEN r.status = 'absent' THEN 1 END) AS absent
            ")
            ->groupBy('e.id', 'e.name', 'e.type', 'e.center')
            ->orderBy('e.type')
            ->get()
            ->map(function ($r) {
                $presented = (int) $r->admitted + (int) $r->failed;

                return [
                    'name' => $r->name,
                    'type' => $r->type,
                    'center' => $r->center,
                    'registered' => (int) $r->registered,
                    'admitted' => (int) $r->admitted,
                    'failed' => (int) $r->failed,
                    'absent' => (int) $r->absent,
                    'admission_rate' => $presented > 0 ? round($r->admitted / $presented * 100, 1) : 0.0,
                    'presentation_rate' => $r->registered > 0 ? round($presented / $r->registered * 100, 1) : 0.0,
                ];
            });

        // Agrégat global examens officiels
        $totReg = $exams->sum('registered');
        $totAdm = $exams->sum('admitted');
        $totPres = $exams->sum(fn ($e) => $e['admitted'] + $e['failed']);

        return [
            'bulletins' => $rcTotal,
            'moyenne_generale' => $rcStats->avg_moy !== null ? round((float) $rcStats->avg_moy, 2) : null,
            'pass_rate' => $rcTotal > 0 ? round(((int) $rcStats->pass_count) / $rcTotal * 100, 1) : 0.0,
            'mentions' => [
                'passable' => (int) ($mentions['passable'] ?? 0),
                'assez_bien' => (int) ($mentions['assez_bien'] ?? 0),
                'bien' => (int) ($mentions['bien'] ?? 0),
                'tres_bien' => (int) ($mentions['tres_bien'] ?? 0),
            ],
            'exams' => $exams,
            'exams_summary' => [
                'registered' => (int) $totReg,
                'admitted' => (int) $totAdm,
                'admission_rate' => $totPres > 0 ? round($totAdm / $totPres * 100, 1) : 0.0,
            ],
        ];
    }

    /* ================= Assiduité (phase 2) ================= */

    public function attendanceStats(array $filters): array
    {
        $f = $this->filters($filters);
        $threshold = 10; // seuil « absentéisme chronique »

        $base = DB::table('attendance_records AS ar')
            ->join('attendances AS a', 'ar.attendance_id', '=', 'a.id')
            ->join('academic_periods AS p', 'a.academic_period_id', '=', 'p.id')
            ->when($f['year'], fn ($q) => $q->where('p.academic_year_id', $f['year']))
            ->when($f['class'], fn ($q) => $q->where('a.class_id', $f['class']));

        if ($f['gender']) {
            $base->join('students AS s', 'ar.student_id', '=', 's.id')->where('s.gender', $f['gender']);
        }

        $c = (clone $base)->selectRaw("
            COUNT(*) AS total,
            COUNT(CASE WHEN ar.status = 'present' THEN 1 END) AS present,
            COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) AS absent,
            COUNT(CASE WHEN ar.status = 'late' THEN 1 END) AS late,
            COUNT(CASE WHEN ar.status = 'excused' THEN 1 END) AS excused
        ")->first();

        $total = (int) ($c->total ?? 0);
        $rate = fn (int $n) => $total > 0 ? round($n / $total * 100, 1) : 0.0;

        $byPeriod = (clone $base)
            ->selectRaw("p.name AS name,
                COUNT(CASE WHEN ar.status = 'present' THEN 1 END) AS present,
                COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) AS absent,
                COUNT(CASE WHEN ar.status = 'late' THEN 1 END) AS late")
            ->groupBy('p.name')
            ->orderByRaw('MIN(a.date)')
            ->get()
            ->map(fn ($r) => ['name' => $r->name, 'present' => (int) $r->present, 'absent' => (int) $r->absent, 'late' => (int) $r->late]);

        $byClass = (clone $base)
            ->join('classes AS c', 'a.class_id', '=', 'c.id')
            ->selectRaw("c.name AS name, COUNT(*) AS total, COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) AS absent")
            ->groupBy('c.name')
            ->get()
            ->map(fn ($r) => ['name' => $r->name, 'absence_rate' => $r->total > 0 ? round($r->absent / $r->total * 100, 1) : 0.0])
            ->sortByDesc('absence_rate')
            ->values();

        $chronic = (clone $base)
            ->where('ar.status', 'absent')
            ->groupBy('ar.student_id')
            ->havingRaw('COUNT(*) > ?', [$threshold])
            ->select('ar.student_id')
            ->get()
            ->count();

        return [
            'total' => $total,
            'present' => (int) ($c->present ?? 0),
            'absent' => (int) ($c->absent ?? 0),
            'late' => (int) ($c->late ?? 0),
            'excused' => (int) ($c->excused ?? 0),
            'presence_rate' => $rate((int) ($c->present ?? 0)),
            'absence_rate' => $rate((int) ($c->absent ?? 0)),
            'late_rate' => $rate((int) ($c->late ?? 0)),
            'chronic_absentees' => $chronic,
            'chronic_threshold' => $threshold,
            'by_period' => $byPeriod,
            'by_class' => $byClass,
        ];
    }

    /* ================= Encadrement & ressources (phase 2) ================= */

    public function resourcesStats(array $filters): array
    {
        $f = $this->filters($filters);
        $threshold = 50; // seuil « classe pléthorique »

        $students = DB::table('enrollments')
            ->when($f['year'], fn ($q) => $q->where('academic_year_id', $f['year']))
            ->when($f['class'], fn ($q) => $q->where('class_id', $f['class']))
            ->distinct()
            ->count('student_id');

        // Enseignants affectés (à l'échelle de l'école, sur l'année)
        $teachers = DB::table('subject_assignments')
            ->when($f['year'], fn ($q) => $q->where('academic_year_id', $f['year']))
            ->where('active', true)
            ->distinct()
            ->count('teacher_id');

        $sizes = DB::table('enrollments')
            ->join('classes', 'enrollments.class_id', '=', 'classes.id')
            ->when($f['year'], fn ($q) => $q->where('enrollments.academic_year_id', $f['year']))
            ->when($f['class'], fn ($q) => $q->where('enrollments.class_id', $f['class']))
            ->selectRaw('classes.name AS name, COUNT(*) AS total')
            ->groupBy('classes.name')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => ['name' => $r->name, 'total' => (int) $r->total]);

        $overcrowded = $sizes->filter(fn ($c) => $c['total'] > $threshold)->values();

        return [
            'total_students' => $students,
            'total_teachers' => $teachers,
            'rem' => $teachers > 0 ? round($students / $teachers, 1) : null,
            'class_count' => $sizes->count(),
            'avg_class_size' => $sizes->count() ? round($sizes->avg('total'), 1) : 0,
            'threshold' => $threshold,
            'overcrowded' => $overcrowded,
            'class_sizes' => $sizes,
        ];
    }

    /* ================= Comparaisons pluriannuelles (phase 2) ================= */

    /** Évolution des indicateurs clés d'une année à l'autre. */
    public function trendsStats(array $filters = []): array
    {
        $years = DB::table('academic_years')->orderBy('start_date')->get(['id', 'year']);

        $series = $years->map(function ($y) {
            $f = ['academic_year_id' => $y->id];
            $e = $this->enrollmentStats($f);
            $fin = $this->financeStats($f);
            $s = $this->successStats($f);

            return [
                'year' => $y->year,
                'effectif' => $e['total'],
                'part_filles' => $e['part_filles'],
                'redoublement' => $e['rates']['redoublement'],
                'abandon' => $e['rates']['abandon'],
                'recouvrement' => $fin['recovery_rate'],
                'reussite' => $s['pass_rate'],
                'admission' => $s['exams_summary']['admission_rate'],
            ];
        })->values();

        return ['series' => $series];
    }

    /* ================= Géographie (préfectures du Togo) ================= */

    public function geographyStats(array $filters): array
    {
        $f = $this->filters($filters);

        $base = DB::table('enrollments')
            ->join('students', 'enrollments.student_id', '=', 'students.id')
            ->when($f['year'], fn ($q) => $q->where('enrollments.academic_year_id', $f['year']))
            ->when($f['class'], fn ($q) => $q->where('enrollments.class_id', $f['class']))
            ->when($f['gender'], fn ($q) => $q->where('students.gender', $f['gender']));

        $byRegion = (clone $base)
            ->whereNotNull('students.region')->where('students.region', '!=', '')
            ->selectRaw('students.region AS name, COUNT(DISTINCT students.id) AS total')
            ->groupBy('students.region')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => ['name' => $r->name, 'total' => (int) $r->total]);

        $byPrefecture = (clone $base)
            ->whereNotNull('students.prefecture')->where('students.prefecture', '!=', '')
            ->selectRaw('students.prefecture AS name, students.region AS region, COUNT(DISTINCT students.id) AS total')
            ->groupBy('students.prefecture', 'students.region')
            ->orderByDesc('total')
            ->limit(40) // les 40 préfectures du Togo : la vue hiérarchique (treemap) doit être complète.
            ->get()
            ->map(fn ($r) => ['name' => $r->name, 'region' => $r->region, 'total' => (int) $r->total]);

        $total = (clone $base)->distinct()->count('students.id');
        $localized = (clone $base)->whereNotNull('students.region')->where('students.region', '!=', '')->distinct()->count('students.id');

        return [
            'total' => $total,
            'localized' => $localized,
            'coverage' => $total > 0 ? round($localized / $total * 100, 1) : 0.0,
            'by_region' => $byRegion,
            'by_prefecture' => $byPrefecture,
        ];
    }

    /* ================= Aiguillage ================= */

    /** Renvoie les données d'une section. */
    public function section(string $section, array $filters): array
    {
        return match ($section) {
            'finances' => $this->financeStats($filters),
            'reussite' => $this->successStats($filters),
            'encadrement' => $this->resourcesStats($filters),
            'assiduite' => $this->attendanceStats($filters),
            'comparaisons' => $this->trendsStats($filters),
            'geographie' => $this->geographyStats($filters),
            default => $this->enrollmentStats($filters),
        };
    }

    /** Cycle court à partir du libellé du type de classe (pour le filtre des charts). */
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
