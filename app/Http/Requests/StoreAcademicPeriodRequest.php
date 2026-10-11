<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAcademicPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create_academic_periods');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'type' => ['required', Rule::in(['trimestre', 'semestre'])],
            'order' => ['nullable', 'integer', 'min:1'],
            'weight' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'is_current' => ['nullable', 'boolean'],
            'academic_year_id' => ['required', 'uuid', 'exists:academic_years,id'],
            'class_type_id' => ['nullable', 'uuid', 'exists:classroom_types,id'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Le nom de la période est obligatoire.',
            'name.max' => 'Le nom ne peut pas dépasser 255 caractères.',
            'description.max' => 'La description ne peut pas dépasser 1000 caractères.',
            'start_date.required' => 'La date de début est obligatoire.',
            'start_date.date' => 'La date de début doit être une date valide.',
            'end_date.required' => 'La date de fin est obligatoire.',
            'end_date.date' => 'La date de fin doit être une date valide.',
            'end_date.after' => 'La date de fin doit être postérieure à la date de début.',
            'type.required' => 'Le type de période est obligatoire.',
            'type.in' => 'Le type doit être trimestre ou semestre.',
            'order.integer' => "L'ordre doit être un nombre entier.",
            'order.min' => "L'ordre doit être au moins 1.",
            'academic_year_id.required' => "L'année académique est obligatoire.",
            'academic_year_id.uuid' => "L'identifiant de l'année académique n'est pas valide.",
            'academic_year_id.exists' => "L'année académique sélectionnée n'existe pas.",
        ];
    }
}
