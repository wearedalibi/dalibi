<?php

namespace App\Http\Requests;

use App\Models\AcademicYear;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFeeStructureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create_fee_structures');
    }

    /**
     * La structure de frais est toujours rattachée à l'année académique active :
     * on impose la valeur côté serveur, quoi qu'envoie le client.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'academic_year_id' => AcademicYear::where('active', true)->value('id'),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'academic_year_id' => [
                'required',
                'uuid',
                'exists:academic_years,id',
                Rule::unique('fee_structures', 'academic_year_id')->where(
                    fn ($q) => $q
                        ->where('fee_category_id', $this->fee_category_id)
                        ->where('class_id', $this->class_id)
                ),
            ],
            'fee_category_id' => ['required', 'uuid', 'exists:fee_categories,id'],
            'class_id' => ['required', 'uuid', 'exists:classes,id'],
            'amount' => ['required', 'numeric', 'min:0', 'max:10000000'],
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
            'academic_year_id.required' => 'L\'année académique est requise.',
            'academic_year_id.uuid' => 'L\'année académique doit être un UUID valide.',
            'academic_year_id.exists' => 'L\'année académique sélectionnée n\'existe pas.',
            'academic_year_id.unique' => 'Une structure de frais existe déjà pour cette combinaison année / catégorie / classe.',
            'fee_category_id.required' => 'La catégorie de frais est requise.',
            'fee_category_id.uuid' => 'La catégorie de frais doit être un UUID valide.',
            'fee_category_id.exists' => 'La catégorie de frais sélectionnée n\'existe pas.',
            'class_id.required' => 'La classe est requise.',
            'class_id.uuid' => 'La classe doit être un UUID valide.',
            'class_id.exists' => 'La classe sélectionnée n\'existe pas.',
            'amount.required' => 'Le montant est requis.',
            'amount.numeric' => 'Le montant doit être un nombre.',
            'amount.min' => 'Le montant doit être supérieur ou égal à 0.',
            'amount.max' => 'Le montant ne peut pas dépasser 10 000 000.',
        ];
    }
}
