<?php

namespace App\Services;

use App\Models\AcademicPeriod;
use App\Models\AcademicYear;
use App\Models\AttendanceRecord;
use App\Models\BulletinTemplate;
use App\Models\Classroom;
use App\Models\ClassSubject;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\GradingConfig;
use App\Models\ReportCard;
use App\Models\School;
use App\Models\Student;
use App\Models\SubjectAssignment;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Construit et fige les bulletins (report_cards) d'une classe pour une période :
 * agrégation des notes (via {@see GradingService}), classements, snapshot du payload
 * et persistance. Sorti du contrôleur pour rester testable et lisible.
 */
final class ReportCardBuilder
{
    public function __construct(private readonly GradingService $grading) {}

    /**
     * Valide (fige) les bulletins de toute la classe pour une période.
     *
     * @return array{effectif: int, preserved: int}
     */
    public function build(
        Classroom $class,
        AcademicPeriod $period,
        ?AcademicYear $year,
        ?string $observations,
        bool $regenerate,
        string $generatedBy,
    ): array {
        $school = School::query()->first();
        $config = GradingConfig::resolveOrDefault($school, $class->classroomType);
        $template = BulletinTemplate::resolveOrDefault($school, $class->classroomType);
        $typeIds = $template->referencedEvaluationTypeIds();

        $classSubjects = $this->classSubjects($class, $year?->id);
        $students = $this->activeStudents($class->id, $year?->id);
        $effectif = $students->count();

        // Toutes les périodes du type de classe (récap inter-périodes + moyenne annuelle).
        $allPeriods = AcademicPeriod::forClassType($year?->id, $class->classroom_type_id);

        // Préchargement en mémoire (UNE requête) de toutes les évaluations/notes utiles :
        // tous les calculs ci-dessous se font ensuite sans requête par cellule.
        $index = $this->grading->loadEvaluationIndex(
            $classSubjects,
            $students->pluck('id')->all(),
            $allPeriods->pluck('id')->all(),
        );

        // Professeur par matière + appréciations (commentaires saisis) + absences.
        $teachers = $this->teachersBySubject($class->id, $year?->id);
        $comments = $this->commentsByStudentSubject($classSubjects->pluck('id'), $period->id);
        $absences = $this->absencesByStudent($class->id, $period);

        // Matrice des valeurs (Classe/Compo/Moyenne + moyennes par type) par matière et par élève.
        $matrix = [];
        foreach ($classSubjects as $cs) {
            foreach ($students as $s) {
                $cc = $this->grading->subjectClasseCompoFromIndex($index, $cs->id, $s->id, $period->id);
                $moy = $this->grading->combineClasseCompo($cc['classe'], $cc['compo'], $config);

                $byType = [];
                foreach ($typeIds as $typeId) {
                    $byType[$typeId] = $this->grading->subjectAverageFromIndex($index, $cs->id, $s->id, $period->id, $typeId);
                }

                $matrix[$cs->id][$s->id] = ['classe' => $cc['classe'], 'compo' => $cc['compo'], 'moy' => $moy, 'by_type' => $byType];
            }
        }

        // Classements (global + par matière).
        $averages = $students->map(fn ($s) => [
            'student_id' => $s->id,
            'average' => $this->grading->periodAverageFromIndex($index, $s->id, $period->id, $classSubjects, $config),
        ]);
        $ranking = $this->grading->rank($averages);

        // Statistiques de la classe.
        $values = $averages->pluck('average')->filter(fn ($v) => $v !== null);
        $classStats = [
            'highest' => $values->isNotEmpty() ? $values->max() : null,
            'lowest' => $values->isNotEmpty() ? $values->min() : null,
            'average' => $values->isNotEmpty() ? round($values->avg(), 2) : null,
        ];
        $periodSystem = $class->classroomType?->period_system ?? 'trimestre';
        $retards = $this->retardsByStudent($class->id, $period);

        // Récapitulatif inter-périodes + annuel (classements précalculés une fois, depuis l'index).
        $periodRankings = [];
        foreach ($allPeriods as $pp) {
            $rows = $students->map(fn ($s) => [
                'student_id' => $s->id,
                'average' => $this->grading->periodAverageFromIndex($index, $s->id, $pp->id, $classSubjects, $config),
            ]);
            $periodRankings[$pp->id] = $this->grading->rank($rows);
        }
        $annualRanking = $this->grading->rank($students->map(fn ($s) => [
            'student_id' => $s->id,
            'average' => $this->grading->annualAverageFromIndex($index, $s->id, $allPeriods, $classSubjects, $config),
        ]));

        $subjectRanks = [];
        foreach ($classSubjects as $cs) {
            $rows = $students->map(fn ($s) => ['student_id' => $s->id, 'average' => $matrix[$cs->id][$s->id]['moy']]);
            $subjectRanks[$cs->id] = $this->grading->rank($rows);
        }

        // Re-validation : sauf « tout régénérer », on conserve les éditions manuelles des cartes existantes.
        $existing = $regenerate
            ? collect()
            : ReportCard::where('academic_period_id', $period->id)
                ->whereIn('student_id', $students->pluck('id'))
                ->get()
                ->keyBy('student_id');
        $refPrefix = $this->referencePrefix($year?->year);
        $preservedCount = 0;
        $attempts = 0;

        // Filet de sécurité concurrence : deux validations simultanées pourraient calculer la
        // même séquence de référence (colonne unique) ; on réessaie avec une séquence recalculée.
        while (true) {
            try {
                $preservedCount = 0;
                $nextSeq = $this->nextReferenceSequence($refPrefix);

                DB::transaction(function () use (
                    $students, $classSubjects, $matrix, $subjectRanks, $ranking, $config, $teachers,
                    $comments, $absences, $class, $period, $year, $effectif, $observations,
                    $template, $classStats, $periodSystem, $retards, $allPeriods, $periodRankings, $annualRanking,
                    $existing, $refPrefix, $generatedBy, &$preservedCount, &$nextSeq
                ): void {
                    foreach ($students as $student) {
                        $lines = [];
                        $totalCoeff = 0.0;
                        $totalPoints = 0.0;

                        foreach ($classSubjects as $cs) {
                            $cell = $matrix[$cs->id][$student->id];
                            $coeff = (float) $cs->coefficient;
                            $points = $cell['moy'] !== null ? round($cell['moy'] * $coeff, 2) : null;

                            if ($cell['moy'] !== null) {
                                $totalCoeff += $coeff;
                                $totalPoints += $points;
                            }

                            $lines[] = [
                                'subject' => $cs->subject?->name ?? '',
                                'parent' => $cs->subject?->parent?->name,
                                'group' => $cs->group ?? 'obligatoire',
                                'coefficient' => $coeff,
                                'classe' => $cell['classe'],
                                'compo' => $cell['compo'],
                                'moyenne' => $cell['moy'],
                                'points' => $points,
                                'definitive' => $points,
                                'by_type' => $cell['by_type'] ?? [],
                                'rang' => $subjectRanks[$cs->id]->get($student->id)['rank'] ?? null,
                                'appreciation' => $comments[$student->id.'|'.$cs->id] ?? '',
                                'teacher' => $teachers[$cs->subject_id] ?? '',
                            ];
                        }

                        $info = $ranking->get($student->id, ['average' => null, 'rank' => null]);
                        $average = $info['average'];

                        $recap = ['periods' => [], 'annual' => $annualRanking->get($student->id, ['average' => null, 'rank' => null])];
                        foreach ($allPeriods as $pp) {
                            $r = $periodRankings[$pp->id]->get($student->id, ['average' => null, 'rank' => null]);
                            $recap['periods'][] = ['name' => $pp->name, 'average' => $r['average'], 'rank' => $r['rank']];
                        }

                        $payload = [
                            'student' => ['name' => $student->lastname.' '.$student->firstname, 'matricule' => $student->matricule],
                            'class' => ['name' => $class->name],
                            'period' => ['name' => $period->name, 'system' => $periodSystem],
                            'year' => $year?->year,
                            'effectif' => $effectif,
                            'absences' => $absences[$student->id] ?? 0,
                            'retards' => $retards[$student->id] ?? 0,
                            'punitions' => 0,
                            'exclusions' => 0,
                            'decision' => $this->grading->mention($average, $config) ?? '',
                            'recap' => $recap,
                            'lines' => $lines,
                            'total_coeff' => $totalCoeff,
                            'total_points' => round($totalPoints, 2),
                            'average' => $average,
                            'rank' => $info['rank'],
                            'mention' => $this->grading->mention($average, $config),
                            'observations' => $observations ?? '',
                            'class_stats' => $classStats,
                            'template' => ['columns' => $template->columns, 'options' => $template->options],
                        ];

                        // Conserve les champs saisis à la main lors d'une re-validation.
                        if (isset($existing[$student->id])) {
                            $payload = $this->preserveManualEdits($payload, $existing[$student->id]->payload ?? []);
                            $preservedCount++;
                        }

                        $card = ReportCard::firstOrNew([
                            'student_id' => $student->id,
                            'academic_period_id' => $period->id,
                        ]);

                        if (! $card->exists) {
                            $card->reference = sprintf('%s%04d', $refPrefix, $nextSeq++);
                        }

                        $card->fill([
                            'class_id' => $class->id,
                            'academic_year_id' => $year?->id,
                            'average' => $average,
                            'rank' => $info['rank'],
                            'mention' => $payload['mention'],
                            'payload' => $payload,
                            'locked_at' => now(),
                            'generated_by' => $generatedBy,
                        ])->save();
                    }
                });

                break;
            } catch (UniqueConstraintViolationException $e) {
                if (++$attempts >= 3) {
                    throw $e;
                }
            }
        }

        return ['effectif' => $effectif, 'preserved' => $preservedCount];
    }

    /** @return Collection<int, ClassSubject> */
    public function classSubjects(Classroom $class, ?string $yearId): Collection
    {
        return ClassSubject::where('class_id', $class->id)
            ->when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))
            ->with(['subject:id,name,code,parent_id', 'subject.parent:id,name'])
            ->get()
            // Regroupe les sous-matières sous leur matière parente.
            ->sortBy(fn ($cs) => ($cs->subject?->parent?->name ?? $cs->subject?->name).'~'.($cs->subject?->name))
            ->values();
    }

    /** @return Collection<int, Student> */
    public function activeStudents(string $classId, ?string $yearId): Collection
    {
        $ids = Enrollment::where('class_id', $classId)
            ->when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))
            ->where('status', Enrollment::STATUS_ACTIVE)
            ->pluck('student_id');

        return Student::whereIn('id', $ids)
            ->orderBy('lastname')->orderBy('firstname')
            ->get(['id', 'firstname', 'lastname', 'matricule']);
    }

    /** @return array<string, string> subject_id => nom du professeur */
    private function teachersBySubject(string $classId, ?string $yearId): array
    {
        return SubjectAssignment::where('class_id', $classId)
            ->where('active', true)
            ->when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))
            ->with('teacher:id,firstname,lastname')
            ->get()
            ->mapWithKeys(fn ($a) => [$a->subject_id => trim(($a->teacher?->firstname ?? '').' '.($a->teacher?->lastname ?? ''))])
            ->toArray();
    }

    /**
     * @param  Collection<int, string>  $classSubjectIds
     * @return array<string, string> "studentId|classSubjectId" => appréciation
     */
    private function commentsByStudentSubject($classSubjectIds, string $periodId): array
    {
        return Grade::whereIn('class_subject_id', $classSubjectIds)
            ->where('academic_period_id', $periodId)
            ->whereNotNull('comments')
            ->get(['student_id', 'class_subject_id', 'comments'])
            ->mapWithKeys(fn ($g) => [$g->student_id.'|'.$g->class_subject_id => $g->comments])
            ->toArray();
    }

    /** @return array<string, int> student_id => nombre d'absences sur la période */
    private function absencesByStudent(string $classId, AcademicPeriod $period): array
    {
        return $this->attendanceCountByStudent($classId, $period, 'absent');
    }

    /** @return array<string, int> student_id => nombre de retards sur la période */
    private function retardsByStudent(string $classId, AcademicPeriod $period): array
    {
        return $this->attendanceCountByStudent($classId, $period, 'late');
    }

    /** @return array<string, int> */
    private function attendanceCountByStudent(string $classId, AcademicPeriod $period, string $status): array
    {
        return AttendanceRecord::where('status', $status)
            ->whereHas('attendance', fn ($q) => $q->where('class_id', $classId)->where('academic_period_id', $period->id))
            ->get(['student_id'])
            ->countBy('student_id')
            ->map(fn ($v) => (int) $v)
            ->toArray();
    }

    /** Préfixe de référence des bulletins pour une année (ex. « BUL-2026- »). */
    private function referencePrefix(?string $year): string
    {
        $y = $year ? preg_replace('/\D/', '', substr($year, 0, 4)) : (string) Carbon::now()->year;

        return "BUL-{$y}-";
    }

    /** Prochain numéro de séquence disponible pour ce préfixe. */
    private function nextReferenceSequence(string $prefix): int
    {
        return ReportCard::where('reference', 'like', $prefix.'%')->count() + 1;
    }

    /**
     * Réapplique, sur un payload fraîchement calculé, les champs saisis à la main via l'écran
     * d'édition (appréciations par matière, observations, décision, discipline) afin qu'une
     * re-validation ne les efface pas.
     *
     * @param  array<string, mixed>  $payload  payload recalculé
     * @param  array<string, mixed>  $old  payload existant (potentiellement édité)
     * @return array<string, mixed>
     */
    private function preserveManualEdits(array $payload, array $old): array
    {
        if (($old['observations'] ?? '') !== '') {
            $payload['observations'] = $old['observations'];
        }
        if (($old['decision'] ?? '') !== '') {
            $payload['decision'] = $old['decision'];
        }
        $payload['punitions'] = (int) ($old['punitions'] ?? $payload['punitions']);
        $payload['exclusions'] = (int) ($old['exclusions'] ?? $payload['exclusions']);

        // Appréciations éditées, réappliquées par matière (les autres restent recalculées).
        $editedBySubject = [];
        foreach ($old['lines'] ?? [] as $line) {
            if (($line['appreciation'] ?? '') !== '') {
                $editedBySubject[$line['subject'] ?? ''] = $line['appreciation'];
            }
        }
        if ($editedBySubject !== []) {
            foreach ($payload['lines'] as $i => $line) {
                $subject = $line['subject'] ?? '';
                if (isset($editedBySubject[$subject])) {
                    $payload['lines'][$i]['appreciation'] = $editedBySubject[$subject];
                }
            }
        }

        return $payload;
    }
}
