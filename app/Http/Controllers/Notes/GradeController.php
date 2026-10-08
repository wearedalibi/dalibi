<?php

/**
 * Projet : Système de Gestion Scolaire (SIGE) - Togo
 * Description : Gestion des élèves, des notes et des bulletins.
 * * Copyright (c) 2026 Kudayah Sassou Horacio Herve.
 * * Ce programme est un logiciel libre : vous pouvez le redistribuer et/ou le modifier
 * selon les termes de la Licence Publique Générale GNU (GPL v3) telle que publiée
 * par la Free Software Foundation.
 */

namespace App\Http\Controllers\Notes;

use App\Http\Controllers\Controller;
use App\Models\AcademicPeriod;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\ClassroomType;
use App\Models\ClassSubject;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\GradingConfig;
use App\Models\School;
use App\Models\Student;
use App\Services\GradingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class GradeController extends Controller
{
    /**
     * Display the grade entry page with filters.
     */
    public function index(Request $request): Response
    {
        $classId = $request->string('class_id')->toString();
        $classSubjectId = $request->string('class_subject_id')->toString();
        $periodId = $request->string('academic_period_id')->toString();

        $activeYear = AcademicYear::where('active', true)->first(['id', 'year']);

        $classrooms = Classroom::where('active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        // Périodes applicables au type de la classe sélectionnée
        $periods = [];
        if ($classId !== '') {
            $class = Classroom::find($classId, ['id', 'classroom_type_id']);
            $periods = AcademicPeriod::forClassType($activeYear?->id, $class?->classroom_type_id)
                ->map(fn ($p) => ['id' => $p->id, 'name' => $p->name, 'is_current' => (bool) $p->is_current])
                ->values();
        }

        $classSubjects = [];
        if ($classId !== '') {
            $classSubjects = ClassSubject::where('class_id', $classId)
                ->when($activeYear, fn ($q) => $q->where('academic_year_id', $activeYear->id))
                ->with('subject:id,name,code')
                ->get(['id', 'class_id', 'subject_id', 'coefficient'])
                ->map(fn ($cs) => [
                    'id' => $cs->id,
                    'coefficient' => $cs->coefficient,
                    'subject' => $cs->subject,
                ]);
        }

        $studentsWithGrades = [];
        $stats = ['total' => 0, 'graded' => 0, 'average' => null];

        if ($classSubjectId !== '' && $periodId !== '') {
            $enrollments = Enrollment::where('class_id', $classId)
                ->when($activeYear, fn ($q) => $q->where('academic_year_id', $activeYear->id))
                // Statut de scolarité (la colonne `status` = paid/unpaid, pas actif/inactif).
                ->whereIn('academic_status', Enrollment::ACTIVE_ACADEMIC_STATUSES)
                ->with('student:id,firstname,lastname,matricule')
                ->get();

            $existingGrades = Grade::where('class_subject_id', $classSubjectId)
                ->where('academic_period_id', $periodId)
                ->get()
                ->keyBy('student_id');

            $studentsWithGrades = $enrollments->map(function ($enrollment) use ($existingGrades) {
                $grade = $existingGrades->get($enrollment->student_id);

                return [
                    'student_id' => $enrollment->student_id,
                    'student' => $enrollment->student,
                    'grade_id' => $grade?->id,
                    'score' => $grade?->score !== null ? (float) $grade->score : null,
                    'comments' => $grade?->comments,
                ];
            })->values();

            $gradedCount = $existingGrades->filter(fn ($g) => $g->score !== null)->count();
            $scores = $existingGrades->filter(fn ($g) => $g->score !== null)->pluck('score');
            $average = $scores->count() > 0 ? round($scores->avg(), 2) : null;

            $stats = [
                'total' => $enrollments->count(),
                'graded' => $gradedCount,
                'average' => $average,
            ];
        }

        return Inertia::render('Notes/Grades/Index', [
            'classrooms' => $classrooms,
            'classSubjects' => $classSubjects,
            'periods' => $periods,
            'studentsWithGrades' => $studentsWithGrades,
            'activeYear' => $activeYear,
            'stats' => $stats,
            'filters' => [
                'class_id' => $classId,
                'class_subject_id' => $classSubjectId,
                'academic_period_id' => $periodId,
            ],
        ]);
    }

    /**
     * Bulk upsert grades for a class-subject and term.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'class_subject_id' => ['required', 'uuid', 'exists:class_subjects,id'],
            'academic_period_id' => ['required', 'uuid', 'exists:academic_periods,id'],
            'grades' => ['required', 'array', 'min:1'],
            'grades.*.student_id' => ['required', 'uuid', 'exists:students,id'],
            'grades.*.score' => ['nullable', 'numeric', 'min:0', 'max:20'],
            'grades.*.comments' => ['nullable', 'string', 'max:500'],
        ], [
            'class_subject_id.required' => 'La matière est obligatoire.',
            'academic_period_id.required' => 'La période est obligatoire.',
            'grades.required' => 'Aucune note à enregistrer.',
            'grades.*.score.min' => 'La note minimale est 0.',
            'grades.*.score.max' => 'La note maximale est 20.',
        ]);

        DB::transaction(function () use ($validated): void {
            foreach ($validated['grades'] as $gradeData) {
                Grade::updateOrCreate(
                    [
                        'student_id' => $gradeData['student_id'],
                        'class_subject_id' => $validated['class_subject_id'],
                        'academic_period_id' => $validated['academic_period_id'],
                    ],
                    [
                        'score' => $gradeData['score'] ?? null,
                        'comments' => $gradeData['comments'] ?? null,
                    ]
                );
            }
        });

        return back()->with('message', 'Notes enregistrées avec succès.');
    }

    /**
     * Display the grade bulletin for a student.
     */
    public function student(Student $student, Request $request): Response
    {
        $periodId = $request->string('academic_period_id')->toString();

        $activeYear = AcademicYear::where('active', true)->first(['id', 'year']);

        $enrollment = Enrollment::where('student_id', $student->id)
            ->when($activeYear, fn ($q) => $q->where('academic_year_id', $activeYear->id))
            ->where('status', Enrollment::STATUS_ACTIVE)
            ->with('classroom:id,name,code,classroom_type_id')
            ->first();

        // Périodes applicables au type de la classe de l'élève
        $periods = collect();
        if ($enrollment) {
            $periods = AcademicPeriod::forClassType($activeYear?->id, $enrollment->classroom?->classroom_type_id)
                ->map(fn ($p) => ['id' => $p->id, 'name' => $p->name, 'is_current' => (bool) $p->is_current])
                ->values();
        }

        // Période par défaut : celle demandée, sinon la période en cours, sinon la première
        if ($periodId === '') {
            $periodId = collect($periods)->firstWhere('is_current', true)['id']
                ?? collect($periods)->first()['id']
                ?? '';
        }

        $grades = collect();
        $average = null;
        $rangGlobal = null;
        $mention = null;

        if ($enrollment && $periodId !== '') {
            $classSubjects = ClassSubject::where('class_id', $enrollment->class_id)
                ->when($activeYear, fn ($q) => $q->where('academic_year_id', $activeYear->id))
                ->with([
                    'subject:id,name,code',
                    'grades' => fn ($q) => $q->where('student_id', $student->id)->where('academic_period_id', $periodId),
                ])
                ->get();

            // Configuration de notation applicable au type de classe de l'élève
            $school = School::query()->first();
            $type = ClassroomType::find($enrollment->classroom?->classroom_type_id);
            $config = GradingConfig::resolveOrDefault($school, $type);
            $service = app(GradingService::class);

            $grades = $classSubjects->map(function ($cs) use ($service, $student, $periodId, $config) {
                $grade = $cs->grades->first();

                return [
                    'class_subject_id' => $cs->id,
                    'subject' => $cs->subject,
                    'coefficient' => (float) $cs->coefficient,
                    'score' => $grade?->score !== null ? (float) $grade->score : null,
                    'comments' => $grade?->comments,
                    'rang' => $service->subjectRanking($cs, $periodId, $config)->get($student->id)['rank'] ?? null,
                ];
            });

            if ($enrollment->classroom) {
                $ranking = $service->classRanking($enrollment->classroom, $periodId, $config);
                $me = $ranking->get($student->id);
                $average = $me['average'] ?? null;
                $rangGlobal = $me['rank'] ?? null;
                $mention = $service->mention($average, $config);
            }
        }

        return Inertia::render('Notes/Grades/Student', [
            'student' => $student->only(['id', 'firstname', 'lastname', 'matricule']),
            'enrollment' => $enrollment,
            'grades' => $grades->values(),
            'periods' => $periods,
            'average' => $average,
            'rang_global' => $rangGlobal,
            'mention' => $mention,
            'academic_period_id' => $periodId,
            'activeYear' => $activeYear,
        ]);
    }
}
