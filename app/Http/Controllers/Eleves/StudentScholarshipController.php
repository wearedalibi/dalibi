<?php

namespace App\Http\Controllers\Eleves;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStudentScholarshipRequest;
use App\Http\Requests\UpdateStudentScholarshipRequest;
use App\Models\AcademicYear;
use App\Models\Scholarship;
use App\Models\Student;
use App\Models\StudentScholarship;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StudentScholarshipController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = StudentScholarship::with(['student', 'scholarship', 'academicYear'])
            ->orderBy('created_at', 'desc');

        // Search functionality
        if ($request->filled('search')) {
            $search = strtolower($request->string('search')->toString());
            $query->where(function ($q) use ($search) {
                $q->whereHas('student', function ($query) use ($search) {
                    $query->whereRaw('LOWER(firstname) LIKE ?', ["%{$search}%"])
                        ->orWhereRaw('LOWER(lastname) LIKE ?', ["%{$search}%"])
                        ->orWhereRaw('LOWER(matricule) LIKE ?', ["%{$search}%"]);
                })
                    ->orWhereHas('scholarship', function ($query) use ($search) {
                        $query->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"]);
                    })
                    ->orWhereHas('academicYear', function ($query) use ($search) {
                        $query->whereRaw('LOWER(year) LIKE ?', ["%{$search}%"]);
                    });
            });
        }

        // Filter by scholarship
        if ($request->filled('scholarship_id')) {
            $query->where('scholarship_id', $request->scholarship_id);
        }

        // Filter by academic year
        if ($request->filled('academic_year_id')) {
            $query->where('academic_year_id', $request->academic_year_id);
        }

        // Get per page value, default to 10
        $perPage = $request->input('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50, 100]) ? $perPage : 10;

        $studentScholarships = $query->paginate($perPage)->withQueryString();

        // Get all scholarships and academic years for filters
        $scholarships = Scholarship::select('id', 'name', 'value')
            ->orderBy('name')
            ->get();

        $academicYears = AcademicYear::select('id', 'year')
            ->where('active', true)
            ->orderBy('year', 'desc')
            ->get();

        return Inertia::render('Eleves/StudentScholarships/Index', [
            'studentScholarships' => $studentScholarships,
            'scholarships' => $scholarships,
            'academicYears' => $academicYears,
            'filters' => $request->only(['search', 'scholarship_id', 'academic_year_id', 'per_page']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $students = Student::select('id', 'matricule', 'firstname', 'lastname')
            ->where('active', true)
            ->orderBy('lastname')
            ->get();

        $scholarships = Scholarship::select('id', 'name', 'value')
            ->orderBy('name')
            ->get();

        $academicYears = AcademicYear::select('id', 'year')
            ->where('active', true)
            ->orderBy('year', 'desc')
            ->get();

        return Inertia::render('Eleves/StudentScholarships/Create', [
            'students' => $students,
            'scholarships' => $scholarships,
            'academicYears' => $academicYears,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreStudentScholarshipRequest $request)
    {
        StudentScholarship::create($request->validated());

        return redirect()->route('student-scholarships.index')
            ->with('success', 'Bourse d\'études attribuée avec succès.');
    }

    /**
     * Display the specified resource.
     */
    public function show(StudentScholarship $studentScholarship)
    {
        $studentScholarship->load(['student', 'scholarship', 'academicYear']);

        return Inertia::render('Eleves/StudentScholarships/Show', [
            'studentScholarship' => $studentScholarship,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(StudentScholarship $studentScholarship)
    {
        $studentScholarship->load(['student', 'scholarship', 'academicYear']);

        $students = Student::select('id', 'matricule', 'firstname', 'lastname')
            ->where('active', true)
            ->orderBy('lastname')
            ->get();

        $scholarships = Scholarship::select('id', 'name', 'value')
            ->orderBy('name')
            ->get();

        $academicYears = AcademicYear::select('id', 'year')
            ->where('active', true)
            ->orderBy('year', 'desc')
            ->get();

        return Inertia::render('Eleves/StudentScholarships/Edit', [
            'studentScholarship' => $studentScholarship,
            'students' => $students,
            'scholarships' => $scholarships,
            'academicYears' => $academicYears,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateStudentScholarshipRequest $request, StudentScholarship $studentScholarship)
    {
        $studentScholarship->update($request->validated());

        return redirect()->route('student-scholarships.show', $studentScholarship)
            ->with('success', 'Bourse d\'études mise à jour avec succès.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, StudentScholarship $studentScholarship)
    {
        // Défense en profondeur : la route porte déjà `can:delete_student_scholarships`.
        abort_unless($request->user()->can('delete_student_scholarships'), 403);

        $studentScholarship->delete();

        return redirect()->route('student-scholarships.index')
            ->with('success', 'Bourse d\'études supprimée avec succès.');
    }
}
