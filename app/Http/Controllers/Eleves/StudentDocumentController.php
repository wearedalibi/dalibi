<?php

namespace App\Http\Controllers\Eleves;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\StudentDocument;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StudentDocumentController extends Controller
{
    /**
     * Ajoute un ou plusieurs documents au dossier privé de l'élève (students/{id}/documents).
     */
    public function store(Request $request, Student $student): RedirectResponse
    {
        $this->authorize('update', $student);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:5120'],
        ], [
            'name.required' => 'Le nom du document est requis.',
            'file.required' => 'Le fichier est requis.',
            'file.mimes' => 'Formats acceptés : PDF, image, Word.',
            'file.max' => 'Le fichier ne doit pas dépasser 5 Mo.',
        ]);

        $file = $request->file('file');
        $path = $file->store($student->storageFolder().'/documents', 'secure');

        $student->documents()->create([
            'name' => $validated['name'],
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'uploaded_by' => $request->user()->id,
        ]);

        return back()->with('success', 'Document ajouté au dossier de l\'élève.');
    }

    /**
     * Télécharge un document (fichier privé) via une route authentifiée.
     */
    public function download(Request $request, Student $student, StudentDocument $document)
    {
        $this->authorize('view', $student);
        abort_unless($document->student_id === $student->id, 404);
        abort_unless(Storage::disk('secure')->exists($document->path), 404);

        return Storage::disk('secure')->download(
            $document->path,
            $document->original_name ?: $document->name
        );
    }

    public function destroy(Request $request, Student $student, StudentDocument $document): RedirectResponse
    {
        $this->authorize('update', $student);
        abort_unless($document->student_id === $student->id, 404);

        Storage::disk('secure')->delete($document->path);
        $document->delete();

        return back()->with('success', 'Document supprimé.');
    }
}
