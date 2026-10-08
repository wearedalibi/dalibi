<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Models\BulletinTemplate;
use App\Models\EvaluationType;
use App\Models\School;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BulletinTemplateController extends Controller
{
    public function edit(Request $request): Response
    {
        abort_unless($request->user()->can('view_bulletin_templates'), 403);

        $school = $this->activeSchool();
        $template = BulletinTemplate::where('school_id', $school->id)
            ->whereNull('classroom_type_id')->first();

        $columns = $template?->columns ?? BulletinTemplate::defaultColumns();
        $options = $template?->options ?? BulletinTemplate::defaultOptions();

        return Inertia::render('Parametres/BulletinTemplates/Edit', [
            'columns' => $columns,
            'options' => $options,
            'columnTypes' => BulletinTemplate::COLUMN_TYPES,
            'noteSources' => BulletinTemplate::NOTE_SOURCES,
            'evaluationTypes' => EvaluationType::orderBy('name')->get(['id', 'name', 'category']),
            'presets' => $this->presets(),
            'school' => ['name' => $school->name],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('edit_bulletin_templates'), 403);

        $validated = $request->validate([
            'columns' => ['required', 'array', 'min:1'],
            'columns.*.key' => ['required', 'string', 'max:40'],
            'columns.*.label' => ['required', 'string', 'max:60'],
            'columns.*.width' => ['nullable', 'numeric', 'min:1', 'max:100'],
            'columns.*.type' => ['required', 'in:subject,note,coefficient,definitive,rang,appreciation,teacher,signature,text'],
            'columns.*.source' => ['nullable', 'string', 'max:60'],
            'options' => ['nullable', 'array'],
            'options.nb_text' => ['nullable', 'string', 'max:255'],
        ]);

        $school = $this->activeSchool();

        BulletinTemplate::updateOrCreate(
            ['school_id' => $school->id, 'classroom_type_id' => null],
            [
                'name' => 'Modèle par défaut',
                'is_active' => true,
                'columns' => $validated['columns'],
                'options' => array_merge(BulletinTemplate::defaultOptions(), $validated['options'] ?? []),
            ],
        );

        return back()->with('message', 'Modèle de bulletin enregistré.');
    }

    /** Presets prêts à charger (selon les types d'évaluation existants). */
    private function presets(): array
    {
        $presets = [
            ['name' => 'Classe / Composition', 'columns' => BulletinTemplate::defaultColumns(), 'options' => BulletinTemplate::defaultOptions()],
        ];

        $interro = EvaluationType::where('name', 'Interrogation')->first();
        if ($interro) {
            $columns = BulletinTemplate::defaultColumns();
            array_splice($columns, 1, 0, [[
                'key' => 'interro', 'label' => 'Interro', 'width' => 9, 'type' => 'note', 'source' => 'type:'.$interro->id,
            ]]);
            $presets[] = ['name' => 'Avec Interrogation', 'columns' => $columns, 'options' => BulletinTemplate::defaultOptions()];
        }

        return $presets;
    }

    private function activeSchool(): School
    {
        $school = School::query()->first();
        abort_unless($school, 404, 'Aucune école configurée.');

        return $school;
    }
}
