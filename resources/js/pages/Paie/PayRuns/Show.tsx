import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft, Receipt, FileDown, Pencil, Plus, Trash2, CheckCircle2,
    Banknote, XCircle, AlertTriangle, TrendingUp, TrendingDown, Wallet,
    Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useMoney } from '@/helpers/money';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

type LineType = 'earning' | 'deduction';
interface Line { code?: string | null; label: string; type: LineType; amount: number; }
interface Payslip {
    id: string;
    reference: string;
    gross: number;
    total_deductions: number;
    net: number;
    payload: { employee?: { name?: string }; lines?: Line[] };
    employee_profile?: { id: string; user?: { firstname: string; lastname: string } | null } | null;
}
interface CashAccount { id: string; name: string; type: string; balance: number; }
interface PayRun {
    id: string;
    reference: string;
    period_month: number;
    period_year: number;
    label: string | null;
    status: string;
    total_gross: number;
    total_deductions: number;
    total_net: number;
    cash_account?: { id: string; name: string; type: string } | null;
}
interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
}
interface Props {
    payRun: PayRun;
    payslips: Paginated<Payslip>;
    cashAccounts: CashAccount[];
    canDelete: boolean;
    filters: { search?: string };
}

const STATUS_CLS: Record<string, string> = {
    draft:     'bg-gray-100 text-gray-600',
    validated: 'bg-blue-100 text-blue-700',
    paid:      'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
};

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-500">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
    );
}

export default function Show({ payRun, payslips, cashAccounts, canDelete, filters }: Readonly<Props>) {
    const fmt = useMoney();
    const { t } = useTranslation();
    const MONTHS = ['', ...Array.from({ length: 12 }, (_, i) => t('paie.months.' + (i + 1)))];
    const period = `${MONTHS[payRun.period_month]} ${payRun.period_year}`;
    const badgeCls = STATUS_CLS[payRun.status] ?? STATUS_CLS.draft;
    const isDraft = payRun.status === 'draft';
    const isValidated = payRun.status === 'validated';
    const isPaid = payRun.status === 'paid';

    const [editing, setEditing] = useState<Payslip | null>(null);
    const [lines, setLines] = useState<Line[]>([]);
    const [payOpen, setPayOpen] = useState(false);
    const [cashId, setCashId] = useState(cashAccounts[0]?.id ?? '');
    const [confirm, setConfirm] = useState<null | 'validate' | 'cancel'>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [search, setSearch] = useState(filters.search ?? '');

    const applySearch = () => router.get(route('pay-runs.show', payRun.id), { search: search || undefined }, { preserveState: true, replace: true });
    const goToPage = (page: number) => router.get(route('pay-runs.show', payRun.id), { search: search || undefined, page: String(page) }, { preserveState: true, replace: true });

    const openEditor = (p: Payslip) => {
        setLines((p.payload.lines ?? []).map(l => ({ ...l, amount: Number(l.amount) })));
        setEditing(p);
    };

    const saveLines = () => {
        if (!editing) return;
        router.put(route('payslips.update', editing.id), { lines: lines.map(l => ({ ...l, amount: Number(l.amount) || 0 })) }, {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    };

    const selectedCash = cashAccounts.find(c => c.id === cashId) ?? null;
    const overBalance = selectedCash ? payRun.total_net > selectedCash.balance : false;

    const doPay = () => {
        router.post(route('pay-runs.pay', payRun.id), { cash_account_id: cashId }, { preserveScroll: true, onSuccess: () => setPayOpen(false) });
    };

    return (
        <AppLayout>
            <Head title={t('paie.show.head', { period })} />
            <div className="space-y-5">
                {/* En-tête */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={() => router.get(route('pay-runs.index'))} className="p-2 hover:bg-gray-100 rounded-lg transition">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <Receipt className="w-7 h-7 text-blue-600" />
                                {t('paie.show.title', { period })}
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badgeCls}`}>{t('paie.status.' + payRun.status)}</span>
                            </h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {payRun.reference}{payRun.label ? ` — ${payRun.label}` : ''}
                                {isPaid && payRun.cash_account ? t('paie.show.disbursed_on', { account: payRun.cash_account.name }) : ''}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isDraft && (
                            <>
                                <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setConfirm('validate')}><CheckCircle2 className="w-4 h-4" /> {t('paie.show.validate')}</Button>
                                <Button variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirm('cancel')}><XCircle className="w-4 h-4" /> {t('paie.show.cancel')}</Button>
                            </>
                        )}
                        {isValidated && (
                            <>
                                <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => setPayOpen(true)}><Banknote className="w-4 h-4" /> {t('paie.show.pay')}</Button>
                                <Button variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirm('cancel')}><XCircle className="w-4 h-4" /> {t('paie.show.cancel')}</Button>
                            </>
                        )}
                        {isPaid && (
                            <Button variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirm('cancel')}><XCircle className="w-4 h-4" /> {t('paie.show.cancel_pay')}</Button>
                        )}
                        {canDelete && (
                            <Button variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDeleteOpen(true)}><Trash2 className="w-4 h-4" /> {t('paie.show.delete')}</Button>
                        )}
                    </div>
                </div>

                {/* Totaux */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard title={t('paie.show.total_earnings')} value={fmt(payRun.total_gross)} color="text-emerald-600" />
                    <StatCard title={t('paie.show.total_deductions')} value={fmt(payRun.total_deductions)} color="text-red-600" />
                    <StatCard title={t('paie.show.net_mass')} value={fmt(payRun.total_net)} color="text-gray-900" />
                </div>

                {/* Bulletins */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-sm font-semibold text-gray-700">{t('paie.show.payslips_count', { count: payslips.total })}</p>
                        <div className="relative w-64 max-w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && applySearch()} placeholder={t('paie.show.search_ph')} className="pl-9 h-9" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('paie.show.col_employee')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('paie.show.col_earnings')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('paie.show.col_deductions')}</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('paie.show.col_net')}</th>
                                    <th className="px-4 py-3 w-28"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {payslips.data.length === 0 && (
                                    <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">{t('paie.show.empty')}</td></tr>
                                )}
                                {payslips.data.map(p => {
                                    const name = p.payload.employee?.name
                                        || `${p.employee_profile?.user?.firstname ?? ''} ${p.employee_profile?.user?.lastname ?? ''}`.trim()
                                        || '—';
                                    return (
                                        <tr key={p.id} className="hover:bg-gray-50/50">
                                            <td className="px-5 py-3">
                                                <p className="font-medium text-gray-900">{name}</p>
                                                <p className="text-xs text-gray-400">{p.reference}</p>
                                            </td>
                                            <td className="px-4 py-3 text-right text-emerald-600">{fmt(p.gross)}</td>
                                            <td className="px-4 py-3 text-right text-red-600">− {fmt(p.total_deductions)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(p.net)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <a href={route('payslips.pdf', p.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50" aria-label={t('paie.show.download_payslip')}>
                                                        <FileDown className="w-4 h-4" />
                                                    </a>
                                                    {isDraft && (
                                                        <button onClick={() => openEditor(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50" aria-label={t('paie.show.edit')}>
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                        {payslips.total > 0 && <p className="text-xs text-gray-400">{t('paie.show.range', { from: payslips.from, to: payslips.to, total: payslips.total })}</p>}
                        {payslips.last_page > 1 && (
                            <div className="flex items-center gap-1.5">
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={payslips.current_page === 1} onClick={() => goToPage(payslips.current_page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                                <span className="text-xs text-gray-500 px-2">{payslips.current_page} / {payslips.last_page}</span>
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={payslips.current_page === payslips.last_page} onClick={() => goToPage(payslips.current_page + 1)}><ChevronRight className="w-4 h-4" /></Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Éditeur de bulletin */}
            <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('paie.show.editor_title', { name: editing?.payload.employee?.name ?? '' })}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                        {lines.map((l, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <Input value={l.label} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder={t('paie.show.line_label_ph')} className="flex-1" />
                                <Select value={l.type} onValueChange={(v) => setLines(ls => ls.map((x, j) => j === i ? { ...x, type: v as LineType } : x))}>
                                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="earning">{t('paie.line_type.earning')}</SelectItem>
                                        <SelectItem value="deduction">{t('paie.line_type.deduction')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input type="number" min={0} value={String(l.amount)} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))} className="w-32" />
                                <button onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} className="p-1.5 text-gray-400 hover:text-red-600" aria-label={t('paie.show.remove')}><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setLines(ls => [...ls, { label: '', type: 'earning', amount: 0 }])}>
                            <Plus className="w-3.5 h-3.5" /> {t('paie.show.add_line')}
                        </Button>
                    </div>
                    <div className="flex items-center justify-between text-sm border-t pt-3">
                        <span className="flex items-center gap-1 text-emerald-600"><TrendingUp className="w-4 h-4" /> {fmt(lines.filter(l => l.type === 'earning').reduce((s, l) => s + (Number(l.amount) || 0), 0))}</span>
                        <span className="flex items-center gap-1 text-red-600"><TrendingDown className="w-4 h-4" /> {fmt(lines.filter(l => l.type === 'deduction').reduce((s, l) => s + (Number(l.amount) || 0), 0))}</span>
                        <span className="font-bold">{t('paie.show.net', { amount: fmt(lines.reduce((s, l) => s + (l.type === 'deduction' ? -1 : 1) * (Number(l.amount) || 0), 0)) })}</span>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditing(null)}>{t('paie.show.cancel_btn')}</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={saveLines}>{t('paie.show.save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Paiement */}
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('paie.show.pay_title')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">{t('paie.show.pay_amount', { amount: fmt(payRun.total_net) })}</p>
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center gap-1"><Wallet className="w-4 h-4 text-gray-500" /> {t('paie.show.cash_account')}</label>
                            <Select value={cashId} onValueChange={setCashId}>
                                <SelectTrigger><SelectValue placeholder={t('paie.show.select_cash')} /></SelectTrigger>
                                <SelectContent>
                                    {cashAccounts.map(c => <SelectItem key={c.id} value={c.id}>{t('paie.show.cash_balance', { name: c.name, balance: fmt(c.balance) })}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {overBalance && (
                            <p className="text-sm text-red-600 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> {t('paie.show.over_balance')}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPayOpen(false)}>{t('paie.show.cancel_btn')}</Button>
                        <Button className="bg-green-600 hover:bg-green-700" disabled={!cashId} onClick={doPay}>{t('paie.show.confirm_payment')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmations validate / cancel */}
            <AlertDialog open={!!confirm} onOpenChange={() => setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirm === 'validate' ? t('paie.show.confirm_validate_title') : t('paie.show.confirm_cancel_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirm === 'validate'
                                ? t('paie.show.confirm_validate_desc')
                                : (isPaid
                                    ? t('paie.show.confirm_cancel_paid_desc')
                                    : t('paie.show.confirm_cancel_desc'))}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('paie.show.back')}</AlertDialogCancel>
                        <AlertDialogAction
                            className={confirm === 'validate' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}
                            onClick={() => {
                                const url = confirm === 'validate' ? route('pay-runs.validate', payRun.id) : route('pay-runs.cancel', payRun.id);
                                router.post(url, {}, { preserveScroll: true, onFinish: () => setConfirm(null) });
                            }}
                        >
                            {confirm === 'validate' ? t('paie.show.validate_action') : t('paie.show.cancel_action')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            {/* Suppression du cycle */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('paie.show.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('paie.show.delete_desc_prefix', { period, count: payslips.total })}
                            {' '}{isPaid ? t('paie.show.delete_desc_paid') : t('paie.show.delete_desc_irreversible')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('paie.show.cancel_btn')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => router.delete(route('pay-runs.destroy', payRun.id), { onFinish: () => setDeleteOpen(false) })}>{t('paie.show.delete_btn')}</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
