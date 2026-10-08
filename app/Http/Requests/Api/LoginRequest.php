<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'login' => ['required', 'string', 'max:150'], // e-mail (tuteur) ou e-mail/matricule (élève)
            'password' => ['required', 'string'],
        ];
    }
}
