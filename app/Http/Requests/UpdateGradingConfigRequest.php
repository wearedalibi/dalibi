<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGradingConfigRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('edit_grading_configs');
    }

    public function rules(): array
    {
        return [
            'school_id' => ['required', 'uuid', 'exists:schools,id'],
            'classroom_type_id' => ['nullable', 'uuid', 'exists:classroom_types,id'],
            'name' => ['required', 'string', 'max:150'],
            'passing_score' => ['required', 'numeric', 'min:0', 'max:100'],
            'default_max_score' => ['required', 'numeric', 'min:1', 'max:100'],
            'class_weight' => ['required', 'numeric', 'min:0', 'max:10'],
            'comp_weight' => ['required', 'numeric', 'min:0', 'max:10'],
            'round_precision' => ['required', 'integer', 'in:0,1,2,3'],
            'mentions' => ['nullable', 'array'],
            'mentions.*.label' => ['required_with:mentions', 'string', 'max:60'],
            'mentions.*.min' => ['required_with:mentions', 'numeric', 'min:0', 'max:20'],
        ];
    }

    public function messages(): array
    {
        return [
            'school_id.required' => "L'établissement est obligatoire.",
            'school_id.exists' => "L'établissement sélectionné n'existe pas.",
            'classroom_type_id.exists' => "Le type de classe sélectionné n'existe pas.",
            'name.required' => 'Le nom est obligatoire.',
            'passing_score.required' => 'Le seuil de passage est obligatoire.',
            'default_max_score.required' => 'La note maximale est obligatoire.',
            'class_weight.required' => 'Le poids de la note de classe est obligatoire.',
            'comp_weight.required' => 'Le poids de la composition est obligatoire.',
            'round_precision.in' => 'La précision doit être 0, 1, 2 ou 3.',
        ];
    }
}
