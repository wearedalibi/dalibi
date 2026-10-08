<?php

namespace App\Rules;

use App\Services\MatriculeService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidMatriculeFormat implements ValidationRule
{
    protected MatriculeService $matriculeService;

    public function __construct()
    {
        $this->matriculeService = app(MatriculeService::class);
    }

    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $this->matriculeService->isValidMatriculeFormat($value)) {
            $fail("Le matricule ':attribute' doit avoir le format correct (ex: ADM26001, PROF26001).");
        }
    }
}
