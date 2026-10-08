<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Models\DocumentIssuance;
use App\Models\DocumentTemplate;
use App\Models\School;
use App\Models\Student;
use App\Services\DocumentRenderer;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DocumentTemplateController extends Controller
{
    public function __construct(private readonly DocumentRenderer $renderer) {}

    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('view_documents'), 403);

        $templates = DocumentTemplate::orderBy('category')->orderBy('name')->get();

        return Inertia::render('Parametres/Documents/Index', [
            'templatesByCategory' => $templates->groupBy('category')->map(
                fn ($group) => $group->map(fn ($t) => [
                    'id' => $t->id,
                    'name' => $t->name,
                    'type' => $t->type,
                    'type_label' => $t->typeLabel(),
                    'is_default' => $t->is_default,
                    'is_active' => $t->is_active,
                ])->values()
            ),
            'categories' => DocumentTemplate::CATEGORIES,
        ]);
    }

    public function create(Request $request): Response
    {
        abort_unless($request->user()->can('create_documents'), 403);

        return Inertia::render('Parametres/Documents/Edit', [
            'template' => null,
            'categories' => DocumentTemplate::CATEGORIES,
            'types' => DocumentTemplate::TYPES,
            'sources' => DocumentTemplate::SOURCES,
            'layouts' => DocumentTemplate::LAYOUTS,
            'variables' => DocumentRenderer::variableCatalog(),
        ]);
    }

    /** Registre central des documents délivrés (traçabilité). */
    public function registry(Request $request): Response
    {
        abort_unless($request->user()->can('view_documents'), 403);

        $search = $request->string('search')->toString();

        $issuances = DocumentIssuance::query()
            ->with(['template:id,name', 'student:id,firstname,lastname,matricule', 'issuedBy:id,firstname,lastname'])
            ->when($search, function ($q) use ($search) {
                $like = '%'.strtolower($search).'%';
                $q->whereRaw('LOWER(reference_number) LIKE ?', [$like])
                    ->orWhereHas('student', fn ($sq) => $sq->whereRaw("LOWER(lastname || ' ' || firstname) LIKE ?", [$like])
                        ->orWhereRaw('LOWER(matricule) LIKE ?', [$like])
                    );
            })
            ->orderByDesc('issued_at')
            ->paginate(25)
            ->withQueryString()
            ->through(fn ($i) => [
                'id' => $i->id,
                'reference_number' => $i->reference_number,
                'template_name' => $i->template?->name,
                'student_name' => $i->student ? $i->student->lastname.' '.$i->student->firstname : '—',
                'student_matricule' => $i->student?->matricule,
                'issued_by' => $i->issuedBy?->name,
                'issued_at' => $i->issued_at?->format('d/m/Y H:i'),
            ]);

        return Inertia::render('Parametres/Documents/Registry', [
            'issuances' => $issuances,
            'filters' => ['search' => $search],
        ]);
    }

    public function show(Request $request, DocumentTemplate $documentTemplate): Response
    {
        abort_unless($request->user()->can('view_documents'), 403);

        $school = $documentTemplate->school ?? School::query()->first() ?? new School;
        $documentTemplate->setRelation('school', $school);

        $variables = $this->renderer->resolveVariables($school, $this->sampleStudent(), [
            'classe.nom' => '3ème A',
            'annee_scolaire' => '2025-2026',
            'document.reference' => 'APERÇU-0000',
            'signataire.titre' => $documentTemplate->signatory_title ?? 'Le Directeur',
        ]);

        return Inertia::render('Parametres/Documents/Show', [
            'template' => [
                'id' => $documentTemplate->id,
                'name' => $documentTemplate->name,
                'description' => $documentTemplate->description,
                'category' => $documentTemplate->category,
                'type' => $documentTemplate->type,
                'type_label' => $documentTemplate->typeLabel(),
                'orientation' => $documentTemplate->orientation,
                'header_enabled' => $documentTemplate->header_enabled,
                'show_signature' => $documentTemplate->show_signature,
                'signatory_title' => $documentTemplate->signatory_title,
                'is_default' => $documentTemplate->is_default,
                'is_active' => $documentTemplate->is_active,
            ],
            'html' => $this->renderer->render($documentTemplate, $variables),
        ]);
    }

    public function edit(Request $request, DocumentTemplate $documentTemplate): Response
    {
        abort_unless($request->user()->can('edit_documents'), 403);

        return Inertia::render('Parametres/Documents/Edit', [
            'template' => $documentTemplate,
            'categories' => DocumentTemplate::CATEGORIES,
            'types' => DocumentTemplate::TYPES,
            'sources' => DocumentTemplate::SOURCES,
            'layouts' => DocumentTemplate::LAYOUTS,
            'variables' => DocumentRenderer::variableCatalog(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('create_documents'), 403);

        $data = $this->validateData($request);
        $this->applyDefault($data);

        DocumentTemplate::create($data);

        return redirect()->route('document-templates.index')
            ->with('message', 'Modèle de document créé avec succès.');
    }

    public function update(Request $request, DocumentTemplate $documentTemplate): RedirectResponse
    {
        abort_unless($request->user()->can('edit_documents'), 403);

        $data = $this->validateData($request);
        $this->applyDefault($data, $documentTemplate->id);

        $documentTemplate->update($data);

        return redirect()->route('document-templates.index')
            ->with('message', 'Modèle mis à jour avec succès.');
    }

    public function destroy(Request $request, DocumentTemplate $documentTemplate): RedirectResponse
    {
        abort_unless($request->user()->can('delete_documents'), 403);

        $documentTemplate->delete();

        return redirect()->route('document-templates.index')
            ->with('message', 'Modèle supprimé.');
    }

    /** Prévisualisation HTML live avec données d'exemple. */
    public function preview(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('create_documents'), 403);

        $validated = $request->validate([
            'source' => ['nullable', Rule::in(array_keys(DocumentTemplate::SOURCES))],
            'layout' => ['nullable', Rule::in(array_keys(DocumentTemplate::LAYOUTS))],
            'content' => ['nullable', 'string'],
            'header_enabled' => ['boolean'],
            'show_signature' => ['boolean'],
            'signatory_title' => ['nullable', 'string'],
        ]);

        $school = School::query()->first() ?? new School;

        $template = new DocumentTemplate([
            'source' => $validated['source'] ?? 'wysiwyg',
            'layout' => $validated['layout'] ?? null,
            'content' => $validated['content'] ?? '',
            'header_enabled' => $validated['header_enabled'] ?? true,
            'show_signature' => $validated['show_signature'] ?? true,
            'signatory_title' => $validated['signatory_title'] ?? 'Le Directeur',
        ]);
        $template->setRelation('school', $school);

        $variables = $this->renderer->resolveVariables($school, $this->sampleStudent(), [
            'classe.nom' => '3ème A',
            'annee_scolaire' => '2025-2026',
            'document.reference' => 'APERÇU-0000',
            'signataire.titre' => $template->signatory_title,
        ]);

        return response()->json(['html' => $this->renderer->render($template, $variables)]);
    }

    /** Génère le PDF officiel pour un élève + enregistre dans le registre. */
    public function generate(Request $request, DocumentTemplate $documentTemplate)
    {
        abort_unless($request->user()->can('generate_documents'), 403);

        $validated = $request->validate([
            'student_id' => ['required', 'uuid', 'exists:students,id'],
            'classe' => ['nullable', 'string'],
            'annee_scolaire' => ['nullable', 'string'],
        ]);

        $student = Student::findOrFail($validated['student_id']);
        $school = $documentTemplate->school ?? School::query()->first() ?? new School;

        $reference = $this->generateReference($documentTemplate);

        $variables = $this->renderer->resolveVariables($school, $student, [
            'classe.nom' => $validated['classe'] ?? '',
            'annee_scolaire' => $validated['annee_scolaire'] ?? '',
            'document.reference' => $reference,
            'signataire.titre' => $documentTemplate->signatory_title ?? 'Le Directeur',
        ]);

        $html = $this->renderer->render($documentTemplate, $variables);

        DocumentIssuance::create([
            'template_id' => $documentTemplate->id,
            'student_id' => $student->id,
            'reference_number' => $reference,
            'issued_by' => $request->user()->id,
            'payload' => $variables,
            'issued_at' => now(),
        ]);

        $pdf = Pdf::loadHTML($html)->setPaper('a4', $documentTemplate->orientation);

        $filename = Str::slug($documentTemplate->typeLabel().'-'.$student->lastname.'-'.$student->firstname).'.pdf';

        return $pdf->download($filename);
    }

    /** Numéro de référence : CS-2026-0001 */
    private function generateReference(DocumentTemplate $template): string
    {
        $prefix = strtoupper(implode('', array_map(
            fn ($w) => $w[0] ?? '',
            explode('_', $template->type)
        )));
        $year = Carbon::now()->year;
        $count = DocumentIssuance::whereYear('issued_at', $year)
            ->where('template_id', $template->id)
            ->count() + 1;

        return sprintf('%s-%d-%04d', $prefix, $year, $count);
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'category' => ['required', 'string', 'in:certificat,attestation,bulletin'],
            'type' => ['required', 'string', 'max:100'],
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:500'],
            'source' => ['required', Rule::in(array_keys(DocumentTemplate::SOURCES))],
            // Layout obligatoire et restreint à la liste blanche quand source = blade
            // (jamais un chemin de vue libre → aucun rendu Blade arbitraire).
            'layout' => ['nullable', 'required_if:source,blade', Rule::in(array_keys(DocumentTemplate::LAYOUTS))],
            'content' => ['nullable', 'required_if:source,wysiwyg', 'string'],
            'header_enabled' => ['boolean'],
            'footer_enabled' => ['boolean'],
            'show_signature' => ['boolean'],
            'signatory_title' => ['nullable', 'string', 'max:100'],
            'orientation' => ['required', 'in:portrait,landscape'],
            'is_default' => ['boolean'],
            'is_active' => ['boolean'],
            'school_id' => ['nullable', 'uuid', 'exists:schools,id'],
        ]);
    }

    /** Un seul modèle par défaut par type. */
    private function applyDefault(array &$data, ?string $ignoreId = null): void
    {
        if (! empty($data['is_default'])) {
            DocumentTemplate::where('type', $data['type'])
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->update(['is_default' => false]);
        }
    }

    private function sampleStudent(): Student
    {
        return new Student([
            'firstname' => 'Koffi',
            'lastname' => 'MENSAH',
            'matricule' => 'TEST-001',
            'birth_date' => '2010-05-12',
            'place_of_birth' => 'Lomé',
            'gender' => 'male',
            'nationality' => 'Togolaise',
        ]);
    }
}
