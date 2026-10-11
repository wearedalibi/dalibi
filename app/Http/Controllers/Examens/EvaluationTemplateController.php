<?php

/**
 * Projet : Système de Gestion Scolaire (SIGE) - Togo
 * Copyright (c) 2026 Kudayah Sassou Horacio Herve. GPL v3.
 */

namespace App\Http\Controllers\Examens;

use App\Http\Controllers\Controller;
use App\Models\AcademicPeriod;
use App\Models\AcademicYear;
use App\Models\ClassroomType;
use App\Models\ClassSubject;
use App\Models\Evaluation;
use App\Models\EvaluationTemplate;
use App\Models\EvaluationType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class EvaluationTemplateController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $periodId = $request->string('period_id')->toString();

        $query = EvaluationTemplate::query()
            ->with(['academicPeriod:id,name', 'evaluationType:id,name'])
            ->when($search, fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->when($periodId, fn ($q) => $q->where('academic_period_id', $periodId))
            ->withCount('evaluations');

        $templates = $query->orderBy('academic_period_id')->orderBy('name')->paginate(15)->withQueryString();

        $activeYear = AcademicYear::where('active', true)->first(['id', 'year']);
        $periods = AcademicPeriod::when(
            $activeYear,
            fn ($q) => $q->where('academic_year_id', $activeYear->id)
        )->orderBy('start_date')->get(['id', 'name']);

        return Inertia::render('Examens/EvaluationTemplates/Index', [
            'templates' => $templates,
            'periods' => $periods,
            'activeYear' => $activeYear,
            'filters' => ['search' => $search, 'period_id' => $periodId],
        ]);
    }

    public function create(): Response
    {
        $activeYear = AcademicYear::where('active', true)->first(['id', 'year']);
        $periods = AcademicPeriod::when(
            $activeYear,
            fn ($q) => $q->where('academic_year_id', $activeYear->id)
        )->orderBy('start_date')->get(['id', 'name', 'is_current']);

        return Inertia::render('Examens/EvaluationTemplates/Create', [
            'periods' => $periods,
            'evaluationTypes' => EvaluationType::orderBy('name')->get(['id', 'name']),
            'classroomTypes' => ClassroomType::where('active', true)->orderBy('name')->get(['id', 'name']),
            'activeYear' => $activeYear,
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->can('create_evaluation_templates'), 403);

        $validated = $request->validate([
            'academic_period_id' => ['required', 'uuid', 'exists:academic_periods,id'],
            'evaluation_type_id' => ['required', 'uuid', 'exists:evaluation_types,id'],
            'class_type_id' => ['nullable', 'uuid', 'exists:classroom_types,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'coefficient' => ['required', 'numeric', 'gt:0', 'max:99.99'],
            'max_score' => ['required', 'numeric', 'gt:0', 'max:1000'],
            'date' => ['nullable', 'date'],
        ], [
            'academic_period_id.required' => 'La période académique est obligatoire.',
            'evaluation_type_id.required' => 'Le type d\'évaluation est obligatoire.',
            'name.required' => 'Le nom est obligatoire.',
            'coefficient.gt' => 'Le coefficient doit être supérieur à 0.',
            'max_score.gt' => 'Le barème doit être supérieur à 0.',
        ]);

        EvaluationTemplate::create($validated);

        return redirect()->route('evaluation-templates.index')
            ->with('message', 'Modèle d\'évaluation créé avec succès.');
    }

    public function show(EvaluationTemplate $evaluationTemplate): Response
    {
        $evaluationTemplate->load(['academicPeriod:id,name', 'evaluationType:id,name']);

        // Évaluations déjà générées pour ce template
        $evaluations = Evaluation::where('evaluation_template_id', $evaluationTemplate->id)
            ->with([
                'classSubject:id,class_id,subject_id,coefficient',
                'classSubject.class:id,name,code',
                'classSubject.subject:id,name',
            ])
            ->withCount(['marks', 'marks as graded_count' => fn ($q) => $q->whereNotNull('score')->where('absent', false)])
            ->get();

        // Toutes les class_subjects de l'année active pour ce trimestre
        $activeYear = AcademicYear::where('active', true)->first(['id']);
        $alreadyDoneIds = $evaluations->pluck('class_subject_id')->all();

        $availableClassSubjects = ClassSubject::where('academic_year_id', $activeYear?->id)
            ->whereNotIn('id', $alreadyDoneIds)
            // Si le modèle est rattaché à un type de classe, ne proposer que les classes de ce type
            ->when($evaluationTemplate->class_type_id, fn ($q) => $q->whereHas(
                'class',
                fn ($cq) => $cq->where('classroom_type_id', $evaluationTemplate->class_type_id)
            ))
            ->with(['class:id,name,code', 'subject:id,name'])
            ->get(['id', 'class_id', 'subject_id', 'coefficient']);

        return Inertia::render('Examens/EvaluationTemplates/Show', [
            'template' => $evaluationTemplate,
            'evaluations' => $evaluations,
            'availableClassSubjects' => $availableClassSubjects,
            'activeYear' => $activeYear,
        ]);
    }

    public function edit(EvaluationTemplate $evaluationTemplate): Response
    {
        $activeYear = AcademicYear::where('active', true)->first(['id']);
        $periods = AcademicPeriod::when(
            $activeYear,
            fn ($q) => $q->where('academic_year_id', $activeYear->id)
        )->orderBy('start_date')->get(['id', 'name']);

        return Inertia::render('Examens/EvaluationTemplates/Edit', [
            'template' => $evaluationTemplate->load(['academicPeriod:id,name', 'evaluationType:id,name']),
            'periods' => $periods,
            'evaluationTypes' => EvaluationType::orderBy('name')->get(['id', 'name']),
            'classroomTypes' => ClassroomType::where('active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, EvaluationTemplate $evaluationTemplate)
    {
        abort_unless($request->user()->can('edit_evaluation_templates'), 403);

        $validated = $request->validate([
            'academic_period_id' => ['required', 'uuid', 'exists:academic_periods,id'],
            'evaluation_type_id' => ['required', 'uuid', 'exists:evaluation_types,id'],
            'class_type_id' => ['nullable', 'uuid', 'exists:classroom_types,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'coefficient' => ['required', 'numeric', 'gt:0', 'max:99.99'],
            'max_score' => ['required', 'numeric', 'gt:0', 'max:1000'],
            'date' => ['nullable', 'date'],
        ]);

        $evaluationTemplate->update($validated);

        return redirect()->route('evaluation-templates.index')
            ->with('message', 'Modèle mis à jour avec succès.');
    }

    public function destroy(EvaluationTemplate $evaluationTemplate)
    {
        abort_unless(request()->user()->can('delete_evaluation_templates'), 403);

        $evaluationTemplate->delete(); // cascade → evaluations → marks

        return redirect()->route('evaluation-templates.index')
            ->with('message', 'Modèle supprimé avec succès.');
    }

    /**
     * Génère les évaluations pour les class_subjects sélectionnées.
     * Accepte un tableau d'objets { id: uuid, date: date|null }.
     */
    public function generate(Request $request, EvaluationTemplate $evaluationTemplate)
    {
        $validated = $request->validate([
            'class_subjects' => ['required', 'array', 'min:1'],
            'class_subjects.*.id' => ['required', 'uuid', 'exists:class_subjects,id'],
            'class_subjects.*.date' => ['nullable', 'date'],
        ], [
            'class_subjects.required' => 'Sélectionnez au moins une classe/matière.',
        ]);

        $created = 0;
        DB::transaction(function () use ($evaluationTemplate, $validated, &$created): void {
            foreach ($validated['class_subjects'] as $item) {
                $date = $item['date'] ?? $evaluationTemplate->date;
                Evaluation::firstOrCreate(
                    [
                        'evaluation_template_id' => $evaluationTemplate->id,
                        'class_subject_id' => $item['id'],
                    ],
                    [
                        'date' => $date,
                        'status' => 'scheduled',
                    ]
                );
                $created++;
            }
        });

        return back()->with('message', "{$created} évaluation(s) générée(s) avec succès.");
    }
}
