<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreCountryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create_countries');
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'unique:countries,name'],
            'code' => ['required', 'string', 'max:10', 'unique:countries,code'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Le nom du pays est requis.',
            'name.unique' => 'Ce pays existe déjà.',
            'code.required' => 'Le code du pays est requis.',
            'code.unique' => 'Ce code est déjà utilisé.',
        ];
    }
}
