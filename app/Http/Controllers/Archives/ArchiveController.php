<?php

namespace App\Http\Controllers\Archives;

use App\Http\Controllers\Controller;
use App\Models\ArchivedDocument;
use App\Models\Classroom;
use App\Models\DocumentTag;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ArchiveController extends Controller
{
    private const TYPES = ['student' => Student::class, 'classroom' => Classroom::class];

    private function authorizeManage(Request $request): void
    {
        // Socle de sécurité : les routes portent déjà la permission fine (create/edit/
        // delete_archives), mais on refuse ici tout accès sans le droit de lecture —
        // une méthode vide donnerait l'illusion d'un contrôle et laisserait passer
        // une route ajoutée plus tard sans `can:`.
        abort_unless($request->user()?->can('view_archives'), 403);
    }

    public function index(Request $request): Response
    {
        $this->authorizeManage($request);

        $search = $request->string('search')->toString();
        $category = $request->string('category')->toString();
        $tagIds = array_filter((array) $request->input('tags', []));
        $dateFrom = $request->string('date_from')->toString();
        $dateTo = $request->string('date_to')->toString();
        $trashed = $request->boolean('trashed');

        $documents = ArchivedDocument::with(['tags:id,name,color', 'archivedBy:id,firstname,lastname', 'documentable'])
            ->when($trashed, fn ($q) => $q->onlyTrashed())
            ->when($search, fn ($q) => $q->where(function ($w) use ($search) {
                $s = '%'.strtolower($search).'%';
                $w->whereRaw('LOWER(title) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(reference) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(description) LIKE ?', [$s]);
            }))
            ->when($category && array_key_exists($category, ArchivedDocument::CATEGORIES), fn ($q) => $q->where('category', $category))
            ->when($tagIds, fn ($q) => $q->whereHas('tags', fn ($t) => $t->whereIn('document_tags.id', $tagIds)))
            ->when($dateFrom, fn ($q) => $q->whereDate('archived_at', '>=', $dateFrom))
            ->when($dateTo, fn ($q) => $q->whereDate('archived_at', '<=', $dateTo))
            ->orderByDesc('archived_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (ArchivedDocument $d) => [
                'id' => $d->id,
                'reference' => $d->reference,
                'title' => $d->title,
                'description' => $d->description,
                'category' => $d->category,
                'original_name' => $d->original_name,
                'mime' => $d->mime,
                'size' => $d->size,
                'retention_until' => $d->retention_until?->format('Y-m-d'),
                'archived_by' => $d->archivedBy?->name,
                'archived_at' => $d->archived_at?->format('d/m/Y'),
                'link' => $this->linkLabel($d),
                'tags' => $d->tags->map(fn ($t) => ['id' => $t->id, 'name' => $t->name, 'color' => $t->color]),
            ]);

        return Inertia::render('Archives/Index', [
            'documents' => $documents,
            'tags' => DocumentTag::orderBy('name')->get(['id', 'name', 'color']),
            'categories' => ArchivedDocument::CATEGORIES,
            'classrooms' => Classroom::orderBy('name')->get(['id', 'name', 'code']),
            'filters' => [
                'search' => $search,
                'category' => $category,
                'tags' => array_values($tagIds),
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'trashed' => $trashed,
            ],
            'stats' => [
                'total' => ArchivedDocument::count(),
                'trashed' => ArchivedDocument::onlyTrashed()->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorizeManage($request);

        $data = $this->validateDocument($request, fileRequired: true);

        $file = $request->file('file');
        $path = $file->store('archives', 'secure');

        $document = ArchivedDocument::create([
            'reference' => ArchivedDocument::nextReference(),
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'category' => $data['category'],
            'path' => $path,
            'disk' => 'secure',
            'original_name' => $file->getClientOriginalName(),
            'mime' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'retention_until' => $data['retention_until'] ?? null,
            'archived_by' => $request->user()->id,
            'archived_at' => now(),
            ...$this->resolveDocumentable($data),
        ]);

        $document->tags()->sync($this->resolveTags($data['tags'] ?? []));

        return back()->with('success', 'Document archivé ('.$document->reference.').');
    }

    public function update(Request $request, ArchivedDocument $archive): RedirectResponse
    {
        $this->authorizeManage($request);

        $data = $this->validateDocument($request, fileRequired: false);

        $archive->update([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'category' => $data['category'],
            'retention_until' => $data['retention_until'] ?? null,
            ...$this->resolveDocumentable($data),
        ]);

        $archive->tags()->sync($this->resolveTags($data['tags'] ?? []));

        return back()->with('success', 'Document mis à jour.');
    }

    public function download(Request $request, ArchivedDocument $archive)
    {
        $this->authorizeManage($request);
        abort_unless(Storage::disk('secure')->exists($archive->path), 404);

        return Storage::disk('secure')->download($archive->path, $archive->original_name ?: $archive->title);
    }

    public function destroy(Request $request, ArchivedDocument $archive): RedirectResponse
    {
        $this->authorizeManage($request);
        $archive->delete(); // soft delete (corbeille)

        return back()->with('success', 'Document déplacé dans la corbeille.');
    }

    public function restore(Request $request, string $archive): RedirectResponse
    {
        $this->authorizeManage($request);
        ArchivedDocument::onlyTrashed()->findOrFail($archive)->restore();

        return back()->with('success', 'Document restauré.');
    }

    public function forceDelete(Request $request, string $archive): RedirectResponse
    {
        $this->authorizeManage($request);
        $document = ArchivedDocument::withTrashed()->findOrFail($archive);

        Storage::disk('secure')->delete($document->path);
        $document->forceDelete();

        return back()->with('success', 'Document supprimé définitivement.');
    }

    /* ------------------------------------------------------------------ */

    private function validateDocument(Request $request, bool $fileRequired): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:2000'],
            'category' => ['required', 'in:'.implode(',', array_keys(ArchivedDocument::CATEGORIES))],
            'file' => [$fileRequired ? 'required' : 'nullable', 'file', 'max:20480', 'mimes:pdf,doc,docx,xls,xlsx,csv,txt,jpg,jpeg,png,webp,zip'],
            'tags' => ['array'],
            'tags.*' => ['string', 'max:50'],
            'retention_until' => ['nullable', 'date'],
            'link_type' => ['nullable', 'in:student,classroom'],
            'link_classroom_id' => ['nullable', 'uuid', 'exists:classes,id'],
            'link_student_matricule' => ['nullable', 'string', 'max:50'],
        ], [
            'file.max' => 'Le fichier ne doit pas dépasser 20 Mo.',
            'file.mimes' => 'Format non supporté (PDF, Office, image, CSV, TXT, ZIP).',
        ]);
    }

    /** @return array{documentable_type:?string, documentable_id:?string} */
    private function resolveDocumentable(array $data): array
    {
        $type = $data['link_type'] ?? null;

        if ($type === 'classroom' && ! empty($data['link_classroom_id'])) {
            return ['documentable_type' => Classroom::class, 'documentable_id' => $data['link_classroom_id']];
        }

        if ($type === 'student' && ! empty($data['link_student_matricule'])) {
            $student = Student::where('matricule', $data['link_student_matricule'])->first();
            if (! $student) {
                throw ValidationException::withMessages([
                    'link_student_matricule' => 'Aucun élève avec ce matricule.',
                ]);
            }

            return ['documentable_type' => Student::class, 'documentable_id' => $student->id];
        }

        return ['documentable_type' => null, 'documentable_id' => null];
    }

    /** @return array<int,string> ids de tags (créés si nécessaire) */
    private function resolveTags(array $names): array
    {
        return collect($names)
            ->filter(fn ($n) => trim((string) $n) !== '')
            ->map(fn ($n) => DocumentTag::resolve($n)->id)
            ->unique()
            ->values()
            ->all();
    }

    private function linkLabel(ArchivedDocument $d): ?string
    {
        if (! $d->documentable) {
            return null;
        }

        return match ($d->documentable_type) {
            Student::class => 'Élève : '.$d->documentable->name,
            Classroom::class => 'Classe : '.$d->documentable->name,
            default => null,
        };
    }
}
