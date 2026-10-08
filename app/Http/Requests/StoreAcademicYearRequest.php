<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreAcademicYearRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create_academic_years');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'year' => ['required', 'string', 'max:9', 'regex:/^\d{4}-\d{4}$/', 'unique:academic_years,year'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'year.required' => 'L\'année académique est requise.',
            'year.max' => 'L\'année ne peut pas dépasser 9 caractères.',
            'year.regex' => 'L\'année doit être au format YYYY-YYYY (ex: 2024-2025).',
            'year.unique' => 'Cette année académique existe déjà.',
            'start_date.required' => 'La date de début est requise.',
            'start_date.date' => 'La date de début doit être une date valide.',
            'end_date.required' => 'La date de fin est requise.',
            'end_date.date' => 'La date de fin doit être une date valide.',
            'end_date.after' => 'La date de fin doit être après la date de début.',
        ];
    }
}
