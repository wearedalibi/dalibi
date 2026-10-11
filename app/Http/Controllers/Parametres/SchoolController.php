<?php

namespace App\Http\Controllers\Parametres;

use App\Constants\Currencies;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSchoolRequest;
use App\Http\Requests\UpdateSchoolRequest;
use App\Models\ClassroomType;
use App\Models\School;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class SchoolController extends Controller
{
    /**
     * Application mono-école : pas de liste. On ouvre directement l'école
     * existante (ou le formulaire de création s'il n'y en a pas encore).
     */
    public function index()
    {
        $school = School::query()->first();

        return $school
            ? redirect()->route('schools.edit', $school)
            : redirect()->route('schools.create');
    }

    /**
     * Formulaire de création — accessible uniquement tant qu'aucune école n'existe.
     */
    public function create()
    {
        if ($school = School::query()->first()) {
            return redirect()->route('schools.edit', $school)
                ->with('message', 'Une école est déjà configurée.');
        }

        return Inertia::render('Parametres/Schools/Create', [
            'classroomTypes' => ClassroomType::where('active', true)->orderBy('name')->get(['id', 'name', 'period_system']),
            'currencies' => Currencies::options(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreSchoolRequest $request)
    {
        // Garde-fou : une seule école autorisée.
        if ($existing = School::query()->first()) {
            return redirect()->route('schools.edit', $existing)
                ->with('message', 'Une école est déjà configurée.');
        }

        $data = $request->validated();

        if ($request->hasFile('logo')) {
            $data['logo'] = $request->file('logo')->store('schools/logos', 'media');
        }

        $classTypeIds = $data['class_type_ids'] ?? [];
        unset($data['class_type_ids']);

        $school = School::create($data);
        $school->classTypes()->sync($classTypeIds);

        return redirect()->route('schools.edit', $school)
            ->with('message', 'École créée avec succès.');
    }

    /**
     * Display the specified resource.
     */
    public function show(School $school)
    {
        return Inertia::render('Parametres/Schools/Show', [
            'school' => $school,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(School $school)
    {
        return Inertia::render('Parametres/Schools/Edit', [
            'school' => $school,
            'classroomTypes' => ClassroomType::where('active', true)->orderBy('name')->get(['id', 'name', 'period_system']),
            'selectedClassTypes' => $school->classTypes()->pluck('classroom_types.id'),
            'currencies' => Currencies::options(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateSchoolRequest $request, School $school)
    {
        $data = $request->validated();

        if ($request->hasFile('logo')) {
            if ($school->logo) {
                Storage::disk('media')->delete($school->logo);
            }
            $data['logo'] = $request->file('logo')->store('schools/logos', 'media');
        } else {
            unset($data['logo']);
        }

        $classTypeIds = $data['class_type_ids'] ?? null;
        unset($data['class_type_ids']);

        $school->update($data);

        if ($classTypeIds !== null) {
            $school->classTypes()->sync($classTypeIds);
        }

        return redirect()->route('schools.edit', $school)
            ->with('message', 'École mise à jour avec succès.');
    }
}
