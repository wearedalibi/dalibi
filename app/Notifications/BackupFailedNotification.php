<?php

namespace App\Notifications;

use App\Models\Backup;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Prévient les administrateurs qu'une sauvegarde a échoué.
 */
class BackupFailedNotification extends Notification
{
    use Queueable;

    public function __construct(public Backup $backup) {}

    /** @return array<int,string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->error()
            ->subject('Échec de sauvegarde — action requise')
            ->line('Une sauvegarde de la base de données a échoué.')
            ->line('Fichier : '.$this->backup->filename)
            ->line('Format : '.strtoupper((string) $this->backup->format))
            ->line('Erreur : '.($this->backup->error ?: 'inconnue'))
            ->line('Vérifiez la configuration du stockage et relancez une sauvegarde manuelle.');
    }
}
