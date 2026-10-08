<?php

namespace App\Http\Requests;

use App\Models\SubjectAssignment;
use Illuminate\Foundation\Http\FormRequest;

class StoreSubjectAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create_subject_assignments');
    }

    public function rules(): array
    {
        return [
            'subject_id' => ['required', 'uuid', 'exists:subjects,id'],
            'teacher_id' => ['required', 'uuid', 'exists:users,id'],
            'academic_year_id' => ['required', 'uuid', 'exists:academic_years,id'],
            'class_id' => ['required', 'uuid', 'exists:classes,id'],
            'active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $exists = SubjectAssignment::where('subject_id', $this->input('subject_id'))
                ->where('teacher_id', $this->input('teacher_id'))
                ->where('academic_year_id', $this->input('academic_year_id'))
                ->where('class_id', $this->input('class_id'))
                ->exists();

            if ($exists) {
                $validator->errors()->add(
                    'subject_id',
                    'Cette affectation existe déjà pour cette classe et cette année académique.'
                );
            }
        });
    }

    public function messages(): array
    {
        return [
            'subject_id.required' => 'La matière est obligatoire.',
            'subject_id.exists' => "La matière sélectionnée n'existe pas.",
            'teacher_id.required' => "L'enseignant est obligatoire.",
            'teacher_id.exists' => "L'enseignant sélectionné n'existe pas.",
            'academic_year_id.required' => "L'année académique est obligatoire.",
            'academic_year_id.exists' => "L'année académique sélectionnée n'existe pas.",
            'class_id.required' => 'La classe est obligatoire.',
            'class_id.exists' => "La classe sélectionnée n'existe pas.",
            'notes.max' => 'Les notes ne peuvent pas dépasser 500 caractères.',
        ];
    }
}
