<?php

namespace App\Console\Commands;

use App\Models\Student;
use App\Services\MatriculeService;
use Illuminate\Console\Command;

class GenerateStudentMatricule extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'matricule:generate-student 
                            {--class-id= : ID de la classe}
                            {--all : Générer pour tous les élèves}
                            {--registration : Générer aussi les numéros d\'enregistrement}
                            {--force : Forcer la régénération}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Générer les matricules pour les élèves';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $matriculeService = app(MatriculeService::class);

        if ($this->option('all')) {
            // Générer pour tous les élèves
            $students = Student::all();

            if ($students->isEmpty()) {
                $this->info('Aucun élève trouvé.');

                return 0;
            }

            $this->info("Génération des matricules pour {$students->count()} élèves...");

            $progressBar = $this->output->createProgressBar($students->count());
            $progressBar->start();

            foreach ($students as $student) {
                // Générer matricule de l'utilisateur
                if (! $student->user->natricule) {
                    $student->user->natricule = $student->user->generateMatricule();
                    $student->user->save();
                }

                // Générer numéro d'enregistrement
                if (! $student->registration_number) {
                    $student->registration_number = $student->generateRegistrationNumber();
                    $student->save();
                }

                $progressBar->advance();
            }

            $progressBar->finish();
            $this->newLine();
            $this->info('✅ Matricules générés avec succès!');

            return 0;
        }

        $classId = $this->option('class-id');

        if (! $classId) {
            $this->error('Veuillez spécifier --class-id ou --all');

            return 1;
        }

        $students = Student::where('class_id', $classId)->get();

        if ($students->isEmpty()) {
            $this->error("Aucun élève trouvé pour la classe {$classId}");

            return 1;
        }

        $this->info("Génération pour {$students->count()} élèves...");

        $progressBar = $this->output->createProgressBar($students->count());
        $progressBar->start();

        foreach ($students as $student) {
            if (! $student->user->natricule) {
                $student->user->natricule = $student->user->generateMatricule();
                $student->user->save();
            }

            if (! $student->registration_number) {
                $student->registration_number = $student->generateRegistrationNumber();
                $student->save();
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine();
        $this->info('✅ Matricules générés avec succès!');

        return 0;
    }
}
