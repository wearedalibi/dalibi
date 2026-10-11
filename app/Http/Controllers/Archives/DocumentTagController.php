<?php

namespace App\Http\Controllers\Archives;

use App\Http\Controllers\Controller;
use App\Models\DocumentTag;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DocumentTagController extends Controller
{
    private function authorizeManage(Request $request): void
    {
        // Socle de sécurité (voir ArchiveController) : jamais d'accès sans le droit de lecture.
        abort_unless($request->user()?->can('view_archives'), 403);
    }

    public function index(Request $request): Response
    {
        $this->authorizeManage($request);

        $search = trim((string) $request->query('search', ''));

        $tags = DocumentTag::withCount('documents')
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (DocumentTag $t) => [
                'id' => $t->id,
                'name' => $t->name,
                'color' => $t->color,
                'documents_count' => $t->documents_count,
            ]);

        return Inertia::render('Archives/Tags', [
            'tags' => $tags,
            'filters' => ['search' => $search],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorizeManage($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'color' => ['nullable', 'string', 'max:20'],
        ]);

        $slug = Str::slug($data['name']);
        if (DocumentTag::where('slug', $slug)->exists()) {
            throw ValidationException::withMessages(['name' => 'Ce tag existe déjà.']);
        }

        DocumentTag::create([
            'name' => trim($data['name']),
            'slug' => $slug,
            'color' => $data['color'] ?? '#64748b',
        ]);

        return back()->with('success', 'Tag créé.');
    }

    public function update(Request $request, DocumentTag $documentTag): RedirectResponse
    {
        $this->authorizeManage($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'color' => ['nullable', 'string', 'max:20'],
        ]);

        $slug = Str::slug($data['name']);
        $exists = DocumentTag::where('slug', $slug)->where('id', '!=', $documentTag->id)->exists();
        if ($exists) {
            throw ValidationException::withMessages(['name' => 'Un tag avec ce nom existe déjà.']);
        }

        $documentTag->update([
            'name' => trim($data['name']),
            'slug' => Str::slug($data['name']),
            'color' => $data['color'] ?? $documentTag->color,
        ]);

        return back()->with('success', 'Tag mis à jour.');
    }

    public function destroy(Request $request, DocumentTag $documentTag): RedirectResponse
    {
        $this->authorizeManage($request);
        $documentTag->delete(); // le pivot est nettoyé par cascade

        return back()->with('success', 'Tag supprimé.');
    }
}
