import { Head } from '@inertiajs/react';
import { useMoney } from '@/helpers/money';
import { OfficialHeader } from '@/components/documents/official-header';

type InvoiceStatus = 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CHEQUE';

interface School       { name: string; code: string; }
interface Student      { firstname: string; lastname: string; matricule?: string | null; }
interface Classroom    { name: string; code: string; }
interface AcademicYear { year: string; }

interface Enrollment {
    enrollment_code: string;
    enrollment_date: string;
    school?: School | null;
    student?: Student | null;
    classroom?: Classroom | null;
    academic_year?: AcademicYear | null;
}

interface InvoiceItem { id: string; label: string; type: 'FEE' | 'DISCOUNT'; amount: number; }

interface Payment {
    id: string;
    amount: number;
    payment_method: PaymentMethod;
    reference_number?: string | null;
    paid_at: string;
}

interface Invoice {
    invoice_number: string;
    subtotal: number;
    discount_amount: number;
    total: number;
    amount_paid: number;
    amount_remaining: number;
    status: InvoiceStatus;
    issued_at?: string | null;
    items: InvoiceItem[];
    payments: Payment[];
}

interface Props {
    enrollment: Enrollment;
    invoice: Invoice;
    totalInWords: string;
    header?: string | null;
    headerCss?: string | null;
}

const statusLabel: Record<InvoiceStatus, string> = {
    ISSUED:         'Non payée',
    PARTIALLY_PAID: 'Partiellement payée',
    PAID:           'Soldée',
    CANCELLED:      'Annulée',
};

const methodLabel: Record<PaymentMethod, string> = {
    CASH:          'Espèces',
    MOBILE_MONEY:  'Mobile Money',
    BANK_TRANSFER: 'Virement',
    CHEQUE:        'Chèque',
};

export default function InvoicePrint({ enrollment, invoice, totalInWords, header, headerCss }: Readonly<Props>) {
    const fmt = useMoney();

    const issuedAt = invoice.issued_at
        ? new Date(invoice.issued_at).toLocaleDateString('fr-FR')
        : new Date(enrollment.enrollment_date).toLocaleDateString('fr-FR');

    return (
        <>
            <Head title={`Facture ${invoice.invoice_number}`} />

            <div className="invoice-page min-h-screen bg-gray-100 print:bg-white p-6 print:p-0">
                <div className="mx-auto max-w-3xl">
                    <div className="print-toolbar flex justify-end mb-4 print:hidden">
                        <button
                            onClick={() => window.print()}
                            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                            Imprimer la facture
                        </button>
                    </div>

                    <div className="invoice-sheet bg-white text-gray-900 border border-gray-300 rounded-lg p-10 print:border-0 print:rounded-none print:p-0">
                        {/* En-tête officielle unifiée */}
                        <OfficialHeader header={header} headerCss={headerCss} />

                        {/* Titre + n° + date */}
                        <div className="flex items-start justify-between border-b-2 border-gray-900 pb-3 mb-6">
                            <h1 className="text-xl font-bold uppercase tracking-wide">Facture</h1>
                            <div className="text-right text-sm">
                                <p><span className="text-gray-500">N° </span><span className="font-bold">{invoice.invoice_number}</span></p>
                                <p className="text-gray-500">Émise le {issuedAt}</p>
                            </div>
                        </div>

                        {/* Destinataire */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6">
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
                                <p className="text-gray-500 text-xs">Inscription {enrollment.enrollment_code}</p>
                            </div>
                        </div>

                        {/* Détail */}
                        <table className="w-full text-sm border border-gray-200 mb-2">
                            <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase">
                                <tr>
                                    <th className="px-4 py-2 text-left font-semibold">Désignation</th>
                                    <th className="px-4 py-2 text-right font-semibold">Montant</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {invoice.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-2 text-gray-700">{item.label}</td>
                                        <td className={`px-4 py-2 text-right font-medium ${item.type === 'DISCOUNT' ? 'text-green-600' : 'text-gray-800'}`}>
                                            {item.type === 'DISCOUNT' ? '- ' : ''}{fmt(item.amount)}
                                        </td>
                                    </tr>
                                ))}
                                {invoice.items.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="px-4 py-4 text-center text-gray-400">Aucun frais configuré.</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="text-sm border-t border-gray-200">
                                <tr>
                                    <td className="px-4 py-1.5 text-right text-gray-500">Sous-total</td>
                                    <td className="px-4 py-1.5 text-right">{fmt(invoice.subtotal)}</td>
                                </tr>
                                {invoice.discount_amount > 0 && (
                                    <tr>
                                        <td className="px-4 py-1.5 text-right text-gray-500">Réduction</td>
                                        <td className="px-4 py-1.5 text-right text-green-600">- {fmt(invoice.discount_amount)}</td>
                                    </tr>
                                )}
                                <tr className="bg-gray-50 font-bold">
                                    <td className="px-4 py-2 text-right">Total à payer</td>
                                    <td className="px-4 py-2 text-right text-base">{fmt(invoice.total)}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <p className="text-xs text-gray-600 italic mb-6">
                            Arrêtée la présente facture à la somme de : <span className="font-semibold not-italic text-gray-800">{totalInWords}</span>.
                        </p>

                        {/* État de règlement */}
                        <div className="grid grid-cols-3 gap-3 text-sm mb-6">
                            <div className="bg-gray-50 rounded-lg px-4 py-2 text-center">
                                <p className="text-[10px] text-gray-400 uppercase">Statut</p>
                                <p className="font-bold text-gray-800">{statusLabel[invoice.status]}</p>
                            </div>
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

                        {/* Récapitulatif des paiements */}
                        {invoice.payments.length > 0 && (
                            <div className="mb-6">
                                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Paiements reçus</p>
                                <table className="w-full text-xs border border-gray-200">
                                    <thead className="bg-gray-50 text-gray-500 uppercase text-[10px]">
                                        <tr>
                                            <th className="px-3 py-1.5 text-left font-semibold">Date</th>
                                            <th className="px-3 py-1.5 text-left font-semibold">Mode</th>
                                            <th className="px-3 py-1.5 text-left font-semibold">Référence</th>
                                            <th className="px-3 py-1.5 text-right font-semibold">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {invoice.payments.map((p) => (
                                            <tr key={p.id}>
                                                <td className="px-3 py-1.5 text-gray-700">{new Date(p.paid_at).toLocaleDateString('fr-FR')}</td>
                                                <td className="px-3 py-1.5 text-gray-700">{methodLabel[p.payment_method]}</td>
                                                <td className="px-3 py-1.5 text-gray-500">{p.reference_number ?? '—'}</td>
                                                <td className="px-3 py-1.5 text-right font-medium text-gray-800">{fmt(p.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Signature & cachet */}
                        <div className="grid grid-cols-2 gap-8 text-xs mt-8">
                            <div>
                                <p className="text-gray-500 mb-1">Cachet de l'établissement</p>
                                <div className="h-20 border border-dashed border-gray-300 rounded" />
                            </div>
                            <div className="text-center">
                                <p className="text-gray-500 mb-1">La Comptabilité</p>
                                <div className="h-20 border-b border-gray-300" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 14mm; }
                    html, body { background: #fff !important; }
                    .print-toolbar { display: none !important; }
                    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </>
    );
}
