import { Head } from '@inertiajs/react';
import { useMoney } from '@/helpers/money';
import Barcode from 'react-barcode';
import { OfficialHeader } from '@/components/documents/official-header';

type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CHEQUE';

interface School       { name: string; code: string; }
interface Student      { firstname: string; lastname: string; matricule?: string | null; }
interface Classroom    { name: string; code: string; }
interface AcademicYear { year: string; }

interface Enrollment {
    enrollment_code: string;
    school?: School | null;
    student?: Student | null;
    classroom?: Classroom | null;
    academic_year?: AcademicYear | null;
}

interface InvoiceItem  { label: string; type: 'FEE' | 'DISCOUNT'; amount: number; }

interface Invoice {
    invoice_number: string;
    subtotal: number;
    discount_amount: number;
    total: number;
    amount_paid: number;
    amount_remaining: number;
    enrollment: Enrollment;
    items: InvoiceItem[];
}

interface ReceiptRef { receipt_number: string; verification_code?: string | null; }

interface CreatedBy { firstname?: string | null; lastname?: string | null; email?: string | null; }

interface Payment {
    id: string;
    amount: number;
    payment_method: PaymentMethod;
    reference_number?: string | null;
    paid_by?: string | null;
    paid_at: string;
    created_at?: string | null;
    notes?: string | null;
    receipt?: ReceiptRef | null;
    invoice: Invoice;
    created_by?: CreatedBy | null;
}

interface Props {
    payment: Payment;
    amountInWords: string;
    verifyUrl: string;
    header?: string | null;
    headerCss?: string | null;
}

const methodLabel: Record<PaymentMethod, string> = {
    CASH: 'Espèces',
    MOBILE_MONEY: 'Mobile Money',
    BANK_TRANSFER: 'Virement bancaire',
    CHEQUE: 'Chèque',
};

/* ------------------------------------------------------------------ */
/* Un volet du reçu (établissement / payeur)                           */
/* ------------------------------------------------------------------ */

function ReceiptCopy({
    payment,
    amountInWords,
    verifyUrl,
    header,
    headerCss,
    copyLabel,
    pageBreak = false,
}: Readonly<Props & { copyLabel: string; pageBreak?: boolean }>) {
    const fmt = useMoney();
    const { invoice } = payment;
    const { enrollment } = invoice;

    const agentName = payment.created_by
        ? [payment.created_by.firstname, payment.created_by.lastname].filter(Boolean).join(' ') || payment.created_by.email
        : null;

    const paidAt   = new Date(payment.paid_at).toLocaleDateString('fr-FR');
    const issuedAt = payment.created_at
        ? new Date(payment.created_at).toLocaleString('fr-FR')
        : paidAt;

    return (
        <div className={`receipt-copy bg-white text-gray-900 border border-gray-300 rounded-lg p-8 print:border-0 print:rounded-none print:p-0 ${pageBreak ? 'page-break' : ''}`}>
            {/* En-tête officielle unifiée */}
            <OfficialHeader header={header} headerCss={headerCss} />

            {/* Titre + n° reçu + exemplaire */}
            <div className="flex items-start justify-between border-b-2 border-gray-900 pb-2 mb-4">
                <div>
                    <h1 className="text-lg font-bold uppercase tracking-wide">Reçu de paiement</h1>
                    <p className="text-xs text-gray-500 uppercase">{copyLabel}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase">N° de reçu</p>
                    <p className="text-base font-bold">{payment.receipt?.receipt_number ?? '—'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Date : {paidAt}</p>
                </div>
            </div>

            {/* Élève & inscription */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
                <div>
                    <p className="text-gray-400 text-[10px] uppercase">Élève</p>
                    <p className="font-semibold">
                        {enrollment.student ? `${enrollment.student.lastname} ${enrollment.student.firstname}` : '—'}
                    </p>
                    {enrollment.student?.matricule && (
                        <p className="text-gray-500 text-xs">Mat. {enrollment.student.matricule}</p>
                    )}
                </div>
                <div>
                    <p className="text-gray-400 text-[10px] uppercase">Classe · Année</p>
                    <p className="font-semibold">
                        {enrollment.classroom?.name ?? '—'} · {enrollment.academic_year?.year ?? '—'}
                    </p>
                </div>
                <div>
                    <p className="text-gray-400 text-[10px] uppercase">N° inscription</p>
                    <p className="font-semibold">{enrollment.enrollment_code}</p>
                </div>
                <div>
                    <p className="text-gray-400 text-[10px] uppercase">Facture</p>
                    <p className="font-semibold">{invoice.invoice_number}</p>
                </div>
            </div>

            {/* Détail facturé */}
            <table className="w-full text-sm border border-gray-200 mb-4">
                <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase">
                    <tr>
                        <th className="px-3 py-1.5 text-left font-semibold">Désignation</th>
                        <th className="px-3 py-1.5 text-right font-semibold">Montant</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {invoice.items.map((item, i) => (
                        <tr key={i}>
                            <td className="px-3 py-1.5 text-gray-700">{item.label}</td>
                            <td className={`px-3 py-1.5 text-right font-medium ${item.type === 'DISCOUNT' ? 'text-green-600' : 'text-gray-800'}`}>
                                {item.type === 'DISCOUNT' ? '- ' : ''}{fmt(item.amount)}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-gray-50 text-sm font-semibold border-t border-gray-200">
                    <tr>
                        <td className="px-3 py-1.5 text-gray-600">Total facture</td>
                        <td className="px-3 py-1.5 text-right">{fmt(invoice.total)}</td>
                    </tr>
                </tfoot>
            </table>

            {/* Montant encaissé + montant en lettres */}
            <div className="bg-green-50 border border-green-200 rounded-lg px-5 py-3 mb-4">
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-[10px] text-green-600 uppercase tracking-wider">Montant encaissé</p>
                        <p className="text-2xl font-extrabold text-green-700 leading-tight">{fmt(payment.amount)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-green-700 font-medium">{methodLabel[payment.payment_method]}</p>
                        {payment.reference_number && (
                            <p className="text-[10px] text-green-600">Réf : {payment.reference_number}</p>
                        )}
                    </div>
                </div>
                <p className="text-xs text-gray-600 italic mt-2 pt-2 border-t border-green-200">
                    Arrêté le présent reçu à la somme de : <span className="font-semibold not-italic text-gray-800">{amountInWords}</span>.
                </p>
            </div>

            {/* Solde */}
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="bg-gray-50 rounded-lg px-4 py-2 text-center">
                    <p className="text-[10px] text-gray-400 uppercase">Total payé</p>
                    <p className="font-bold text-gray-800">{fmt(invoice.amount_paid)}</p>
                </div>
                <div className={`rounded-lg px-4 py-2 text-center ${invoice.amount_remaining > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <p className="text-[10px] text-gray-400 uppercase">Reste à payer</p>
                    <p className={`font-bold ${invoice.amount_remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {fmt(invoice.amount_remaining)}
                    </p>
                </div>
            </div>

            {/* Signature & cachet */}
            <div className="grid grid-cols-2 gap-6 text-xs mb-4">
                <div>
                    <p className="text-gray-500 mb-1">Cachet de l'établissement</p>
                    <div className="h-16 border border-dashed border-gray-300 rounded" />
                </div>
                <div className="text-center">
                    <p className="text-gray-500 mb-1">La Comptabilité</p>
                    <div className="h-16 border-b border-gray-300" />
                    {agentName && <p className="text-gray-600 mt-1">{agentName}</p>}
                </div>
            </div>

            {/* Infos complémentaires */}
            <div className="text-[11px] text-gray-500 space-y-0.5 mb-3">
                {payment.paid_by && (
                    <div className="flex justify-between"><span>Payé par</span><span className="text-gray-700">{payment.paid_by}</span></div>
                )}
                <div className="flex justify-between"><span>Établi le</span><span className="text-gray-700">{issuedAt}</span></div>
            </div>

            {/* Code-barres anti-falsification + vérification */}
            {payment.receipt?.verification_code && (
                <div className="border-t border-dashed border-gray-200 pt-3 flex flex-col items-center">
                    <Barcode
                        value={payment.receipt.verification_code}
                        format="CODE128"
                        height={40}
                        width={1.3}
                        fontSize={11}
                        margin={0}
                    />
                    <p className="text-[9px] text-gray-400 mt-1 text-center">
                        Reçu authentifiable sur <span className="font-medium text-gray-500">{verifyUrl}</span> — code : {payment.receipt.verification_code}
                    </p>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Page : deux volets (établissement + payeur)                         */
/* ------------------------------------------------------------------ */

export default function PaymentReceipt(props: Readonly<Props>) {
    return (
        <>
            <Head title={`Reçu ${props.payment.receipt?.receipt_number ?? ''}`} />

            <div className="receipt-page min-h-screen bg-gray-100 print:bg-white p-6 print:p-0">
                <div className="mx-auto max-w-2xl">
                    <div className="print-toolbar flex justify-end mb-4 print:hidden">
                        <button
                            onClick={() => window.print()}
                            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                            Imprimer le reçu
                        </button>
                    </div>

                    <div className="space-y-6 print:space-y-0">
                        <ReceiptCopy {...props} copyLabel="Exemplaire établissement" pageBreak />
                        <ReceiptCopy {...props} copyLabel="Exemplaire payeur" />
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 14mm; }
                    html, body { background: #fff !important; }
                    .print-toolbar { display: none !important; }
                    .receipt-copy { break-inside: avoid; }
                    .page-break { break-after: page; }
                    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </>
    );
}
