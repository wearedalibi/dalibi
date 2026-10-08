<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Models\FeeStructure;
use App\Models\Installment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InstallmentController extends Controller
{
    /**
     * Save (replace) all installments for a given fee structure.
     */
    public function storeMultiple(Request $request, FeeStructure $feeStructure): RedirectResponse
    {
        abort_unless(
            $request->user()->can('edit_fee_structures'),
            403
        );

        $request->validate([
            'installments' => ['required', 'array', 'min:1'],
            'installments.*.name' => ['required', 'string', 'max:255'],
            'installments.*.installment_number' => ['required', 'integer', 'min:1'],
            'installments.*.amount' => ['required', 'numeric', 'min:0', 'max:99999999'],
            'installments.*.due_date' => ['nullable', 'date'],
            'installments.*.academic_period_id' => ['nullable', 'uuid', 'exists:academic_periods,id'],
        ]);

        // Le total des tranches ne doit jamais dépasser le montant de la structure
        $total = collect($request->installments)->sum(fn ($i) => (float) $i['amount']);
        if (round($total, 2) > round((float) $feeStructure->amount, 2)) {
            throw ValidationException::withMessages([
                'installments' => sprintf(
                    'Le total des tranches (%s) dépasse le montant de la structure (%s).',
                    number_format($total, 0, ',', ' '),
                    number_format((float) $feeStructure->amount, 0, ',', ' ')
                ),
            ]);
        }

        DB::transaction(function () use ($request, $feeStructure): void {
            $feeStructure->installments()->delete();

            foreach ($request->installments as $data) {
                Installment::create([
                    'fee_structure_id' => $feeStructure->id,
                    'name' => $data['name'],
                    'installment_number' => $data['installment_number'],
                    'amount' => $data['amount'],
                    'due_date' => $data['due_date'] ?? null,
                    'academic_period_id' => $data['academic_period_id'] ?? null,
                ]);
            }
        });

        return back()->with('success', 'Tranches mises à jour avec succès.');
    }
}
