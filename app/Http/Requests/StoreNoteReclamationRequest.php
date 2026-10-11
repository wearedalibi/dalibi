<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreNoteReclamationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create_note_reclamations');
    }

    public function rules(): array
    {
        return [
            'evaluation_id' => ['required', 'uuid', 'exists:evaluations,id'],
            'student_id' => ['required', 'uuid', 'exists:students,id'],
            'reason' => ['required', 'string', 'max:1000'],
            'original_score' => ['nullable', 'numeric', 'min:0', 'max:9999'],
            'requested_score' => ['nullable', 'numeric', 'min:0', 'max:9999'],
        ];
    }

    public function messages(): array
    {
        return [
            'evaluation_id.required' => "L'évaluation est obligatoire.",
            'evaluation_id.exists' => "L'évaluation sélectionnée n'existe pas.",
            'student_id.required' => "L'élève est obligatoire.",
            'student_id.exists' => "L'élève sélectionné n'existe pas.",
            'reason.required' => 'La raison de la réclamation est obligatoire.',
            'reason.max' => 'La raison ne peut pas dépasser 1000 caractères.',
        ];
    }
}
