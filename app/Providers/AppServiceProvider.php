<?php

namespace App\Providers;

use App\Models\AcademicYear;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use App\Observers\AcademicYearObserver;
use App\Observers\SchoolObserver;
use App\Observers\StudentObserver;
use App\Observers\UserObserver;
use App\Support\Install\InstallState;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // État d'installation partagé et mémoïsé pour toute la requête.
        $this->app->singleton(InstallState::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->useFileStoresBeforeInstall();
        $this->registerObservers();

        // HTTPS forcé en production, ou lorsque l'assistant d'installation l'a activé
        // (FORCE_HTTPS=true) — jamais en local pour ne pas casser le dev en http.
        if (app()->environment('production') || (config('install.force_https') && ! app()->environment('local'))) {
            URL::forceScheme('https');
        }
    }

    /**
     * Avant installation, les stores par défaut « database » (session ET cache) ne
     * peuvent pas fonctionner : ni la table `sessions` ni la table `cache` n'existent
     * encore. On bascule donc ces deux stores sur le pilote « file » le temps de
     * l'assistant — avant que StartSession ou le rate limiter (middleware `throttle`
     * des routes d'installation, qui s'appuie sur le cache) ne les résolvent.
     */
    protected function useFileStoresBeforeInstall(): void
    {
        if (app()->runningInConsole()) {
            return;
        }

        if (! $this->app->make(InstallState::class)->isInstalled()) {
            config([
                'session.driver' => 'file',
                'cache.default' => 'file',
            ]);
        }
    }

    /**
     * Register model observers.
     */
    protected function registerObservers(): void
    {
        User::observe(UserObserver::class);
        Student::observe(StudentObserver::class);
        School::observe(SchoolObserver::class);
        AcademicYear::observe(AcademicYearObserver::class);
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        // NB : ne jamais interroger la base ici. `boot()` s'exécute à chaque
        // commande artisan (y compris `package:discover` pendant un
        // `composer install`) : une requête ferait échouer l'installation sur un
        // clone neuf, avant même que la base existe.
        // La désactivation des FK SQLite nécessaire aux `dropColumn` est faite
        // au bon moment par Tests\TestCase::beforeRefreshingDatabase().

        Password::defaults(function (): ?Password {
            // Les tests utilisent des mots de passe simples : on garde le défaut souple.
            if (app()->runningUnitTests()) {
                return null;
            }

            $rule = Password::min(12)
                ->mixedCase()   // au moins une majuscule et une minuscule
                ->letters()
                ->numbers()
                ->symbols();

            // Vérification contre les fuites connues (HaveIBeenPwned) en production.
            return app()->isProduction() ? $rule->uncompromised() : $rule;
        });
    }
}
