import { Head, router } from '@inertiajs/react';
import { useMoney } from '@/helpers/money';
import { ArrowLeft, Plus, Printer, Receipt, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { route } from '@/helpers/route';
import AppLayout from '@/layouts/app-layout';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type InvoiceStatus = 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CHEQUE';
type ItemType      = 'FEE' | 'DISCOUNT';

interface School      { name: string; code: string; }
interface Student     { firstname: string; lastname: string; matricule?: string | null; }
interface Classroom   { name: string; code: string; }
interface AcademicYear { year: string; }

interface Enrollment {
    id: string;
    enrollment_code: string;
    enrollment_date: string;
    status: string;
    school?: School | null;
    student?: Student | null;
    classroom?: Classroom | null;
    academic_year?: AcademicYear | null;
}

interface InvoiceItem {
    id: string;
    label: string;
    type: ItemType;
    amount: number;
}

interface ReceiptRef  { receipt_number: string; }

interface Payment {
    id: string;
    amount: number;
    payment_method: PaymentMethod;
    reference_number?: string | null;
    paid_by?: string | null;
    paid_at: string;
    notes?: string | null;
    receipt?: ReceiptRef | null;
}

interface Invoice {
    id: string;
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

interface CashAccount { id: string; name: string; type: 'CASH' | 'MOBILE_MONEY' | 'BANK'; }

interface InvoicePageProps {
    enrollment: Enrollment;
    invoice: Invoice;
    cashAccounts: CashAccount[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */


const statusConfig: Record<InvoiceStatus, { label: string; icon: React.ReactNode; badge: string }> = {
    ISSUED:          { label: 'Non payé',         icon: <Clock className="w-4 h-4" />,        badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    PARTIALLY_PAID:  { label: 'Partiellement payé', icon: <AlertCircle className="w-4 h-4" />, badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    PAID:            { label: 'Soldé',             icon: <CheckCircle2 className="w-4 h-4" />, badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    CANCELLED:       { label: 'Annulé',            icon: <XCircle className="w-4 h-4" />,      badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const methodLabel: Record<PaymentMethod, string> = {
    CASH:           'Espèces',
    MOBILE_MONEY:   'Mobile Money',
    BANK_TRANSFER:  'Virement',
    CHEQUE:         'Chèque',
};

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

const cashAccountTypeIcon: Record<string, string> = {
    CASH: '💵', MOBILE_MONEY: '📱', BANK: '🏦',
};

export default function InvoicePage({ enrollment, invoice, cashAccounts }: Readonly<InvoicePageProps>) {
    const fmt = useMoney();
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [form, setForm] = useState({
        amount:           invoice.amount_remaining > 0 ? String(invoice.amount_remaining) : '',
        payment_method:   'CASH' as PaymentMethod,
        cash_account_id:  cashAccounts[0]?.id ?? '',
        reference_number: '',
        paid_by:          '',
        paid_at:          new Date().toISOString().slice(0, 10),
        notes:            '',
    });

    const paidPct = invoice.total > 0 ? Math.min(100, Math.round((invoice.amount_paid / invoice.total) * 100)) : 100;
    const status  = statusConfig[invoice.status] ?? statusConfig.ISSUED;
    const isPaid  = invoice.status === 'PAID' || invoice.status === 'CANCELLED';

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        router.post(route('enrollments.payments.store', enrollment.id), form as never, {
            onError: (err) => { setErrors(err as Record<string, string>); setIsSubmitting(false); },
            onSuccess: () => { setIsSubmitting(false); setShowForm(false); },
        });
    };

    const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value }));

    return (
        <AppLayout>
            <Head title={`Facture ${invoice.invoice_number}`} />

            <div className="w-full space-y-6">

                {/* ── En-tête ── */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={() => router.get(route('enrollments.show', enrollment.id))}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Suivi financier
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {enrollment.student ? `${enrollment.student.firstname} ${enrollment.student.lastname}` : '—'}
                                {' · '}
                                {enrollment.classroom?.name ?? '—'}
                                {' · '}
                                {enrollment.academic_year?.year ?? '—'}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        className="gap-1.5 shrink-0"
                        onClick={() => window.open(route('enrollments.invoice.print', enrollment.id), '_blank')}
                    >
                        <Printer className="w-4 h-4" />
                        Imprimer la facture
                    </Button>
                </div>

                {/* ── Carte récap financier ── */}
                <div className="bg-white dark:bg-card rounded-xl shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Facture</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{invoice.invoice_number}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${status.badge}`}>
                            {status.icon}
                            {status.label}
                        </span>
                    </div>

                    {/* Barre de progression */}
                    <div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                            <span>{fmt(invoice.amount_paid)} payés</span>
                            <span>{paidPct}%</span>
                        </div>
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    invoice.status === 'PAID' ? 'bg-green-500' :
                                    invoice.status === 'PARTIALLY_PAID' ? 'bg-blue-500' : 'bg-gray-300'
                                }`}
                                style={{ width: `${paidPct}%` }}
                            />
                        </div>
                    </div>

                    {/* Chiffres */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div>
                            <p className="text-xs text-gray-400 dark:text-gray-500">Sous-total</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{fmt(invoice.subtotal)}</p>
                        </div>
                        {invoice.discount_amount > 0 && (
                            <div>
                                <p className="text-xs text-gray-400 dark:text-gray-500">Réduction</p>
                                <p className="font-semibold text-green-600 dark:text-green-400">- {fmt(invoice.discount_amount)}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-gray-400 dark:text-gray-500">Total dû</p>
                            <p className="font-bold text-gray-900 dark:text-white text-lg">{fmt(invoice.total)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 dark:text-gray-500">Reste à payer</p>
                            <p className={`font-bold text-lg ${invoice.amount_remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {fmt(invoice.amount_remaining)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* ── Lignes de facturation ── */}
                <div className="bg-white dark:bg-card rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="font-semibold text-gray-900 dark:text-white">Détail de la facture</h2>
                    </div>
                    <table className="w-full text-sm">
                        <tbody>
                            {invoice.items.map(item => (
                                <tr key={item.id} className="border-b border-gray-50 dark:border-gray-700 last:border-0">
                                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{item.label}</td>
                                    <td className={`px-6 py-3 text-right font-medium ${
                                        item.type === 'DISCOUNT'
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-gray-900 dark:text-white'
                                    }`}>
                                        {item.type === 'DISCOUNT' ? '- ' : ''}{fmt(item.amount)}
                                    </td>
                                </tr>
                            ))}
                            {invoice.items.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="px-6 py-6 text-center text-gray-400">
                                        Aucun frais configuré pour cette classe / année.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Historique des paiements ── */}
                <div className="bg-white dark:bg-card rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900 dark:text-white">
                            Paiements ({invoice.payments.length})
                        </h2>
                        {!isPaid && (
                            <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 gap-1.5"
                                onClick={() => setShowForm(v => !v)}
                            >
                                <Plus className="w-4 h-4" />
                                Nouveau paiement
                            </Button>
                        )}
                    </div>

                    {/* Formulaire ajout paiement */}
                    {showForm && (
                        <form onSubmit={handleSubmit} className="px-6 py-5 border-b border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 space-y-4">
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Enregistrer un paiement</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Montant (F) *</label>
                                    <Input
                                        type="number"
                                        min="1"
                                        step="any"
                                        value={form.amount}
                                        onChange={field('amount')}
                                        className={errors.amount ? 'border-red-500' : ''}
                                        placeholder={`Max : ${fmt(invoice.amount_remaining)}`}
                                    />
                                    {errors.amount && <p className="text-red-600 text-xs mt-1">{errors.amount}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Mode de paiement *</label>
                                    <select
                                        value={form.payment_method}
                                        onChange={field('payment_method')}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-card dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="CASH">Espèces</option>
                                        <option value="MOBILE_MONEY">Mobile Money</option>
                                        <option value="BANK_TRANSFER">Virement bancaire</option>
                                        <option value="CHEQUE">Chèque</option>
                                    </select>
                                    {errors.payment_method && <p className="text-red-600 text-xs mt-1">{errors.payment_method}</p>}
                                </div>

                                {cashAccounts.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Caisse de destination</label>
                                        <select
                                            value={form.cash_account_id}
                                            onChange={field('cash_account_id')}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-card dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">— Sans caisse —</option>
                                            {cashAccounts.map(ca => (
                                                <option key={ca.id} value={ca.id}>
                                                    {cashAccountTypeIcon[ca.type]} {ca.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.cash_account_id && <p className="text-red-600 text-xs mt-1">{errors.cash_account_id}</p>}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date de paiement *</label>
                                    <Input
                                        type="date"
                                        value={form.paid_at}
                                        onChange={field('paid_at')}
                                        className={errors.paid_at ? 'border-red-500' : ''}
                                    />
                                    {errors.paid_at && <p className="text-red-600 text-xs mt-1">{errors.paid_at}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Payé par</label>
                                    <Input
                                        value={form.paid_by}
                                        onChange={field('paid_by')}
                                        placeholder="Nom du payeur"
                                    />
                                </div>

                                {(form.payment_method === 'MOBILE_MONEY' || form.payment_method === 'BANK_TRANSFER' || form.payment_method === 'CHEQUE') && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Référence / N° transaction</label>
                                        <Input
                                            value={form.reference_number}
                                            onChange={field('reference_number')}
                                            placeholder="Ex: TXN-123456"
                                        />
                                    </div>
                                )}

                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optionnel)</label>
                                    <textarea
                                        value={form.notes}
                                        onChange={field('notes')}
                                        rows={2}
                                        placeholder="Remarques..."
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-card dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                                    {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
                                    Annuler
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Liste paiements */}
                    {invoice.payments.length === 0 ? (
                        <div className="px-6 py-10 text-center text-gray-400 dark:text-gray-500">
                            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p>Aucun paiement enregistré</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50 dark:divide-gray-700">
                            {invoice.payments.map((p, idx) => (
                                <div key={p.id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-xs font-bold">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">{fmt(p.amount)}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {methodLabel[p.payment_method]}
                                                {p.reference_number ? ` · ${p.reference_number}` : ''}
                                                {p.paid_by ? ` · ${p.paid_by}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(p.paid_at).toLocaleDateString('fr-FR')}
                                        </p>
                                        {p.receipt && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1.5 text-xs"
                                                onClick={() => window.open(route('payments.receipt', p.id), '_blank')}
                                            >
                                                <Printer className="w-3.5 h-3.5" />
                                                Reçu {p.receipt.receipt_number}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                </div>

            </div>
        </AppLayout>
    );
}
