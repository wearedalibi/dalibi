<?php

namespace App\Http\Controllers\Comptabilite;
use App\Http\Controllers\Controller;

use App\Constants\Currencies;
use App\Constants\Roles;
use App\Http\Requests\StorePaymentRequest;
use App\Models\CashAccount;
use App\Models\Enrollment;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\School;
use App\Services\DocumentRenderer;
use App\Services\InvoiceService;
use App\Support\FrenchNumberSpeller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceController extends Controller
{
    public function __construct(
        private readonly InvoiceService $invoiceService,
        private readonly DocumentRenderer $documents,
    ) {}

    /**
     * En-tête officielle (logo + ministère + établissement + République + devise),
     * identique à celle des bulletins, pour un rendu unifié des documents financiers.
     *
     * @return array{header: string, headerCss: string}
     */
    private function officialHeader(?School $school): array
    {
        return [
            'header' => $school
                ? $this->documents->headerHtml($school, $this->documents->resolveVariables($school))
                : '',
            'headerCss' => $this->documents->headerCss(),
        ];
    }

    /**
     * Page principale : facture + historique des paiements + formulaire ajout paiement.
     */
    public function show(Enrollment $enrollment): Response
    {
        $enrollment->load(['school', 'student', 'classroom', 'academicYear', 'enrolledBy']);

        $invoice = $enrollment->invoice()->with([
            'items',
            'payments.receipt',
            'payments.createdBy',
        ])->first();

        // Créer la facture automatiquement si elle n'existe pas encore
        if (! $invoice) {
            $invoice = $this->invoiceService->createFromEnrollment($enrollment);
            $invoice->load(['items', 'payments.receipt', 'payments.createdBy']);
        }

        return Inertia::render('Eleves/Enrollments/Invoice', [
            'enrollment'   => $enrollment,
            'invoice'      => $invoice,
            'cashAccounts' => CashAccount::where('active', true)->orderBy('type')->orderBy('name')->get(['id', 'name', 'type']),
        ]);
    }

    /**
     * Enregistre un paiement pour l'inscription.
     */
    public function storePayment(StorePaymentRequest $request, Enrollment $enrollment): RedirectResponse
    {
        $invoice = $enrollment->invoice;

        if (! $invoice) {
            return back()->withErrors(['invoice' => 'Aucune facture trouvée pour cette inscription.']);
        }

        $data = $request->validated();
        $data['created_by'] = auth()->id();

        // Garde anti trop-perçu, évaluée SOUS VERROU : sans cela, deux requêtes
        // concurrentes (double-clic, deux caissiers) liraient le même reste dû et
        // passeraient toutes les deux — le trop-perçu étant ensuite masqué par le
        // `max(0, …)` de `recalculate()`.
        DB::transaction(function () use ($data, $invoice): void {
            $locked = Invoice::whereKey($invoice->id)->lockForUpdate()->firstOrFail();

            $remaining = (float) $locked->amount_remaining;
            if ((float) $data['amount'] > $remaining + 0.001) {
                throw ValidationException::withMessages([
                    'amount' => 'Le montant dépasse le reste à payer (' . number_format($remaining, 0, ',', ' ') . ' F).',
                ]);
            }

            $this->invoiceService->recordPayment($locked, $data);
        });

        return redirect()->route('enrollments.invoice', $enrollment->id)
            ->with('success', 'Paiement enregistré avec succès.');
    }

    /**
     * Facture imprimable (document officiel) : en-tête unifiée, détail des lignes,
     * total en toutes lettres, récapitulatif des paiements et zone de signature.
     */
    public function printInvoice(Enrollment $enrollment): Response
    {
        $enrollment->load(['school', 'student', 'classroom', 'academicYear', 'enrolledBy']);

        $invoice = $enrollment->invoice()->with(['items', 'payments' => fn ($q) => $q->orderBy('paid_at')])->first();

        if (! $invoice) {
            $invoice = $this->invoiceService->createFromEnrollment($enrollment);
            $invoice->load(['items', 'payments']);
        }

        $school = $enrollment->school;

        return Inertia::render('Eleves/Enrollments/InvoicePrint', [
            'enrollment'   => $enrollment,
            'invoice'      => $invoice,
            'totalInWords' => FrenchNumberSpeller::money(
                (float) $invoice->total,
                $school?->currency ?: Currencies::DEFAULT,
            ),
            ...$this->officialHeader($school),
        ]);
    }

    /**
     * Page d'impression du reçu d'un paiement.
     */
    public function receipt(Payment $payment): Response
    {
        $payment->load([
            'receipt',
            'invoice.enrollment.school',
            'invoice.enrollment.student',
            'invoice.enrollment.classroom',
            'invoice.enrollment.academicYear',
            'invoice.items',
            'createdBy',
        ]);

        $school = $payment->invoice?->enrollment?->school;

        return Inertia::render('Comptabilite/Payments/Receipt', [
            'payment'        => $payment,
            'amountInWords'  => FrenchNumberSpeller::money(
                (float) $payment->amount,
                $school?->currency ?: Currencies::DEFAULT,
            ),
            'verifyUrl'      => route('receipts.verify'),
            ...$this->officialHeader($school),
        ]);
    }

    /**
     * Vérifie l'authenticité d'un reçu via son code unique (code-barres).
     */
    public function verifyReceipt(Request $request): Response
    {
        abort_unless(
            $request->user()->can('view_invoices'),
            403
        );

        $code = trim($request->string('code')->toString());
        $result = null;

        if ($code !== '') {
            $receipt = \App\Models\Receipt::with([
                'payment.invoice.enrollment.student:id,firstname,lastname,matricule',
                'payment.invoice.enrollment.classroom:id,name',
                'payment.invoice.enrollment.academicYear:id,year',
            ])->where('verification_code', $code)->first();

            $result = $receipt && $receipt->payment ? [
                'valid'          => true,
                'receipt_number' => $receipt->receipt_number,
                'amount'         => (float) $receipt->payment->amount,
                'paid_at'        => $receipt->payment->paid_at?->format('d/m/Y'),
                'student'        => $receipt->payment->invoice?->enrollment?->student
                    ? $receipt->payment->invoice->enrollment->student->lastname . ' ' . $receipt->payment->invoice->enrollment->student->firstname
                    : null,
                'matricule'      => $receipt->payment->invoice?->enrollment?->student?->matricule,
                'class_name'     => $receipt->payment->invoice?->enrollment?->classroom?->name,
                'year'           => $receipt->payment->invoice?->enrollment?->academicYear?->year,
            ] : ['valid' => false];
        }

        return Inertia::render('Comptabilite/Payments/Verify', [
            'code'   => $code,
            'result' => $result,
        ]);
    }
}
