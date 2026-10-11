<?php

namespace Database\Seeders;

use App\Constants\Roles;
use App\Models\School;
use App\Models\User;
use App\Services\MatriculeService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class DefaultUsersSeeder extends Seeder
{
    /** Mot de passe par défaut commun (À CHANGER en production). */
    private const PASSWORD = 'password';

    public function run(): void
    {
        // Garde-fou : ces comptes utilisent un mot de passe connu, jamais en production.
        if (app()->environment('production')) {
            $this->command?->warn('DefaultUsersSeeder ignoré : comptes de démonstration interdits en production.');

            return;
        }

        // École par défaut (dépendance des seeders de classes)
        if (! School::query()->exists()) {
            School::create([
                'name' => 'École Centrale',
                'level' => 'primaire',
                'code' => 'ECOLE001',
                'address' => 'Lomé, Togo',
                'phone' => '+228 22 123 456',
                'email' => 'contact@dalibi.tg',
                'principal' => 'Directeur École',
                'description' => 'École de démonstration',
                'active' => true,
            ]);
        }

        // Un compte de démonstration par rôle
        $users = [
            ['Admin', 'Système', 'admin@dalibi.tg', Roles::ADMINISTRATOR],
            ['Daniel', 'Directeur', 'directeur@dalibi.tg', Roles::DIRECTOR],
            ['Estelle', 'Enseignante', 'enseignant@dalibi.tg', Roles::TEACHER],
            ['Claire', 'Comptable', 'comptable@dalibi.tg', Roles::ACCOUNTING],
            ['Isabelle', 'Secrétaire', 'secretaire@dalibi.tg', Roles::SECRETARIAT],
        ];

        foreach ($users as [$firstname, $lastname, $email, $role]) {
            $user = User::updateOrCreate(
                ['email' => $email],
                [
                    'firstname' => $firstname,
                    'lastname' => $lastname,
                    'gender' => 'female',
                    'password' => self::PASSWORD,
                    'is_demo' => true,
                    // Mot de passe connu : l'utilisateur doit en choisir un à la 1re connexion.
                    'must_change_password' => true,
                    'email_verified_at' => Carbon::now(),
                ],
            );

            $user->syncRoles([$role]);

            // Matricule basé sur le rôle (préfixe ADM/DIR/PROF/COMPT/SEC).
            // On régénère aussi les anciens préfixes "USR" (fallback) le cas échéant.
            if (! $user->natricule || str_starts_with($user->natricule, 'USR')) {
                $user->natricule = app(MatriculeService::class)->generateUserMatricule($role);
                $user->save();
            }

            $this->command?->info("• {$email} ({$role})");
        }

        $this->command?->warn(
            'Comptes de démonstration créés — mot de passe : "'.self::PASSWORD.'". '
            .'Un changement de mot de passe sera exigé à la première connexion.'
        );
    }
}
