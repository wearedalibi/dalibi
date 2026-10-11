<?php

namespace App\Jobs;

use App\Services\BackupService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Génère une sauvegarde de la base en arrière-plan.
 *
 * L'opération (dump SQL / export JSON) peut être longue sur de gros volumes ;
 * on la sort du cycle requête/réponse pour ne pas bloquer l'utilisateur.
 * Le statut de chaque sauvegarde est tracé dans la table `backups`.
 */
class RunBackupJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Laisse le temps aux dumps volumineux d'aboutir. */
    public int $timeout = 900;

    /**
     * @param  array<int,string>  $formats
     */
    public function __construct(
        public array $formats,
        public ?string $userId = null,
        public bool $scheduled = false,
        public bool $withMedia = false,
    ) {}

    public function handle(BackupService $service): void
    {
        $service->run($this->formats, $this->userId, $this->scheduled, $this->withMedia);
    }
}
