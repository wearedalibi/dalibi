<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MatriculeGenerated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public string $matricule,
        public string $type, // 'user' or 'student'
        public string $modelId,
        public string $role, // For users: the role name
        public ?string $registrationNumber = null, // For students
    ) {}

    /**
     * Get the event's dispatch name.
     */
    public function broadcastAs(): string
    {
        return 'matricule.generated';
    }
}
