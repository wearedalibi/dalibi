<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSubjectRequest;
use App\Http\Requests\UpdateSubjectRequest;
use App\Models\Subject;
use Inertia\Inertia;

class SubjectController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $query = Subject::query();
        $search = request('search');

        // Recherche par nom ou code
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $subjects = $query->orderBy('name')->paginate(10)->appends(request()->query());

        return Inertia::render('Parametres/Subjects/Index', [
            'subjects' => $subjects,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Parametres/Subjects/Create', [
            'parents' => Subject::whereNull('parent_id')->orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreSubjectRequest $request)
    {
        Subject::create($request->validated());

        return redirect()->route('subjects.index')
            ->with('message', 'Matière créée avec succès.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Subject $subject)
    {
        return Inertia::render('Parametres/Subjects/Show', [
            'subject' => $subject,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Subject $subject)
    {
        return Inertia::render('Parametres/Subjects/Edit', [
            'subject' => $subject,
            'parents' => Subject::whereNull('parent_id')->where('id', '!=', $subject->id)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateSubjectRequest $request, Subject $subject)
    {
        $subject->update($request->validated());

        return redirect()->route('subjects.index')
            ->with('message', 'Matière mise à jour avec succès.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Subject $subject)
    {
        $subject->delete();

        return redirect()->route('subjects.index')
            ->with('message', 'Matière supprimée avec succès.');
    }
}
