<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Models\DocumentHeader;
use App\Models\School;
use App\Services\DocumentRenderer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DocumentHeaderController extends Controller
{
    /** Affiche l'éditeur drag-and-drop de l'en-tête des documents. */
    public function edit(Request $request): Response
    {
        abort_unless($request->user()->can('view_document_headers'), 403);

        $school = $this->activeSchool();
        $header = $school->documentHeader;

        $config = $header
            ? ['layout' => $header->layout, 'watermark' => $header->watermark]
            : DocumentHeader::defaultLayout($school);

        return Inertia::render('Parametres/Documents/HeaderDesigner', [
            'header' => $config,
            'preset' => $header?->preset ?? 'ministeriel',
            'presets' => DocumentHeader::PRESETS,
            'default' => DocumentHeader::defaultLayout($school),
            'watermarkImageUrl' => $this->mediaUrl($config['watermark']['image_path'] ?? null),
            'variables' => DocumentRenderer::variableCatalog(),
            'canvasWidth' => DocumentHeader::CANVAS_WIDTH,
            'school' => [
                'name' => $school->name,
                'logo_url' => $this->mediaUrl($school->logo),
            ],
        ]);
    }

    /** Enregistre la disposition + le filigrane (avec image éventuelle). */
    public function update(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('edit_document_headers'), 403);

        $validated = $request->validate([
            'preset' => ['required', Rule::in(array_keys(DocumentHeader::PRESETS))],
            'layout' => ['required', 'string'],
            'watermark' => ['required', 'string'],
            'watermark_image' => ['nullable', 'image', 'max:2048'],
        ]);

        $layout = json_decode($validated['layout'], true);
        $watermark = json_decode($validated['watermark'], true);

        abort_unless(is_array($layout) && is_array($watermark), 422, 'Données invalides.');

        $school = $this->activeSchool();
        $header = $school->documentHeader;

        if ($request->hasFile('watermark_image')) {
            if ($header && ! empty($header->watermark['image_path'])) {
                Storage::disk('media')->delete($header->watermark['image_path']);
            }
            $watermark['image_path'] = $request->file('watermark_image')->store('schools/watermarks', 'media');
        }

        DocumentHeader::updateOrCreate(
            ['school_id' => $school->id],
            [
                'preset' => $validated['preset'],
                'layout' => $this->sanitizeLayout($layout),
                'watermark' => $watermark,
            ],
        );

        return back()->with('message', 'En-tête des documents enregistré.');
    }

    /** Garantit une structure de layout cohérente. */
    private function sanitizeLayout(array $layout): array
    {
        return [
            'width' => (int) ($layout['width'] ?? DocumentHeader::CANVAS_WIDTH),
            'height' => max(60, min(400, (int) ($layout['height'] ?? 130))),
            'elements' => array_values(array_filter(
                $layout['elements'] ?? [],
                fn ($e) => is_array($e) && isset($e['type']),
            )),
        ];
    }

    private function activeSchool(): School
    {
        $school = School::query()->first();
        abort_unless($school, 404, 'Aucune école configurée.');

        return $school;
    }

    private function mediaUrl(?string $path): ?string
    {
        return $path && Storage::disk('media')->exists($path)
            ? Storage::disk('media')->url($path)
            : null;
    }
}
