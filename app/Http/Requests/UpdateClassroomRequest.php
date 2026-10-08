<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateClassroomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('edit_classes');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('classes', 'name')->ignore($this->route('classroom'))],
            'code' => ['required', 'string', 'max:50', Rule::unique('classes', 'code')->ignore($this->route('classroom'))],
            'capacity' => ['required', 'integer', 'min:1', 'max:200'],
            'expected_age' => ['nullable', 'integer', 'min:3', 'max:30'],
            'classroom_type_id' => ['nullable', 'uuid', 'exists:classroom_types,id'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Le nom de la classe est requis.',
            'name.unique' => 'Ce nom de classe existe déjà.',
            'code.required' => 'Le code de la classe est requis.',
            'code.unique' => 'Ce code de classe existe déjà.',
            'capacity.required' => 'La capacité est requise.',
            'capacity.integer' => 'La capacité doit être un nombre.',
            'capacity.min' => 'La capacité doit être au moins 1.',
            'capacity.max' => 'La capacité ne peut pas dépasser 200.',
            'classroom_type_id.uuid' => 'Le type de classe est invalide.',
            'classroom_type_id.exists' => 'Le type de classe sélectionné n\'existe pas.',
        ];
    }
}
