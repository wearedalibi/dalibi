<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\School;
use App\Models\Student;
use App\Models\StudentInformation;
use App\Models\StudentMedicalInfo;
use App\Models\StudentParent;
use App\Models\User;
use Faker\Factory as Faker;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Élèves fictifs pour le DÉVELOPPEMENT uniquement.
 *
 * Crée 50 élèves complets (compte, dossier administratif, parents, fiche médicale)
 * et les **inscrit** à l'année académique active dans une classe — sans quoi les
 * élèves seraient orphelins (ni classe ni année) et la plupart des écrans
 * resteraient vides.
 */
class StudentTestSeeder extends Seeder
{
    private const COUNT = 50;

    /** Mot de passe des comptes élèves de démonstration. */
    private const PASSWORD = 'password123';

    public function run(): void
    {
        // Garde-fou : données fictives interdites en production.
        if (app()->environment('production')) {
            $this->command?->warn('StudentTestSeeder ignoré : données fictives interdites en production.');

            return;
        }

        // Idempotent : on ne régénère pas de faux élèves si la base en contient déjà.
        if (Student::query()->exists()) {
            $this->command?->warn('StudentTestSeeder ignoré : des élèves existent déjà.');

            return;
        }

        $faker = Faker::create('fr_FR');

        // Contexte d'inscription (école, année active, classes disponibles).
        $school = School::query()->first();
        $academicYear = $this->resolveAcademicYear();
        $classroomIds = Classroom::query()->pluck('id')->all();
        $enrolledBy = User::query()->value('id');

        $canEnroll = $school && $academicYear && $classroomIds !== [];
        if (! $canEnroll) {
            $this->command?->warn(
                'Élèves créés sans inscription : école, année académique active ou classes manquantes.'
            );
        }

        for ($i = 0; $i < self::COUNT; $i++) {
            $firstname = $faker->firstName();
            $lastname = $faker->lastName();
            $email = $faker->unique()->safeEmail();

            $user = User::create([
                'firstname' => $firstname,
                'lastname' => $lastname,
                'email' => $email,
                'gender' => $faker->randomElement(['male', 'female']),
                'birth_date' => $faker->dateTimeBetween('-25 years', '-18 years')->format('Y-m-d'),
                'telephone' => $faker->phoneNumber(),
                'address' => $faker->address(),
                'password' => Hash::make(self::PASSWORD),
                'is_demo' => true,
                'email_verified_at' => now(),
            ]);

            // Matricule volontairement simple et déterministe pour les jeux de test.
            $student = Student::create([
                'user_id' => $user->id,
                'matricule' => 'TEST'.str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT),
                'firstname' => $firstname,
                'lastname' => $lastname,
                'gender' => $faker->randomElement(['male', 'female']),
                'birth_date' => $faker->dateTimeBetween('-18 years', '-6 years')->format('Y-m-d'),
                'place_of_birth' => $faker->city(),
                'nationality' => 'Togolaise',
                'address' => $faker->streetAddress(),
                'city' => $faker->city(),
                'phone' => $faker->phoneNumber(),
                'email' => $email,
                'active' => $faker->boolean(90),
            ]);

            StudentInformation::create([
                'student_id' => $student->id,
                'birth_certificate_number' => 'ACT-'.$faker->unique()->numberBetween(100000, 999999),
                'birth_certificate_issue_date' => $faker->dateTimeBetween('-10 years', '-1 year')->format('Y-m-d'),
                'birth_certificate_issue_place' => $faker->city(),
                'admission_type' => $faker->randomElement(['new', 'transfer', 're_admission']),
            ]);

            StudentParent::create([
                'student_id' => $student->id,
                'father_firstname' => $faker->firstName('male'),
                'father_lastname' => $faker->lastName(),
                'father_profession' => $faker->randomElement([
                    'Enseignant', 'Médecin', 'Ingénieur', 'Commerçant', 'Agriculteur',
                    'Fonctionnaire', 'Chauffeur', 'Électricien', 'Plombier', 'Menuisier',
                ]),
                'father_phone' => $faker->phoneNumber(),
                'mother_firstname' => $faker->firstName('female'),
                'mother_lastname' => $faker->lastName(),
                'mother_profession' => $faker->randomElement([
                    'Enseignante', 'Médecin', 'Infirmière', 'Commerçante', 'Fonctionnaire',
                    'Coiffeuse', 'Couturière', 'Ménagère', 'Vendeuse', 'Secrétaire',
                ]),
                'mother_phone' => $faker->phoneNumber(),
                'email' => $faker->email(),
            ]);

            StudentMedicalInfo::create([
                'student_id' => $student->id,
                'blood_group' => $faker->randomElement(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
                'allergies' => $faker->optional(0.3)->randomElement([
                    'Arachides', 'Lait', 'Oeufs', 'Poisson', 'Fruits de mer',
                    'Pollen', 'Acariens', 'Chats', 'Chiens', 'Poussière',
                ]),
                'vaccinations' => $faker->optional(0.8)->randomElement([
                    'DTC-Polio-Hib-HepB', 'Rougeole-Oreillons-Rubéole', 'Méningite',
                    'Hépatite B', 'Fièvre jaune', 'Tétanos', 'Diphtérie',
                ]),
                'emergency_contact_name' => $faker->name(),
                'emergency_contact_phone' => $faker->phoneNumber(),
            ]);

            // Inscription à l'année active, dans une classe au hasard.
            if ($canEnroll) {
                Enrollment::create([
                    'school_id' => $school->id,
                    'student_id' => $student->id,
                    'class_id' => $faker->randomElement($classroomIds),
                    'academic_year_id' => $academicYear->id,
                    'enrollment_code' => 'INS-'.$academicYear->year.'-'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
                    'enrolled_by' => $enrolledBy,
                    'enrollment_date' => now()->toDateString(),
                    'status' => $faker->boolean(75) ? Enrollment::STATUS_ACTIVE : Enrollment::STATUS_PENDING,
                ]);
            }
        }

        $this->command?->info(
            self::COUNT.' élèves de test créés'.($canEnroll ? ' et inscrits.' : ' (sans inscription).')
        );
    }

    /**
     * Année académique active : on réutilise l'existante, sinon on crée
     * l'année scolaire courante (développement uniquement).
     */
    private function resolveAcademicYear(): ?AcademicYear
    {
        $active = AcademicYear::query()->where('active', true)->first()
            ?? AcademicYear::query()->latest('start_date')->first();

        if ($active) {
            return $active;
        }

        // Une année scolaire démarre en septembre : avant septembre, on est sur N-1/N.
        $startYear = (int) now()->month >= 9 ? (int) now()->year : (int) now()->year - 1;

        return AcademicYear::create([
            'year' => $startYear.'-'.($startYear + 1),
            'start_date' => $startYear.'-09-01',
            'end_date' => ($startYear + 1).'-07-01',
            'active' => true,
        ]);
    }
}
