<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Jobs\ArchiveAcademicYearJob;
use App\Jobs\RunBackupJob;
use App\Models\AcademicYear;
use App\Models\Backup;
use App\Models\BackupSetting;
use App\Models\FileStorageSetting;
use App\Services\BackupService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class BackupController extends Controller
{
    public function __construct(private readonly BackupService $service) {}

    private function authorizeAdmin(Request $request): void
    {
        // Socle de sécurité : les routes portent la permission fine (create/restore/
        // delete_backups), mais aucun accès n'est possible sans le droit de lecture.
        abort_unless($request->user()?->can('view_backups'), 403);
    }

    public function index(Request $request): Response
    {
        $this->authorizeAdmin($request);

        $backups = Backup::with('createdBy:id,firstname,lastname')
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (Backup $b) => [
                'id' => $b->id,
                'filename' => $b->filename,
                'format' => $b->format,
                'disk' => $b->disk,
                'size' => $b->size,
                'status' => $b->status,
                'error' => $b->error,
                'scheduled' => $b->scheduled,
                'locked' => $b->locked,
                'label' => $b->label,
                'includes_media' => $b->includes_media,
                'checksum' => $b->checksum ? substr($b->checksum, 0, 12) : null,
                'created_by' => $b->createdBy?->name,
                'created_at' => $b->created_at?->format('d/m/Y H:i'),
            ]);

        return Inertia::render('Parametres/Backups', [
            'backups' => $backups,
            'settings' => BackupSetting::allSettings(),
            'storageDriver' => FileStorageSetting::get('driver', 'local') === 's3' ? 's3' : 'local',
            'academicYears' => AcademicYear::orderByDesc('start_date')->get(['id', 'year'])
                ->map(fn (AcademicYear $y) => [
                    'id' => $y->id,
                    'year' => $y->year,
                    'archived' => Backup::where('academic_year_id', $y->id)
                        ->where('locked', true)->where('status', 'completed')->exists(),
                ]),
            'tables' => $this->service->restorableTables(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'formats' => ['required', 'array', 'min:1'],
            'formats.*' => ['in:json,sql'],
            'with_media' => ['sometimes', 'boolean'],
        ], [
            'formats.required' => 'Choisissez au moins un format.',
        ]);

        RunBackupJob::dispatch($validated['formats'], $request->user()->id, false, (bool) ($validated['with_media'] ?? false));

        return back()->with(
            'success',
            'Sauvegarde lancée. Elle apparaîtra dans la liste une fois terminée.'
        );
    }

    public function archive(Request $request): RedirectResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'academic_year_id' => ['required', 'uuid', 'exists:academic_years,id'],
        ], [
            'academic_year_id.required' => 'Choisissez une année scolaire à archiver.',
        ]);

        $year = AcademicYear::findOrFail($validated['academic_year_id']);

        $exists = Backup::where('academic_year_id', $year->id)
            ->where('locked', true)->where('status', 'completed')->exists();

        if ($exists) {
            return back()->with('error', "Une archive verrouillée existe déjà pour l'année {$year->year}.");
        }

        ArchiveAcademicYearJob::dispatch($year->id, $request->user()->id);

        return back()->with('success', "Archive de l'année {$year->year} lancée. Elle apparaîtra dans la liste une fois terminée.");
    }

    public function restore(Request $request): RedirectResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:204800'], // 200 Mo
            'only_table' => ['nullable', 'string', 'max:255'],
        ], [
            'file.required' => 'Sélectionnez un fichier de sauvegarde.',
            'file.max' => 'Le fichier ne doit pas dépasser 200 Mo.',
        ]);

        $ext = strtolower($request->file('file')->getClientOriginalExtension());
        if (! in_array($ext, ['json', 'sql', 'gz', 'dump', 'zip'], true)) {
            return back()->withErrors(['file' => 'Format non supporté : choisissez un fichier .json, .sql, .gz, .dump ou .zip.']);
        }

        $onlyTable = $validated['only_table'] ?? null;
        if ($onlyTable !== null && ! in_array($onlyTable, $this->service->restorableTables(), true)) {
            return back()->withErrors(['only_table' => 'Table cible invalide.']);
        }

        try {
            $result = $this->service->restore($request->file('file'), $onlyTable);
        } catch (\Throwable $e) {
            return back()->with('error', 'Échec de la restauration : '.$e->getMessage());
        }

        $detail = isset($result['rows'])
            ? "{$result['tables']} table(s), {$result['rows']} lignes"
            : "{$result['tables']} table(s)";
        if (isset($result['media'])) {
            $detail .= ", {$result['media']} fichier(s) média";
        }
        $scope = $onlyTable ? " de la table « {$onlyTable} »" : '';

        return back()->with('success', "Restauration{$scope} effectuée ({$detail}). Une sauvegarde de sécurité a été créée au préalable.");
    }

    public function verify(Request $request, Backup $backup): RedirectResponse
    {
        $this->authorizeAdmin($request);

        $result = $this->service->verify($backup);

        return $result['ok']
            ? back()->with('success', "Contrôle d'intégrité : {$result['reason']}")
            : back()->with('error', "Contrôle d'intégrité : {$result['reason']}");
    }

    public function download(Request $request, Backup $backup)
    {
        $this->authorizeAdmin($request);

        abort_unless($backup->status === 'completed', 404);
        abort_unless(Storage::disk('media')->exists($backup->path), 404);

        return Storage::disk('media')->download($backup->path, $backup->filename);
    }

    public function destroy(Request $request, Backup $backup): RedirectResponse
    {
        $this->authorizeAdmin($request);

        $this->service->delete($backup);

        return back()->with('success', 'Sauvegarde supprimée.');
    }

    public function updateSchedule(Request $request): RedirectResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'frequency' => ['required', 'in:none,daily,weekly'],
            'time' => ['required', 'date_format:H:i'],
            'day_of_week' => ['required', 'integer', 'between:1,7'],
            'formats' => ['required', 'array', 'min:1'],
            'formats.*' => ['in:json,sql'],
            'retention' => ['required', 'integer', 'min:0', 'max:365'],
        ]);

        BackupSetting::set('frequency', $validated['frequency']);
        BackupSetting::set('time', $validated['time']);
        BackupSetting::set('day_of_week', (string) $validated['day_of_week']);
        BackupSetting::set('formats', implode(',', $validated['formats']));
        BackupSetting::set('retention', (string) $validated['retention']);

        return back()->with('success', 'Planification mise à jour.');
    }
}
