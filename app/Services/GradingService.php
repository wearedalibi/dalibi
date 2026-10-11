<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AcademicPeriod;
use App\Models\Classroom;
use App\Models\ClassSubject;
use App\Models\Enrollment;
use App\Models\Evaluation;
use App\Models\Grade;
use App\Models\GradingConfig;
use Illuminate\Support\Collection;

/**
 * Source unique de calcul des moyennes, rangs et mentions.
 *
 * Phase 1 : s'appuie sur la note consolidée de période ({@see Grade}), source actuelle du bulletin.
 * Phase 2 : la note matière sera dérivée du couple Classe/Composition selon la configuration.
 */
final class GradingService
{
    public function round(?float $value, GradingConfig $config): ?float
    {
        return $value === null ? null : round($value, $config->round_precision);
    }

    /** Note d'une matière pour un élève sur une période (note consolidée). */
    public function subjectScore(string $classSubjectId, string $studentId, string $periodId): ?float
    {
        $score = Grade::where('class_subject_id', $classSubjectId)
            ->where('student_id', $studentId)
            ->where('academic_period_id', $periodId)
            ->value('score');

        return $score !== null ? (float) $score : null;
    }

    /**
     * Moyenne générale de période, pondérée par le coefficient des matières.
     *
     * @param  Collection<int, ClassSubject>  $classSubjects
     * @return array{average: float|null, total_points: float, total_coeff: float}
     */
    public function periodAverage(string $studentId, string $periodId, Collection $classSubjects, GradingConfig $config): array
    {
        $scores = Grade::whereIn('class_subject_id', $classSubjects->pluck('id'))
            ->where('student_id', $studentId)
            ->where('academic_period_id', $periodId)
            ->whereNotNull('score')
            ->pluck('score', 'class_subject_id');

        return $this->weightedAverage($scores, $classSubjects->pluck('coefficient', 'id'), $config);
    }

    /**
     * Classement de période d'une classe (compétition standard, ex æquo gérés).
     *
     * @return Collection<string, array{average: float|null, rank: int|null}>
     */
    public function classRanking(Classroom $class, string $periodId, GradingConfig $config): Collection
    {
        $classSubjects = $class->classSubjects()->get(['id', 'coefficient']);
        $coeffs = $classSubjects->pluck('coefficient', 'id');

        $studentIds = $this->activeStudentIds($class->id);

        // Toutes les notes de la période pour ces matières, en une requête.
        $byStudent = Grade::whereIn('class_subject_id', $classSubjects->pluck('id'))
            ->where('academic_period_id', $periodId)
            ->whereNotNull('score')
            ->get(['student_id', 'class_subject_id', 'score'])
            ->groupBy('student_id');

        $rows = $studentIds->map(function ($studentId) use ($byStudent, $coeffs, $config) {
            $scores = $byStudent->get($studentId, collect())->pluck('score', 'class_subject_id');

            return [
                'student_id' => $studentId,
                'average' => $this->weightedAverage($scores, $coeffs, $config)['average'],
            ];
        });

        return $this->assignRanks($rows);
    }

    /**
     * Classement d'une matière sur une période.
     *
     * @return Collection<string, array{average: float|null, rank: int|null}>
     */
    public function subjectRanking(ClassSubject $classSubject, string $periodId, GradingConfig $config): Collection
    {
        $studentIds = $this->activeStudentIds($classSubject->class_id);

        $scores = Grade::where('class_subject_id', $classSubject->id)
            ->where('academic_period_id', $periodId)
            ->whereNotNull('score')
            ->pluck('score', 'student_id');

        $rows = $studentIds->map(fn ($studentId) => [
            'student_id' => $studentId,
            'average' => isset($scores[$studentId]) ? $this->round((float) $scores[$studentId], $config) : null,
        ]);

        return $this->assignRanks($rows);
    }

    /**
     * Moyenne annuelle pondérée par le poids des périodes (2 ou 3 selon le type de classe).
     *
     * @param  Collection<int, AcademicPeriod>  $periods
     * @param  Collection<int, ClassSubject>  $classSubjects
     */
    public function annualAverage(string $studentId, Collection $periods, Collection $classSubjects, GradingConfig $config): ?float
    {
        $totalWeight = 0.0;
        $weighted = 0.0;
        $hasAny = false;

        foreach ($periods as $period) {
            $avg = $this->periodAverage($studentId, $period->id, $classSubjects, $config)['average'];
            if ($avg === null) {
                continue;
            }
            $weight = (float) ($period->weight ?? 1);
            $totalWeight += $weight;
            $weighted += $avg * $weight;
            $hasAny = true;
        }

        return ($hasAny && $totalWeight > 0) ? $this->round($weighted / $totalWeight, $config) : null;
    }

    public function mention(?float $average, GradingConfig $config): ?string
    {
        return $config->mentionFor($average);
    }

    /**
     * Notes Classe (contrôle continu) et Composition d'une matière, dérivées des évaluations.
     * Chaque note est normalisée sur 20 et pondérée par le coefficient du modèle d'évaluation.
     *
     * @return array{classe: float|null, compo: float|null}
     */
    public function subjectClasseCompo(ClassSubject $classSubject, string $studentId, string $periodId): array
    {
        return [
            'classe' => $this->subjectAverageByType($classSubject, $studentId, $periodId, null, 'continu'),
            'compo' => $this->subjectAverageByType($classSubject, $studentId, $periodId, null, 'composition'),
        ];
    }

    /**
     * Moyenne d'une matière (normalisée /20, pondérée par le coefficient des évaluations) pour une
     * période, filtrée par type d'évaluation précis ($typeId) ou par catégorie ($category).
     * Sans filtre, agrège toutes les évaluations de la matière sur la période.
     */
    public function subjectAverageByType(
        ClassSubject $classSubject,
        string $studentId,
        string $periodId,
        ?string $typeId = null,
        ?string $category = null,
    ): ?float {
        $evaluations = $classSubject->evaluations()
            ->whereHas('template', function ($q) use ($periodId, $typeId, $category) {
                $q->where('academic_period_id', $periodId);
                if ($typeId) {
                    $q->where('evaluation_type_id', $typeId);
                }
                if ($category) {
                    $q->whereHas('evaluationType', fn ($t) => $t->where('category', $category));
                }
            })
            ->with([
                'template:id,coefficient,max_score',
                'marks' => fn ($q) => $q->where('student_id', $studentId),
            ])
            ->get();

        $weight = 0.0;
        $sum = 0.0;

        foreach ($evaluations as $evaluation) {
            $mark = $evaluation->marks->first();
            if (! $mark || $mark->absent || $mark->score === null) {
                continue;
            }

            $max = (float) ($evaluation->template->max_score ?: 20);
            $coeff = (float) ($evaluation->template->coefficient ?: 1);
            $normalized = $max > 0 ? ((float) $mark->score / $max) * 20 : 0.0;

            $weight += $coeff;
            $sum += $normalized * $coeff;
        }

        return $weight > 0 ? round($sum / $weight, 2) : null;
    }

    /*
    |---------------------------------------------------------------------------
    | Calcul par lot (index préchargé) — évite une requête par cellule.
    |---------------------------------------------------------------------------
    | Pour un bulletin de classe, les mêmes évaluations/notes sont sollicitées des
    | milliers de fois (matières × élèves × types × périodes). On précharge tout en
    | une requête puis on calcule 100 % en mémoire. La formule est identique à
    | {@see subjectAverageByType} : note normalisée /20, pondérée par le coefficient
    | du modèle d'évaluation.
    */

    /**
     * Précharge toutes les évaluations (modèle, type, notes des élèves ciblés) d'un ensemble de
     * matières sur un ensemble de périodes, en UNE requête. Retourne un index :
     * `[class_subject_id][period_id] = array<int, array{type_id, category, coeff, max, scores}>`.
     *
     * @param  Collection<int, ClassSubject>  $classSubjects
     * @param  array<int, string>  $studentIds
     * @param  array<int, string>  $periodIds
     * @return array<string, array<string, array<int, array{type_id: ?string, category: ?string, coeff: float, max: float, scores: array<string, float>}>>>
     */
    public function loadEvaluationIndex(Collection $classSubjects, array $studentIds, array $periodIds): array
    {
        if ($classSubjects->isEmpty() || $studentIds === [] || $periodIds === []) {
            return [];
        }

        $evaluations = Evaluation::whereIn('class_subject_id', $classSubjects->pluck('id'))
            ->whereHas('template', fn ($q) => $q->whereIn('academic_period_id', $periodIds))
            ->with([
                'template:id,academic_period_id,evaluation_type_id,coefficient,max_score',
                'template.evaluationType:id,category',
                'marks' => fn ($q) => $q->whereIn('student_id', $studentIds),
            ])
            ->get();

        $index = [];
        foreach ($evaluations as $evaluation) {
            $template = $evaluation->template;
            $periodId = $template?->academic_period_id;
            if ($periodId === null) {
                continue;
            }

            $scores = [];
            foreach ($evaluation->marks as $mark) {
                // Absent ou non noté : exclu (comme subjectAverageByType).
                if ($mark->absent || $mark->score === null) {
                    continue;
                }
                $scores[$mark->student_id] = (float) $mark->score;
            }

            $index[$evaluation->class_subject_id][$periodId][] = [
                'type_id' => $template->evaluation_type_id,
                'category' => $template->evaluationType?->category,
                'coeff' => (float) ($template->coefficient ?: 1),
                'max' => (float) ($template->max_score ?: 20),
                'scores' => $scores,
            ];
        }

        return $index;
    }

    /**
     * Moyenne d'une matière depuis l'index, filtrée par type précis ($typeId) ou catégorie
     * ($category). Équivalent en mémoire de {@see subjectAverageByType}.
     *
     * @param  array<string, array<string, array<int, array<string, mixed>>>>  $index
     */
    public function subjectAverageFromIndex(array $index, string $classSubjectId, string $studentId, string $periodId, ?string $typeId = null, ?string $category = null): ?float
    {
        $entries = $index[$classSubjectId][$periodId] ?? [];

        $weight = 0.0;
        $sum = 0.0;

        foreach ($entries as $e) {
            if ($typeId !== null && $e['type_id'] !== $typeId) {
                continue;
            }
            if ($category !== null && $e['category'] !== $category) {
                continue;
            }
            if (! array_key_exists($studentId, $e['scores'])) {
                continue;
            }

            $max = $e['max'] > 0 ? $e['max'] : 20;
            $coeff = $e['coeff'] > 0 ? $e['coeff'] : 1;
            $normalized = ($e['scores'][$studentId] / $max) * 20;

            $weight += $coeff;
            $sum += $normalized * $coeff;
        }

        return $weight > 0 ? round($sum / $weight, 2) : null;
    }

    /**
     * Notes Classe (continu) et Composition depuis l'index.
     *
     * @param  array<string, array<string, array<int, array<string, mixed>>>>  $index
     * @return array{classe: float|null, compo: float|null}
     */
    public function subjectClasseCompoFromIndex(array $index, string $classSubjectId, string $studentId, string $periodId): array
    {
        return [
            'classe' => $this->subjectAverageFromIndex($index, $classSubjectId, $studentId, $periodId, null, 'continu'),
            'compo' => $this->subjectAverageFromIndex($index, $classSubjectId, $studentId, $periodId, null, 'composition'),
        ];
    }

    /**
     * Moyenne générale de période (Classe/Compo) depuis l'index.
     *
     * @param  array<string, array<string, array<int, array<string, mixed>>>>  $index
     * @param  Collection<int, ClassSubject>  $classSubjects
     */
    public function periodAverageFromIndex(array $index, string $studentId, string $periodId, Collection $classSubjects, GradingConfig $config): ?float
    {
        $totalCoeff = 0.0;
        $weighted = 0.0;

        foreach ($classSubjects as $cs) {
            $cc = $this->subjectClasseCompoFromIndex($index, $cs->id, $studentId, $periodId);
            $moy = $this->combineClasseCompo($cc['classe'], $cc['compo'], $config);
            if ($moy === null) {
                continue;
            }
            $coeff = (float) $cs->coefficient;
            $totalCoeff += $coeff;
            $weighted += $moy * $coeff;
        }

        return $totalCoeff > 0 ? $this->round($weighted / $totalCoeff, $config) : null;
    }

    /**
     * Moyenne annuelle (pondérée par le poids des périodes) depuis l'index — cohérente avec les
     * moyennes de période (même source « évaluations », contrairement à {@see annualAverage}).
     *
     * @param  array<string, array<string, array<int, array<string, mixed>>>>  $index
     * @param  Collection<int, AcademicPeriod>  $periods
     * @param  Collection<int, ClassSubject>  $classSubjects
     */
    public function annualAverageFromIndex(array $index, string $studentId, Collection $periods, Collection $classSubjects, GradingConfig $config): ?float
    {
        $totalWeight = 0.0;
        $weighted = 0.0;

        foreach ($periods as $period) {
            $avg = $this->periodAverageFromIndex($index, $studentId, $period->id, $classSubjects, $config);
            if ($avg === null) {
                continue;
            }
            $weight = (float) ($period->weight ?? 1);
            $totalWeight += $weight;
            $weighted += $avg * $weight;
        }

        return $totalWeight > 0 ? $this->round($weighted / $totalWeight, $config) : null;
    }

    /** Combine note de classe et composition selon la pondération de la configuration. */
    public function combineClasseCompo(?float $classe, ?float $compo, GradingConfig $config): ?float
    {
        if ($classe === null && $compo === null) {
            return null;
        }
        if ($classe === null) {
            return $this->round($compo, $config);
        }
        if ($compo === null) {
            return $this->round($classe, $config);
        }

        $cw = (float) $config->class_weight;
        $pw = (float) $config->comp_weight;
        $total = $cw + $pw;

        return $total > 0 ? $this->round(($classe * $cw + $compo * $pw) / $total, $config) : null;
    }

    /** Moyenne matière (Classe/Compo combinées) à partir des évaluations. */
    public function subjectMoyenne(ClassSubject $classSubject, string $studentId, string $periodId, GradingConfig $config): ?float
    {
        $cc = $this->subjectClasseCompo($classSubject, $studentId, $periodId);

        return $this->combineClasseCompo($cc['classe'], $cc['compo'], $config);
    }

    /**
     * Moyenne générale de période calculée à partir des évaluations (Classe/Compo).
     *
     * @param  Collection<int, ClassSubject>  $classSubjects
     * @return array{average: float|null, total_points: float, total_coeff: float}
     */
    public function periodAverageFromEvaluations(string $studentId, string $periodId, Collection $classSubjects, GradingConfig $config): array
    {
        $totalCoeff = 0.0;
        $weighted = 0.0;

        foreach ($classSubjects as $classSubject) {
            $moyenne = $this->subjectMoyenne($classSubject, $studentId, $periodId, $config);
            if ($moyenne === null) {
                continue;
            }
            $coeff = (float) $classSubject->coefficient;
            $totalCoeff += $coeff;
            $weighted += $moyenne * $coeff;
        }

        return [
            'average' => $totalCoeff > 0 ? $this->round($weighted / $totalCoeff, $config) : null,
            'total_points' => round($weighted, $config->round_precision),
            'total_coeff' => $totalCoeff,
        ];
    }

    /**
     * Attribue des rangs à une liste [{student_id, average}].
     *
     * @param  Collection<int, array{student_id: mixed, average: float|null}>  $rows
     * @return Collection<string, array{average: float|null, rank: int|null}>
     */
    public function rank(Collection $rows): Collection
    {
        return $this->assignRanks($rows);
    }

    /**
     * @param  Collection<string, mixed>  $scores  note indexée par class_subject_id
     * @param  Collection<string, mixed>  $coeffs  coefficient indexé par class_subject_id
     * @return array{average: float|null, total_points: float, total_coeff: float}
     */
    private function weightedAverage(Collection $scores, Collection $coeffs, GradingConfig $config): array
    {
        $totalCoeff = 0.0;
        $weighted = 0.0;

        foreach ($scores as $classSubjectId => $score) {
            if ($score === null) {
                continue;
            }
            $coeff = (float) ($coeffs[$classSubjectId] ?? 1);
            $totalCoeff += $coeff;
            $weighted += (float) $score * $coeff;
        }

        return [
            'average' => $totalCoeff > 0 ? $this->round($weighted / $totalCoeff, $config) : null,
            'total_points' => round($weighted, $config->round_precision),
            'total_coeff' => $totalCoeff,
        ];
    }

    /** @return Collection<int, string> */
    private function activeStudentIds(string $classId): Collection
    {
        return Enrollment::where('class_id', $classId)
            ->where('status', Enrollment::STATUS_ACTIVE)
            ->pluck('student_id');
    }

    /**
     * Attribue les rangs (1, 1, 3…). Les élèves sans moyenne ne sont pas classés (rang null).
     *
     * @param  Collection<int, array{student_id: mixed, average: float|null}>  $rows
     * @return Collection<string, array{average: float|null, rank: int|null}>
     */
    private function assignRanks(Collection $rows): Collection
    {
        $sorted = $rows->sortByDesc(fn ($r) => $r['average'] ?? -1)->values();
        $result = collect();

        $rank = 0;
        $position = 0;
        $lastAvg = null;

        foreach ($sorted as $row) {
            $position++;

            if ($row['average'] === null) {
                $result[$row['student_id']] = ['average' => null, 'rank' => null];

                continue;
            }

            if ($lastAvg === null || $row['average'] < $lastAvg) {
                $rank = $position;
                $lastAvg = $row['average'];
            }

            $result[$row['student_id']] = ['average' => $row['average'], 'rank' => $rank];
        }

        return $result;
    }
}
