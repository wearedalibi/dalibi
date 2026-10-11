<?php

/**
 * Projet : Système de Gestion Scolaire (SIGE) - Togo
 * Copyright (c) 2026 Kudayah Sassou Horacio Herve. GPL v3.
 */

namespace App\Http\Controllers\Examens;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Enrollment;
use App\Models\Evaluation;
use App\Models\Mark;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MarkController extends Controller
{
    /**
     * Affiche la grille de saisie des notes pour une évaluation.
     */
    public function index(Evaluation $evaluation): Response
    {
        $evaluation->load([
            'template:id,name,coefficient,max_score,date,academic_period_id,evaluation_type_id',
            'template.academicPeriod:id,name',
            'template.evaluationType:id,name',
            'classSubject:id,class_id,subject_id,coefficient',
            'classSubject.class:id,name,code',
            'classSubject.subject:id,name',
        ]);

        $activeYear = AcademicYear::where('active', true)->first(['id']);

        // Élèves inscrits dans cette classe pour l'année active
        $enrollments = Enrollment::where('enrollments.class_id', $evaluation->classSubject->class_id)
            ->where('enrollments.academic_year_id', $activeYear?->id)
            ->where('enrollments.status', Enrollment::STATUS_ACTIVE)
            ->join('students', 'students.id', '=', 'enrollments.student_id')
            ->orderBy('students.lastname')
            ->orderBy('students.firstname')
            ->select('enrollments.*')
            ->with('student:id,firstname,lastname,matricule')
            ->get();

        // Notes existantes indexées par student_id
        $existingMarks = Mark::where('evaluation_id', $evaluation->id)
            ->get()
            ->keyBy('student_id');

        $studentsWithMarks = $enrollments->map(function ($enrollment) use ($existingMarks) {
            $mark = $existingMarks->get($enrollment->student_id);

            return [
                'student_id' => $enrollment->student_id,
                'student' => $enrollment->student,
                'mark_id' => $mark?->id,
                'score' => $mark?->score !== null ? (float) $mark->score : null,
                'absent' => $mark?->absent ?? false,
                'comments' => $mark?->comments,
            ];
        })->values();

        // Stats
        $gradedMarks = $existingMarks->filter(fn ($m) => ! $m->absent && $m->score !== null);
        $absentCount = $existingMarks->filter(fn ($m) => $m->absent)->count();
        $scores = $gradedMarks->pluck('score')->map(fn ($s) => (float) $s);

        $stats = [
            'total' => $enrollments->count(),
            'graded' => $gradedMarks->count(),
            'absent' => $absentCount,
            'average' => $scores->count() > 0 ? round($scores->avg(), 2) : null,
            'min' => $scores->count() > 0 ? $scores->min() : null,
            'max' => $scores->count() > 0 ? $scores->max() : null,
        ];

        return Inertia::render('Examens/Marks/Index', [
            'evaluation' => $evaluation,
            'studentsWithMarks' => $studentsWithMarks,
            'stats' => $stats,
        ]);
    }

    /**
     * Enregistre les notes en masse (upsert).
     */
    public function store(Request $request, Evaluation $evaluation)
    {
        $decision = Gate::inspect('enterMarks', $evaluation);
        if ($decision->denied()) {
            return back()->withErrors(['locked' => $decision->message()]);
        }

        $maxScore = (float) ($evaluation->template?->max_score ?? 20);

        // L'élève noté doit être inscrit (activement) dans la classe de l'évaluation :
        // `exists:students,id` seul laisserait noter un élève d'une autre classe.
        $enrolledIds = Enrollment::where('class_id', $evaluation->classSubject->class_id)
            ->where('status', Enrollment::STATUS_ACTIVE)
            ->pluck('student_id')
            ->all();

        $validated = $request->validate([
            'marks' => ['required', 'array', 'min:1'],
            'marks.*.student_id' => ['required', 'uuid', Rule::in($enrolledIds)],
            'marks.*.score' => ['nullable', 'numeric', 'min:0', "max:{$maxScore}"],
            'marks.*.absent' => ['boolean'],
            'marks.*.comments' => ['nullable', 'string', 'max:500'],
        ], [
            'marks.*.score.max' => "La note maximale est {$maxScore}.",
            'marks.*.score.min' => 'La note minimale est 0.',
            'marks.*.student_id.in' => "Cet élève n'est pas inscrit dans la classe de cette évaluation.",
        ]);

        DB::transaction(function () use ($evaluation, $validated): void {
            foreach ($validated['marks'] as $markData) {
                $isAbsent = $markData['absent'] ?? false;

                Mark::updateOrCreate(
                    [
                        'evaluation_id' => $evaluation->id,
                        'student_id' => $markData['student_id'],
                    ],
                    [
                        'score' => $isAbsent ? null : ($markData['score'] ?? null),
                        'absent' => $isAbsent,
                        'comments' => $markData['comments'] ?? null,
                        'created_by' => auth()->id(),
                    ]
                );
            }
        });

        // Marquer l'évaluation comme terminée si toutes les notes sont saisies
        $totalEnrolled = Enrollment::where('class_id', $evaluation->classSubject->class_id)
            ->where('status', Enrollment::STATUS_ACTIVE)
            ->count();

        $totalMarked = Mark::where('evaluation_id', $evaluation->id)
            ->where(fn ($q) => $q->whereNotNull('score')->orWhere('absent', true))
            ->count();

        if ($totalMarked >= $totalEnrolled) {
            $evaluation->update(['status' => 'completed']);
        }

        return back()->with('message', 'Notes enregistrées avec succès.');
    }
}
