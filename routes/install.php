<?php

use App\Http\Controllers\Install\InstallController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes de l'assistant d'installation
|--------------------------------------------------------------------------
|
| Chargées dans le groupe « web » (session + Inertia). Le middleware
| « install.guard » (EnsureAppNotInstalled) bloque l'accès une fois
| l'application installée. Le throttle protège l'étape d'exécution.
|
*/

Route::middleware('install.guard')->prefix('install')->name('install.')->group(function () {
    Route::get('/', [InstallController::class, 'welcome'])->name('welcome');
    Route::post('language', [InstallController::class, 'storeLanguage'])->name('language.store');

    Route::get('school', [InstallController::class, 'school'])->name('school');
    Route::post('school', [InstallController::class, 'storeSchool'])->name('school.store');

    Route::get('admin', [InstallController::class, 'admin'])->name('admin');
    Route::post('admin', [InstallController::class, 'storeAdmin'])->name('admin.store');

    Route::get('security', [InstallController::class, 'security'])->name('security');
    Route::post('security', [InstallController::class, 'storeSecurity'])->name('security.store');

    Route::get('requirements', [InstallController::class, 'requirements'])->name('requirements');

    Route::get('run', [InstallController::class, 'run'])->middleware('throttle:10,1')->name('run');
});
