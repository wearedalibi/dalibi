<?php

use App\Models\BackupSetting;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
| Planification des sauvegardes — pilotée par les réglages (Paramètres → Sauvegardes).
| Lecture protégée : si la table n'existe pas encore (migrations), on ignore.
*/
try {
    $frequency = BackupSetting::get('frequency', 'none');

    if ($frequency !== 'none') {
        $time = BackupSetting::get('time', '02:00');
        $event = Schedule::command('backup:run --scheduled');

        if ($frequency === 'weekly') {
            $event->weeklyOn((int) BackupSetting::get('day_of_week', 1), $time);
        } else {
            $event->dailyAt($time);
        }

        $event->withoutOverlapping();
    }
} catch (Throwable) {
    // Table backup_settings absente (avant migrations) : aucune planification.
}
