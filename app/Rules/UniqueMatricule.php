<?php

namespace App\Rules;

use App\Models\User;
use App\Services\MatriculeService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class UniqueMatricule implements ValidationRule
{
    protected MatriculeService $matriculeService;

    protected ?int $ignoreId = null;

    public function __construct(?int $ignoreId = null)
    {
        $this->matriculeService = app(MatriculeService::class);
        $this->ignoreId = $ignoreId;
    }

    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        // Check format first
        if (! $this->matriculeService->isValidMatriculeFormat($value)) {
            $fail("Le matricule ':attribute' doit avoir le format correct.");

            return;
        }

        // Check uniqueness
        if ($this->matriculeService->matriculeExists($value)) {
            // If we're updating an existing record, check if it's the same ID
            if ($this->ignoreId === null || ! $this->isMatriculeOwner($value)) {
                $fail("Le matricule ':attribute' est déjà utilisé.");
            }
        }
    }

    /**
     * Check if the current user ID owns the matricule.
     */
    private function isMatriculeOwner(string $matricule): bool
    {
        $user = User::where('natricule', $matricule)->first();

        return $user && $user->id === $this->ignoreId;
    }
}
