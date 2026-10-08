<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\MatriculeService;
use Illuminate\Console\Command;

class GenerateUserMatricule extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'matricule:generate-user 
                            {--user-id= : ID de l\'utilisateur}
                            {--all : Générer pour tous les utilisateurs sans matricule}
                            {--force : Forcer la régénération}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Générer les matricules pour les utilisateurs';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $matriculeService = app(MatriculeService::class);

        if ($this->option('all')) {
            // Générer pour tous les utilisateurs sans matricule
            $users = User::whereNull('natricule')->orWhere('natricule', '')->get();

            if ($users->isEmpty()) {
                $this->info('Aucun utilisateur sans matricule trouvé.');

                return 0;
            }

            $this->info("Génération des matricules pour {$users->count()} utilisateurs...");

            $progressBar = $this->output->createProgressBar($users->count());
            $progressBar->start();

            foreach ($users as $user) {
                $user->natricule = $user->generateMatricule();
                $user->save();
                $progressBar->advance();
            }

            $progressBar->finish();
            $this->newLine();
            $this->info('✅ Matricules générés avec succès!');

            return 0;
        }

        $userId = $this->option('user-id');

        if (! $userId) {
            $this->error('Veuillez spécifier --user-id ou --all');

            return 1;
        }

        $user = User::find($userId);

        if (! $user) {
            $this->error("Utilisateur avec l'ID {$userId} non trouvé.");

            return 1;
        }

        if (! $this->option('force') && $user->natricule) {
            $this->error("L'utilisateur a déjà un matricule: {$user->natricule}");
            $this->info('Utilisez --force pour forcer la régénération.');

            return 1;
        }

        $matricule = $user->generateMatricule();
        $user->natricule = $matricule;
        $user->save();

        $this->info("✅ Matricule généré: {$matricule}");

        return 0;
    }
}
