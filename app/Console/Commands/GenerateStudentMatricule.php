<?php

namespace App\Console\Commands;

use App\Models\Student;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;

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
                            {--matricule : Générer aussi les matricules des élèves}
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
        $withStudentMatricule = (bool) $this->option('matricule');

        if ($this->option('all')) {
            $students = Student::all();

            if ($students->isEmpty()) {
                $this->info('Aucun élève trouvé.');

                return 0;
            }

            $this->info("Génération des matricules pour {$students->count()} élèves...");
            $this->backfillMatricules($students, $withStudentMatricule);
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
        $this->backfillMatricules($students, $withStudentMatricule);
        $this->info('✅ Matricules générés avec succès!');

        return 0;
    }

    /**
     * Génère les matricules manquants pour un lot d'élèves.
     *
     * @param  Collection<int, Student>  $students
     */
    private function backfillMatricules(Collection $students, bool $withStudentMatricule): void
    {
        $progressBar = $this->output->createProgressBar($students->count());
        $progressBar->start();

        foreach ($students as $student) {
            // Matricule du compte utilisateur associé.
            if (! $student->user->natricule) {
                $student->user->natricule = $student->user->generateMatricule();
                $student->user->save();
            }

            // Matricule de l'élève (optionnel, via --matricule).
            if ($withStudentMatricule && empty($student->matricule)) {
                $student->matricule = $student->generateMatricule();
                $student->save();
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine();
    }
}
