<?php

namespace App\Concerns;

use App\Models\Guardian;
use App\Models\Student;
use Illuminate\Support\Str;

/**
 * Jeton d'invitation / réinitialisation de mot de passe (haché, expirant).
 * Partagé par les comptes du portail ({@see Guardian}, {@see Student}).
 *
 * Nécessite les colonnes : reset_token (string nullable), reset_expires_at (timestamp nullable).
 */
trait HasResetToken
{
    public function issueResetToken(int $days = 7): string
    {
        $raw = Str::random(48);

        $this->forceFill([
            'reset_token' => hash('sha256', $raw),
            'reset_expires_at' => now()->addDays($days),
        ])->save();

        return $raw;
    }

    public function isResetTokenValid(string $raw): bool
    {
        return $this->reset_token !== null
            && $this->reset_expires_at?->isFuture()
            && hash_equals($this->reset_token, hash('sha256', $raw));
    }

    public function clearResetToken(): void
    {
        $this->forceFill(['reset_token' => null, 'reset_expires_at' => null])->save();
    }
}
