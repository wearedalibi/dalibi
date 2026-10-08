<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create_invoices');
    }

    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'min:1', 'max:99999999'],
            'payment_method' => ['required', Rule::in(['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CHEQUE'])],
            'cash_account_id' => [
                'required_if:payment_method,CASH',
                'required_if:payment_method,MOBILE_MONEY',
                'required_if:payment_method,BANK_TRANSFER',
                'nullable',
                'uuid',
                'exists:cash_accounts,id',
            ],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'paid_by' => ['nullable', 'string', 'max:150'],
            'paid_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $invoice = $this->route('invoice');
            if (
                $invoice &&
                $this->filled('amount') &&
                (float) $this->input('amount') > (float) $invoice->amount_remaining
            ) {
                $validator->errors()->add(
                    'amount',
                    'Le montant saisi dépasse le solde restant dû ('.
                    number_format((float) $invoice->amount_remaining, 0, ',', ' ').' F).'
                );
            }
        });
    }

    public function messages(): array
    {
        return [
            'amount.required' => 'Le montant est obligatoire.',
            'amount.min' => 'Le montant doit être supérieur à 0.',
            'amount.max' => 'Le montant est trop élevé.',
            'payment_method.required' => 'Le mode de paiement est obligatoire.',
            'cash_account_id.required_if' => 'La caisse est obligatoire pour ce mode de paiement.',
            'paid_at.required' => 'La date de paiement est obligatoire.',
        ];
    }
}
