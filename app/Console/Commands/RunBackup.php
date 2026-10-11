<?php

namespace App\Console\Commands;

use App\Models\BackupSetting;
use App\Services\BackupService;
use Illuminate\Console\Command;

class RunBackup extends Command
{
    protected $signature = 'backup:run {--formats= : Formats séparés par une virgule (json,sql)} {--scheduled}';

    protected $description = 'Génère une sauvegarde de la base de données (JSON / SQL)';

    public function handle(BackupService $service): int
    {
        $formats = $this->option('formats')
            ? array_map('trim', explode(',', (string) $this->option('formats')))
            : array_map('trim', explode(',', (string) BackupSetting::get('formats', 'json,sql')));

        $this->info('Sauvegarde en cours ('.implode(', ', $formats).')…');

        $results = $service->run($formats, null, (bool) $this->option('scheduled'));

        foreach ($results as $backup) {
            $line = "  [{$backup->format}] {$backup->filename} — {$backup->status}";
            $backup->status === 'completed' ? $this->info($line) : $this->error($line.' : '.$backup->error);
        }

        return self::SUCCESS;
    }
}
