<?php

namespace App\Http\Requests;

use App\Constants\Currencies;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSchoolRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('edit_schools');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('schools', 'name')->ignore($this->school)],
            'code' => ['required', 'string', 'max:50', Rule::unique('schools', 'code')->ignore($this->school)],
            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'devise' => ['nullable', 'string', 'max:500'],
            'currency' => ['nullable', Rule::in(Currencies::codes())],
            'terme' => ['nullable', 'string', 'max:255'],
            'ministry' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
            'region' => ['nullable', 'string', 'max:150'],
            'city' => ['nullable', 'string', 'max:150'],
            'po_box' => ['nullable', 'string', 'max:120'],
            'active' => ['sometimes', 'boolean'],
            'portal_enabled' => ['sometimes', 'boolean'],
            'class_type_ids' => ['nullable', 'array'],
            'class_type_ids.*' => ['uuid', 'exists:classroom_types,id'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Le nom de l\'école est requis.',
            'name.unique' => 'Ce nom d\'école existe déjà.',
            'code.required' => 'Le code de l\'école est requis.',
            'code.unique' => 'Ce code d\'école existe déjà.',
            'logo.url' => 'Le logo doit être une URL valide (http ou https).',
            'email.email' => 'L\'email doit être une adresse valide.',
        ];
    }
}
