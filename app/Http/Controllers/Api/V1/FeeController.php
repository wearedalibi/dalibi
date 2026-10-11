<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Models\AcademicYear;
use App\Models\Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeeController extends ApiController
{
    public function index(Request $request, string $student): JsonResponse
    {
        $studentModel = $this->resolveStudent($request, $student);
        $year = AcademicYear::where('active', true)->first(['id', 'year']);

        $invoices = Invoice::query()
            ->whereHas('enrollment', fn ($q) => $q->where('student_id', $studentModel->id)
                ->when($year, fn ($q) => $q->where('academic_year_id', $year->id)))
            ->orderByDesc('issued_at')
            ->get();

        return response()->json([
            'year' => $year?->year,
            'summary' => [
                'billed' => round((float) $invoices->sum('total'), 2),
                'paid' => round((float) $invoices->sum('amount_paid'), 2),
                'balance' => round((float) $invoices->sum('amount_remaining'), 2),
            ],
            'invoices' => $invoices->map(fn (Invoice $i) => [
                'id' => $i->id,
                'number' => $i->invoice_number ?? null,
                'total' => (float) $i->total,
                'paid' => (float) $i->amount_paid,
                'remaining' => (float) $i->amount_remaining,
                'due_date' => $i->due_date?->format('Y-m-d'),
                'status' => $i->amount_remaining <= 0 ? 'paid' : ($i->amount_paid > 0 ? 'partial' : 'unpaid'),
            ])->values(),
        ]);
    }
}
