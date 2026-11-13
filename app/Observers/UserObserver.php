<?php

namespace App\Observers;

use App\Events\MatriculeGenerated;
use App\Models\User;

class UserObserver
{
    /**
     * Handle the User "created" event.
     */
    public function created(User $user): void
    {
        // Dispatch event if matricule was generated
        if ($user->natricule) {
            MatriculeGenerated::dispatch(
                $user->natricule,
                'user',
                $user->id,
                $user->roles->first()->name ?? 'unknown'
            );
        }
    }

    /**
     * Handle the User "updated" event.
     */
    public function updated(User $user): void
    {
        // You can track updates if needed
    }

    /**
     * Handle the User "deleted" event.
     */
    public function deleted(User $user): void
    {
        // You can log deletion if needed
    }

    /**
     * Handle the User "restored" event.
     */
    public function restored(User $user): void
    {
        // You can log restore if needed
    }

    /**
     * Handle the User "force deleted" event.
     */
    public function forceDeleted(User $user): void
    {
        // You can log force delete if needed
    }
}
