<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CalendarEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // autorisation gérée par le middleware can: sur la route
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:2000'],
            'type' => ['required', 'in:holiday,exam,meeting,event,other'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'all_day' => ['boolean'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
            'color' => ['nullable', 'string', 'max:20'],
            'academic_year_id' => ['nullable', 'uuid', 'exists:academic_years,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Le titre est obligatoire.',
            'type.in' => "Type d'événement invalide.",
            'start_date.required' => 'La date de début est obligatoire.',
            'end_date.after_or_equal' => 'La date de fin doit être postérieure ou égale au début.',
        ];
    }
}
