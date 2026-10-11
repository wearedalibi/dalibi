<?php

namespace App\Jobs;

use App\Models\AcademicYear;
use App\Services\BackupService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Génère l'archive verrouillée d'une année scolaire (clôture).
 *
 * Snapshot complet, étiqueté et conservé à long terme (exclu de la rétention).
 * Idempotent : le service ne recrée pas d'archive si une existe déjà pour l'année.
 */
class ArchiveAcademicYearJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Laisse le temps aux dumps volumineux d'aboutir. */
    public int $timeout = 900;

    public function __construct(
        public string $academicYearId,
        public ?string $userId = null,
        public bool $scheduled = false,
    ) {}

    public function handle(BackupService $service): void
    {
        $year = AcademicYear::find($this->academicYearId);

        if ($year) {
            $service->archiveAcademicYear($year, $this->userId, $this->scheduled);
        }
    }
}
