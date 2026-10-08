<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $gender = $this->input('gender');

        if ($gender === 'M') {
            $this->merge(['gender' => 'male']);
        }

        if ($gender === 'F') {
            $this->merge(['gender' => 'female']);
        }

        if ($gender === 'O') {
            $this->merge(['gender' => 'other']);
        }
    }

    public function authorize(): bool
    {
        return $this->user()->can('edit_users');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'firstname' => ['required', 'string', 'min:2', 'max:255'],
            'lastname' => ['required', 'string', 'min:2', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->user)],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'gender' => ['required', Rule::in(['male', 'female', 'other'])],
            'birth_date' => ['nullable', 'date', 'before:today'],
            'telephone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
            'profile' => ['nullable', 'string', 'max:255'],
            'roles' => ['nullable', 'array'],
            'roles.*' => ['exists:roles,id'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'firstname.required' => 'Le prénom est requis.',
            'firstname.min' => 'Le prénom doit contenir au moins 2 caractères.',
            'lastname.required' => 'Le nom est requis.',
            'lastname.min' => 'Le nom doit contenir au moins 2 caractères.',
            'email.required' => 'L\'email est requis.',
            'email.email' => 'L\'email doit être une adresse email valide.',
            'email.unique' => 'Cet email est déjà utilisé.',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
            'gender.required' => 'Le genre est requis.',
            'gender.in' => 'Le genre doit être masculin, féminin ou autre.',
            'birth_date.date' => 'La date de naissance doit être une date valide.',
            'birth_date.before' => 'La date de naissance doit être antérieure à aujourd\'hui.',
            'roles.*.exists' => 'Le rôle sélectionné n\'existe pas.',
        ];
    }
}
