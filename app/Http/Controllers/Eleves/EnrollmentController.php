<?php

namespace App\Http\Controllers\Eleves;
use App\Http\Controllers\Controller;

use App\Http\Requests\StoreEnrollmentRequest;
use App\Http\Requests\UpdateEnrollmentRequest;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\FeeStructure;
use App\Models\School;
use App\Models\Student;
use App\Services\DocumentRenderer;
use App\Services\InvoiceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class EnrollmentController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Enrollment::with([
            'school', 'student', 'classroom', 'academicYear',
            'invoice:id,enrollment_id,total,amount_paid,amount_remaining,status',
        ]);

        if ($request->filled('search')) {
            $searchTerm = strtolower($request->string('search')->toString());

            $query->where(function ($subQuery) use ($searchTerm): void {
                $subQuery->whereRaw('LOWER(enrollment_code) LIKE ?', ["%{$searchTerm}%"])
                    ->orWhereRaw('LOWER(status) LIKE ?', ["%{$searchTerm}%"])
                    ->orWhereHas('student', function ($studentQuery) use ($searchTerm): void {
                        $studentQuery->whereRaw('LOWER(firstname) LIKE ?', ["%{$searchTerm}%"])
                            ->orWhereRaw('LOWER(lastname) LIKE ?', ["%{$searchTerm}%"])
                            ->orWhereRaw('LOWER(matricule) LIKE ?', ["%{$searchTerm}%"]);
                    })
                    ->orWhereHas('classroom', function ($classroomQuery) use ($searchTerm): void {
                        $classroomQuery->whereRaw('LOWER(name) LIKE ?', ["%{$searchTerm}%"])
                            ->orWhereRaw('LOWER(code) LIKE ?', ["%{$searchTerm}%"]);
                    })
                    ->orWhereHas('academicYear', function ($yearQuery) use ($searchTerm): void {
                        $yearQuery->whereRaw('LOWER(year) LIKE ?', ["%{$searchTerm}%"]);
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        // Filtre année : par défaut sur l'année active tant qu'aucun paramètre n'est
        // fourni ; un paramètre vide (« Toutes les années ») désactive le filtre.
        $activeYearId = AcademicYear::where('active', true)->orderByDesc('year')->value('id');
        $yearFilter = $request->has('academic_year_id')
            ? $request->string('academic_year_id')->toString()
            : (string) $activeYearId;
        if ($yearFilter !== '') {
            $query->where('academic_year_id', $yearFilter);
        }

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->string('class_id')->toString());
        }

        $perPage = in_array((int) $request->per_page, [10, 25, 50, 100], true)
            ? (int) $request->per_page : 25;

        $enrollments = $query->latest()->paginate($perPage)->withQueryString();

        $stats = Enrollment::selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled
        ")->first();

        return Inertia::render('Eleves/Enrollments/Index', [
            'enrollments'   => $enrollments,
            'perPage'       => $perPage,
            'filters'       => [
                'search'           => $request->string('search')->toString(),
                'status'           => $request->string('status')->toString(),
                'academic_year_id' => $yearFilter,
                'class_id'         => $request->string('class_id')->toString(),
                'per_page'         => (string) $perPage,
            ],
            'stats'         => [
                'total'     => (int) $stats->total,
                'pending'   => (int) $stats->pending,
                'active'    => (int) $stats->active,
                'cancelled' => (int) $stats->cancelled,
            ],
            'academicYears' => AcademicYear::orderByDesc('year')->get(['id', 'year']),
            'classrooms'    => Classroom::where('active', true)->orderBy('name')->get(['id', 'name', 'code']),
        ]);
    }

    public function create(): Response
    {
        $feeStructures = FeeStructure::with('feeCategory')
            ->get(['id', 'class_id', 'academic_year_id', 'fee_category_id', 'amount'])
            ->map(fn ($f) => [
                'class_id'         => $f->class_id,
                'academic_year_id' => $f->academic_year_id,
                'label'            => $f->feeCategory->name ?? 'Frais scolaires',
                'amount'           => $f->amount,
            ]);

        return Inertia::render('Eleves/Enrollments/Create', [
            'schools'       => School::where('active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'students'      => Student::where('active', true)->orderBy('firstname')->orderBy('lastname')->get(['id', 'firstname', 'lastname', 'matricule']),
            'classrooms'    => Classroom::where('active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'academicYears' => AcademicYear::orderByDesc('year')->get(['id', 'year', 'active']),
            'feeStructures' => $feeStructures,
        ]);
    }

    public function store(StoreEnrollmentRequest $request): RedirectResponse
    {
        $data                = $request->validated();
        $data['enrolled_by'] = auth()->id();

        $enrollment = DB::transaction(function () use ($data, $request) {
            if (empty($data['enrollment_code'])) {
                $data['enrollment_code'] = $this->generateEnrollmentCode();
            }

            $enrollment = Enrollment::create($data);

            $invoiceService = app(InvoiceService::class);
            $invoice        = $invoiceService->createFromEnrollment($enrollment);

            if ($request->filled('first_payment_amount') && (float) $request->input('first_payment_amount') > 0) {
                $invoiceService->recordPayment($invoice->fresh(), [
                    'amount'           => $request->input('first_payment_amount'),
                    'payment_method'   => $request->input('first_payment_method', 'CASH'),
                    'paid_by'          => $request->input('first_payment_paid_by'),
                    'paid_at'          => $request->input('first_payment_date', now()->toDateString()),
                    'reference_number' => $request->input('first_payment_reference'),
                    'notes'            => $request->input('first_payment_notes'),
                    'created_by'       => auth()->id(),
                ]);
            }

            return $enrollment;
        });

        return redirect()->route('enrollments.invoice', $enrollment->id)
            ->with('success', 'Inscription créée avec succès. La facture a été générée automatiquement.');
    }

    public function show(Enrollment $enrollment): Response
    {
        $enrollment->load(['school', 'student', 'classroom', 'academicYear', 'enrolledBy']);

        $invoice = $enrollment->invoice()->select([
            'id', 'invoice_number', 'total', 'amount_paid', 'amount_remaining', 'status',
        ])->first();

        return Inertia::render('Eleves/Enrollments/Show', [
            'enrollment' => $enrollment,
            'invoice'    => $invoice,
        ]);
    }

    public function receipt(Enrollment $enrollment): Response
    {
        $enrollment->load(['school', 'student', 'classroom', 'academicYear', 'enrolledBy']);

        $school   = $enrollment->school;
        $renderer = app(DocumentRenderer::class);

        return Inertia::render('Eleves/Enrollments/Receipt', [
            'enrollment' => $enrollment,
            'header'     => $school ? $renderer->headerHtml($school, $renderer->resolveVariables($school)) : '',
            'headerCss'  => $renderer->headerCss(),
        ]);
    }

    public function edit(Enrollment $enrollment): Response
    {
        $enrollment->load(['school', 'student', 'classroom', 'academicYear']);

        return Inertia::render('Eleves/Enrollments/Edit', [
            'enrollment'    => $enrollment,
            'schools'       => School::where('active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'students'      => Student::where('active', true)->orderBy('firstname')->orderBy('lastname')->get(['id', 'firstname', 'lastname', 'matricule']),
            'classrooms'    => Classroom::where('active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'academicYears' => AcademicYear::orderByDesc('year')->get(['id', 'year', 'active']),
        ]);
    }

    public function update(UpdateEnrollmentRequest $request, Enrollment $enrollment): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($data, $enrollment): void {
            if (empty($data['enrollment_code'])) {
                $data['enrollment_code'] = $enrollment->enrollment_code ?: $this->generateEnrollmentCode();
            }

            $enrollment->update($data);
        });

        return redirect()->route('enrollments.index')
            ->with('success', 'Inscription mise à jour avec succès.');
    }

    public function destroy(Request $request, Enrollment $enrollment): RedirectResponse
    {
        // Défense en profondeur : la route porte déjà `can:delete_enrollments`.
        abort_unless($request->user()->can('delete_enrollments'), 403);

        // La suppression cascade sur la facture, les paiements et les reçus, alors
        // que les écritures comptables (lien lâche reference_id) et le solde de
        // caisse, eux, ne sont PAS reversés : on détruirait la preuve d'un
        // encaissement en laissant le journal et le solde inchangés.
        if ($enrollment->invoice()->whereHas('payments')->exists()) {
            return back()->withErrors([
                'delete' => "Cette inscription porte des paiements : elle ne peut pas être supprimée sans corrompre la comptabilité. Changez plutôt son statut.",
            ]);
        }

        $enrollment->delete();

        return redirect()->route('enrollments.index')
            ->with('success', 'Inscription supprimée avec succès.');
    }

    private function generateEnrollmentCode(): string
    {
        do {
            $code = 'INS-' . now()->format('Y') . '-' . str_pad((string) random_int(1, 99999), 5, '0', STR_PAD_LEFT);
        } while (Enrollment::where('enrollment_code', $code)->exists());

        return $code;
    }
}
