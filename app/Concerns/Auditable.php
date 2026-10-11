<?php

namespace App\Concerns;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

/**
 * Enregistre automatiquement les créations / modifications / suppressions
 * d'un modèle dans le journal d'audit ({@see AuditLog}).
 *
 * Personnalisable via la propriété $auditExclude (champs à ignorer)
 * et la méthode auditLabel() (libellé lisible de l'entité).
 */
trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(fn (Model $model) => $model->recordAudit('created', null, $model->auditableAttributes()));

        static::updated(function (Model $model): void {
            $changed = array_keys($model->getChanges());
            $keys = array_diff($changed, $model->auditExcluded());
            if ($keys === []) {
                return; // aucune modification significative
            }

            $new = array_intersect_key($model->getChanges(), array_flip($keys));
            $old = array_intersect_key($model->getRawOriginal(), array_flip($keys));

            $model->recordAudit('updated', $old, $new);
        });

        static::deleted(fn (Model $model) => $model->recordAudit('deleted', $model->auditableAttributes(), null));
    }

    /** Champs exclus du journal (secrets et bruit). */
    public function auditExcluded(): array
    {
        return array_merge(
            ['id', 'password', 'remember_token', 'created_at', 'updated_at', 'two_factor_secret', 'two_factor_recovery_codes'],
            property_exists($this, 'auditExclude') ? $this->auditExclude : [],
        );
    }

    /** Attributs audités (hors champs exclus). */
    public function auditableAttributes(): array
    {
        return array_diff_key($this->getAttributes(), array_flip($this->auditExcluded()));
    }

    /** Libellé lisible de l'entité pour le journal. */
    public function auditLabel(): ?string
    {
        $full = trim(($this->firstname ?? '').' '.($this->lastname ?? ''));
        if ($full !== '') {
            return $full;
        }

        foreach (['name', 'title', 'reference', 'matricule', 'code'] as $field) {
            if (! empty($this->{$field})) {
                return (string) $this->{$field};
            }
        }

        return null;
    }

    public function recordAudit(string $event, ?array $old, ?array $new): void
    {
        $request = app()->runningInConsole() ? null : request();

        AuditLog::create([
            'user_id' => auth()->id(),
            'event' => $event,
            'auditable_type' => $this->getMorphClass(),
            'auditable_id' => $this->getKey(),
            'label' => $this->auditLabel(),
            'old_values' => $old,
            'new_values' => $new,
            'url' => $request?->fullUrl(),
            'ip_address' => $request?->ip(),
            'user_agent' => $request ? substr((string) $request->userAgent(), 0, 255) : null,
        ]);
    }
}
