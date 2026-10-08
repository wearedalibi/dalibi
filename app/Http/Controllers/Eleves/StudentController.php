<?php

namespace App\Http\Controllers\Eleves;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStudentRequest;
use App\Http\Requests\UpdateStudentRequest;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\DocumentIssuance;
use App\Models\DocumentTemplate;
use App\Models\Enrollment;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
    /** Colonnes de tri autorisées (liste blanche). */
    private const SORTABLE = ['created_at', 'lastname', 'firstname', 'matricule', 'birth_date'];

    public function index(Request $request): Response
    {
        $query = Student::with(['user', 'parentInfo']);

        if ($request->filled('search')) {
            $search = strtolower($request->string('search')->toString());
            $query->where(function ($subQuery) use ($search): void {
                $subQuery->whereRaw('LOWER(firstname) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(lastname) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(matricule) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(email) LIKE ?', ["%{$search}%"])
                    ->orWhereHas('user', function ($userQuery) use ($search): void {
                        $userQuery->whereRaw('LOWER(firstname) LIKE ?', ["%{$search}%"])
                            ->orWhereRaw('LOWER(lastname) LIKE ?', ["%{$search}%"])
                            ->orWhereRaw('LOWER(email) LIKE ?', ["%{$search}%"]);
                    });
            });
        }

        if ($request->filled('gender')) {
            $query->where('gender', $request->string('gender')->toString());
        }

        if ($request->filled('nationality')) {
            $search = strtolower($request->string('nationality')->toString());
            $query->whereRaw('LOWER(nationality) LIKE ?', ["%{$search}%"]);
        }

        if ($request->filled('status')) {
            $status = $request->string('status')->toString();

            if ($status === 'active') {
                $query->where('active', true);
            } elseif ($status === 'inactive') {
                $query->where('active', false);
            }
        }

        foreach (['region', 'prefecture'] as $field) {
            if ($request->filled($field)) {
                $query->where($field, $request->string($field)->toString());
            }
        }

        // Filtres portés par l'inscription : ils doivent viser la MÊME inscription.
        $classId = $request->string('class_id')->toString();
        $yearId = $request->string('academic_year_id')->toString();
        $academicStatus = $request->string('academic_status')->toString();

        if ($classId !== '' || $yearId !== '' || $academicStatus !== '') {
            $query->whereHas('enrollments', function ($q) use ($classId, $yearId, $academicStatus): void {
                $q->when($classId !== '', fn ($x) => $x->where('class_id', $classId))
                    ->when($yearId !== '', fn ($x) => $x->where('academic_year_id', $yearId))
                    ->when($academicStatus !== '', fn ($x) => $x->where('academic_status', $academicStatus));
            });
        }

        // Tri (liste blanche) + départage par id : sans lui, des created_at identiques
        // (création en masse) rendent l'ordre non déterministe et la pagination instable.
        $sort = in_array($request->string('sort')->toString(), self::SORTABLE, true)
            ? $request->string('sort')->toString() : 'created_at';
        $direction = $request->string('direction')->toString() === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sort, $direction)->orderBy('id');

        $perPage = in_array((int) $request->per_page, [10, 25, 50, 100], true)
            ? (int) $request->per_page : 25;

        $students = $query->paginate($perPage)->withQueryString();

        return Inertia::render('Eleves/Students/Index', [
            'students' => $students,
            'perPage' => $perPage,
            'filters' => array_merge(
                $request->only([
                    'search', 'gender', 'nationality', 'status', 'per_page',
                    'class_id', 'academic_year_id', 'academic_status', 'region', 'prefecture',
                ]),
                ['sort' => $sort, 'direction' => $direction],
            ),
            'options' => [
                'classrooms' => Classroom::orderBy('name')->get(['id', 'name']),
                'academicYears' => AcademicYear::orderByDesc('start_date')->get(['id', 'year']),
                'academicStatuses' => Enrollment::ACADEMIC_STATUSES,
                'regions' => Student::query()->whereNotNull('region')->where('region', '!=', '')
                    ->distinct()->orderBy('region')->pluck('region'),
                'prefectures' => Student::query()->whereNotNull('prefecture')->where('prefecture', '!=', '')
                    ->distinct()->orderBy('prefecture')->pluck('prefecture'),
            ],
            // Query builder (sans casts Eloquent) : l'alias "active" entrerait sinon en
            // collision avec le cast booléen du modèle et renverrait true au lieu du compte.
            'stats' => DB::table('students')->whereNull('deleted_at')->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN active = true  THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN active = false THEN 1 ELSE 0 END) as inactive,
                SUM(CASE WHEN gender = 'male'   THEN 1 ELSE 0 END) as male,
                SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as female,
                SUM(CASE WHEN gender IS NULL OR gender = '' THEN 1 ELSE 0 END) as other
            ")->first(),
        ]);
    }

    public function bulkStatus(Request $request): RedirectResponse
    {
        $this->authorize('bulkStatus', Student::class);
        $validated = $request->validate([
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['required', 'uuid', 'exists:students,id'],
            'action' => ['required', 'in:activate,deactivate'],
        ]);

        $isActive = $validated['action'] === 'activate';

        $updatedCount = Student::whereIn('id', $validated['student_ids'])
            ->update(['active' => $isActive]);

        $statusLabel = $isActive ? 'activé(s)' : 'désactivé(s)';

        return redirect()->route('students.index')
            ->with('success', "{$updatedCount} élève(s) {$statusLabel} avec succès.");
    }

    public function create(): Response
    {
        $this->authorize('create', Student::class);

        return Inertia::render('Eleves/Students/Create');
    }

    public function store(StoreStudentRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $photo = $request->file('profile_photo');

        DB::transaction(function () use ($data, $photo): void {
            $studentFillable = array_filter(
                (new Student)->getFillable(),
                static fn (string $column): bool => $column !== 'user_id'
            );

            // La photo est un fichier (upload) → gérée à part, jamais en assignation de masse.
            $studentData = Arr::except(Arr::only($data, $studentFillable), ['profile_photo']);
            $studentData['active'] = (bool) ($studentData['active'] ?? true);

            $student = Student::create($studentData);

            if ($photo) {
                $student->update([
                    'profile_photo' => $photo->store($student->storageFolder().'/photo', 'secure'),
                ]);
            }

            $student->information()->create($data['information']);
            $student->parentInfo()->create($data['parent']);
            $student->medicalInfo()->create($data['medical'] ?? []);
        });

        return redirect()->route('students.index')
            ->with('success', 'Élève créé avec succès.');
    }

    public function show(Student $student): Response
    {
        $this->authorize('view', $student);

        $student->load(['user', 'information', 'parentInfo', 'medicalInfo']);

        // Inscription la plus récente (pour pré-remplir classe + année)
        $latestEnrollment = Enrollment::with(['classroom:id,name', 'academicYear:id,year'])
            ->where('student_id', $student->id)
            ->orderByDesc('enrollment_date')
            ->orderByDesc('created_at')
            ->first();

        // Modèles de documents actifs (hors bulletins, générés séparément)
        $templates = DocumentTemplate::where('is_active', true)
            ->whereIn('category', ['certificat', 'attestation'])
            ->orderBy('category')->orderBy('name')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'type_label' => $t->typeLabel(),
                'category' => $t->category,
            ]);

        // Documents déjà délivrés (traçabilité)
        $issued = DocumentIssuance::with(['template:id,name', 'issuedBy:id,firstname,lastname'])
            ->where('student_id', $student->id)
            ->orderByDesc('issued_at')
            ->get()
            ->map(fn ($i) => [
                'id' => $i->id,
                'reference_number' => $i->reference_number,
                'template_name' => $i->template?->name,
                'issued_by' => $i->issuedBy?->name,
                'issued_at' => $i->issued_at?->format('d/m/Y H:i'),
            ]);

        // Inscription de l'année active (pour la réaffectation de classe)
        $activeYear = AcademicYear::where('active', true)->first(['id', 'year']);
        $currentEnrollment = $activeYear
            ? Enrollment::with('classroom:id,name,code')
                ->where('student_id', $student->id)
                ->where('academic_year_id', $activeYear->id)
                ->first()
            : null;

        return Inertia::render('Eleves/Students/Show', [
            'student' => $student,
            'documentContext' => [
                'templates' => $templates,
                'classe' => $latestEnrollment?->classroom?->name,
                'annee_scolaire' => $latestEnrollment?->academicYear?->year,
            ],
            'issuedDocuments' => $issued,
            'currentEnrollment' => $currentEnrollment ? [
                'id' => $currentEnrollment->id,
                'class_id' => $currentEnrollment->class_id,
                'class_name' => $currentEnrollment->classroom?->name,
                'class_code' => $currentEnrollment->classroom?->code,
                'year' => $activeYear?->year,
            ] : null,
            'classrooms' => Classroom::where('active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'documents' => $student->documents()->with('uploadedBy:id,firstname,lastname')->latest()->get()->map(fn ($d) => [
                'id' => $d->id,
                'name' => $d->name,
                'original_name' => $d->original_name,
                'mime' => $d->mime,
                'size' => $d->size,
                'uploaded_by' => $d->uploadedBy?->name,
                'created_at' => $d->created_at?->format('d/m/Y'),
            ]),
        ]);
    }

    /**
     * Réaffecte l'élève à une autre classe pour l'année active.
     */
    public function changeClass(Request $request, Student $student): RedirectResponse
    {
        $this->authorize('update', $student);

        $validated = $request->validate([
            'class_id' => ['required', 'uuid', 'exists:classes,id'],
        ]);

        $activeYear = AcademicYear::where('active', true)->first(['id']);
        abort_unless($activeYear, 422, 'Aucune année académique active.');

        $enrollment = Enrollment::where('student_id', $student->id)
            ->where('academic_year_id', $activeYear->id)
            ->first();

        abort_unless($enrollment, 422, 'Cet élève n\'a pas d\'inscription pour l\'année active.');

        $enrollment->update(['class_id' => $validated['class_id']]);

        return back()->with('success', 'Élève réaffecté à la nouvelle classe.');
    }

    public function history(Student $student): Response
    {
        $this->authorize('view', $student);

        $enrollments = Enrollment::query()
            ->with([
                'classroom:id,name,code',
                'academicYear:id,year',
                'invoice:id,enrollment_id,status',
            ])
            ->where('student_id', $student->id)
            ->orderByDesc('enrollment_date')
            ->orderByDesc('created_at')
            ->get()
            ->map(static fn (Enrollment $enrollment): array => [
                'id' => $enrollment->id,
                'classroom' => [
                    'name' => $enrollment->classroom?->name,
                    'code' => $enrollment->classroom?->code,
                ],
                'academic_year' => $enrollment->academicYear?->year,
                'enrollment_date' => $enrollment->enrollment_date?->format('Y-m-d'),
                'enrollment_code' => $enrollment->enrollment_code,
                'status' => $enrollment->invoice?->status ?? 'NONE',
                'academic_status' => $enrollment->academic_status ?? 'en_cours',
                'academic_status_label' => Enrollment::ACADEMIC_STATUSES[$enrollment->academic_status ?? 'en_cours'] ?? '—',
                'status_reason' => $enrollment->status_reason,
            ])
            ->values();

        return Inertia::render('Eleves/Students/History', [
            'student' => [
                'id' => $student->id,
                'firstname' => $student->firstname,
                'lastname' => $student->lastname,
                'matricule' => $student->matricule,
            ],
            'enrollments' => $enrollments,
        ]);
    }

    public function edit(Student $student): Response
    {
        $this->authorize('update', $student);

        $student->load(['user', 'information', 'parentInfo', 'medicalInfo']);

        return Inertia::render('Eleves/Students/Edit', [
            'student' => $student,
        ]);
    }

    public function update(UpdateStudentRequest $request, Student $student): RedirectResponse
    {
        $data = $request->validated();
        $photo = $request->file('profile_photo');

        DB::transaction(function () use ($data, $student, $photo): void {
            $studentFillable = array_filter(
                (new Student)->getFillable(),
                static fn (string $column): bool => $column !== 'user_id'
            );

            // La photo (fichier) est gérée à part ; on ne l'assigne pas en masse.
            $studentData = Arr::except(Arr::only($data, $studentFillable), ['profile_photo']);
            $studentData['active'] = (bool) ($studentData['active'] ?? $student->active);

            $student->update($studentData);

            if ($photo) {
                if ($student->profile_photo) {
                    Storage::disk('secure')->delete($student->profile_photo);
                }
                $student->update([
                    'profile_photo' => $photo->store($student->storageFolder().'/photo', 'secure'),
                ]);
            }

            $student->information()->updateOrCreate([], $data['information']);
            $student->parentInfo()->updateOrCreate([], $data['parent']);
            $student->medicalInfo()->updateOrCreate([], $data['medical'] ?? []);
        });

        return redirect()->route('students.index')
            ->with('success', 'Élève mis à jour avec succès.');
    }

    public function destroy(Student $student): RedirectResponse
    {
        $this->authorize('delete', $student);

        // Supprime tout le dossier privé de l'élève (photo, documents)
        Storage::disk('secure')->deleteDirectory($student->storageFolder());

        $student->delete();

        return redirect()->route('students.index')
            ->with('success', 'Élève supprimé avec succès.');
    }

    /**
     * Téléverse / remplace la photo de profil de l'élève.
     */
    public function uploadPhoto(Request $request, Student $student): RedirectResponse
    {
        $this->authorize('update', $student);

        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        // Supprime l'ancienne photo si présente (disque privé)
        if ($student->profile_photo) {
            Storage::disk('secure')->delete($student->profile_photo);
        }

        $student->update([
            'profile_photo' => $request->file('photo')->store($student->storageFolder().'/photo', 'secure'),
        ]);

        return back()->with('success', 'Photo mise à jour.');
    }

    /**
     * Supprime la photo de profil de l'élève.
     */
    public function deletePhoto(Student $student): RedirectResponse
    {
        $this->authorize('update', $student);

        if ($student->profile_photo) {
            Storage::disk('secure')->delete($student->profile_photo);
            $student->update(['profile_photo' => null]);
        }

        return back()->with('success', 'Photo supprimée.');
    }

    /**
     * Sert la photo d'un élève (fichier privé) via une route authentifiée.
     */
    public function photo(Student $student)
    {
        $this->authorize('view', $student);

        abort_unless($student->profile_photo && Storage::disk('secure')->exists($student->profile_photo), 404);

        return Storage::disk('secure')->response($student->profile_photo);
    }
}
