<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreGradingConfigRequest;
use App\Http\Requests\UpdateGradingConfigRequest;
use App\Models\ClassroomType;
use App\Models\GradingConfig;
use App\Models\School;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class GradingConfigController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('view_grading_configs'), 403);

        $schoolId = $request->string('school_id')->toString();

        $configs = GradingConfig::query()
            ->with(['school:id,name', 'classroomType:id,name,period_system'])
            ->when($schoolId, fn ($q) => $q->where('school_id', $schoolId))
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get();

        $schools = School::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Parametres/GradingConfigs/Index', [
            'configs' => $configs,
            'schools' => $schools,
            'filters' => ['school_id' => $schoolId],
        ]);
    }

    public function create(Request $request): Response
    {
        abort_unless($request->user()->can('create_grading_configs'), 403);

        $schools = School::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Parametres/GradingConfigs/Create', [
            'schools' => $schools,
            'classroomTypes' => ClassroomType::where('active', true)->orderBy('name')->get(['id', 'name', 'period_system']),
            'defaultMentions' => GradingConfig::defaultMentions(),
            'preselectedSchoolId' => $request->string('school_id')->toString() ?: null,
        ]);
    }

    public function store(StoreGradingConfigRequest $request): RedirectResponse
    {
        GradingConfig::create($request->validated());

        return redirect()->route('grading-configs.index')
            ->with('message', 'Configuration créée avec succès.');
    }

    public function edit(Request $request, GradingConfig $gradingConfig): Response
    {
        abort_unless($request->user()->can('edit_grading_configs'), 403);

        $schools = School::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Parametres/GradingConfigs/Edit', [
            'config' => $gradingConfig->load('school:id,name'),
            'schools' => $schools,
            'classroomTypes' => ClassroomType::where('active', true)->orderBy('name')->get(['id', 'name', 'period_system']),
            'defaultMentions' => GradingConfig::defaultMentions(),
        ]);
    }

    public function update(UpdateGradingConfigRequest $request, GradingConfig $gradingConfig): RedirectResponse
    {
        $gradingConfig->update($request->validated());

        return redirect()->route('grading-configs.index')
            ->with('message', 'Configuration mise à jour.');
    }

    public function destroy(Request $request, GradingConfig $gradingConfig): RedirectResponse
    {
        abort_unless($request->user()->can('delete_grading_configs'), 403);

        if ($gradingConfig->is_active) {
            return back()->withErrors(['delete' => 'Impossible de supprimer une configuration active.']);
        }

        $gradingConfig->delete();

        return redirect()->route('grading-configs.index')
            ->with('message', 'Configuration supprimée.');
    }

    public function activate(Request $request, GradingConfig $gradingConfig): RedirectResponse
    {
        abort_unless($request->user()->can('edit_grading_configs'), 403);

        DB::transaction(function () use ($gradingConfig): void {
            // Une seule config active par (école, type de classe).
            GradingConfig::where('school_id', $gradingConfig->school_id)
                ->where('classroom_type_id', $gradingConfig->classroom_type_id)
                ->where('id', '!=', $gradingConfig->id)
                ->update(['is_active' => false]);

            $gradingConfig->update(['is_active' => true]);
        });

        return back()->with('message', 'Configuration activée.');
    }
}
