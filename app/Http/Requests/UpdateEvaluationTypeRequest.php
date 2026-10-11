<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEvaluationTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('edit_evaluation_types');
    }

    public function rules(): array
    {
        $id = $this->route('evaluation_type')?->id;

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('evaluation_types', 'name')->ignore($id)],
            'category' => ['required', 'in:continu,composition'],
            'description' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Le nom est obligatoire.',
            'name.unique' => 'Ce type d\'évaluation existe déjà.',
            'name.max' => 'Le nom ne peut pas dépasser 255 caractères.',
        ];
    }
}
