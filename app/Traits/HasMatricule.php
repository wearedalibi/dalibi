<?php

namespace App\Traits;

use App\Services\MatriculeService;

/**
 * Trait pour générer automatiquement les matricules
 */
trait HasMatricule
{
    /**
     * Boot the trait
     */
    public static function bootHasMatricule()
    {
        // Générer le matricule avant la création si absent
        static::creating(function ($model) {
            if (empty($model->natricule) && method_exists($model, 'generateMatricule')) {
                $model->natricule = $model->generateMatricule();
            }
        });
    }

    /**
     * Obtenir le service de matricule
     */
    protected function getMatriculeService(): MatriculeService
    {
        return app(MatriculeService::class);
    }
}
