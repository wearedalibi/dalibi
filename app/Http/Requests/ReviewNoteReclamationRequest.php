<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReviewNoteReclamationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('review_note_reclamations');
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'in:approved,rejected'],
            'corrected_score' => ['nullable', 'numeric', 'min:0', 'max:9999'],
            'correction_note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v): void {
            if ($this->input('status') === 'approved' && $this->input('corrected_score') === null) {
                $v->errors()->add('corrected_score', 'La note corrigée est obligatoire pour approuver une réclamation.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'status.required' => 'La décision est obligatoire.',
            'status.in' => 'La décision doit être "approuvé" ou "rejeté".',
        ];
    }
}
