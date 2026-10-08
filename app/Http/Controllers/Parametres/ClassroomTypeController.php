<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClassroomTypeRequest;
use App\Http\Requests\UpdateClassroomTypeRequest;
use App\Models\ClassroomType;
use Inertia\Inertia;

class ClassroomTypeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $query = ClassroomType::query();

        if (request('search')) {
            $search = request('search');
            $query->where('name', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%");
        }

        $classroomTypes = $query->orderBy('created_at', 'desc')->paginate(10);
        $activeCount = ClassroomType::where('active', true)->count();

        return Inertia::render('Parametres/ClassroomTypes/Index', [
            'classroomTypes' => $classroomTypes,
            'activeCount' => $activeCount,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Parametres/ClassroomTypes/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreClassroomTypeRequest $request)
    {
        ClassroomType::create($request->validated());

        return redirect()->route('classroom-types.index')
            ->with('message', 'Type de classe créé avec succès.');
    }

    /**
     * Display the specified resource.
     */
    public function show(ClassroomType $classroomType)
    {
        $classroomType->load('classrooms');

        return Inertia::render('Parametres/ClassroomTypes/Show', [
            'classroomType' => $classroomType,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(ClassroomType $classroomType)
    {
        return Inertia::render('Parametres/ClassroomTypes/Edit', [
            'classroomType' => $classroomType,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateClassroomTypeRequest $request, ClassroomType $classroomType)
    {
        $classroomType->update($request->validated());

        return redirect()->route('classroom-types.index')
            ->with('message', 'Type de classe mis à jour avec succès.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ClassroomType $classroomType)
    {
        $classroomType->delete();

        return redirect()->route('classroom-types.index')
            ->with('message', 'Type de classe supprimé avec succès.');
    }
}
