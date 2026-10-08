<?php

namespace App\Mail;

use App\Models\Guardian;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class GuardianInvitation extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Guardian $guardian,
        public string $url,
        public bool $isReset = false,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->isReset
                ? 'Réinitialisation de votre mot de passe — Portail'
                : 'Activez votre accès au portail',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.guardian-invitation');
    }
}
