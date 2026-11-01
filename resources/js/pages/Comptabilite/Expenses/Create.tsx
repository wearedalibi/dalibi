import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, TrendingDown, Wallet, CalendarDays, AlertTriangle, History } from 'lucide-react';
import { useMoney } from '@/helpers/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type CashType = 'CASH' | 'MOBILE_MONEY' | 'BANK';

interface CashAccount { id: string; name: string; type: CashType; balance: number; }
interface Category { value: string; label: string; emoji: string; }
interface RecentExpense {
    id: string;
    amount: number;
    description: string;
    category: string | null;
    transaction_date: string;
    cash_account?: { id: string; name: string; type: CashType } | null;
}

interface Props {
    cashAccounts: CashAccount[];
    categories:   Category[];
    recent:       RecentExpense[];
}

interface ExpenseFormData {
    description: string;
    category: string;
    amount: string;
    cash_account_id: string;
    transaction_date: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function ExpenseCreate({ cashAccounts, categories, recent }: Readonly<Props>) {
    const fmt = useMoney();
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';

    const { data, setData, post, processing, errors } = useForm<ExpenseFormData>({
        description: '',
        category: '',
        amount: '',
        cash_account_id: cashAccounts[0]?.id ?? '',
        transaction_date: todayStr(),
    });

    const selectedAccount = cashAccounts.find(c => c.id === data.cash_account_id) ?? null;
    const amountNum       = Number(data.amount) || 0;
    const projected       = selectedAccount ? selectedAccount.balance - amountNum : null;
    const willGoNegative  = projected !== null && amountNum > 0 && projected < 0;

    const categoryLabel = (key: string | null) => categories.find(c => c.value === key)?.label ?? key ?? '—';
    const categoryEmoji = (key: string | null) => categories.find(c => c.value === key)?.emoji ?? '📌';

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post(route('expenses.store'), { preserveScroll: true });
    };

    return (
        <AppLayout>
            <Head title={t('comptabilite.expense.head')} />

            <div className="space-y-6">
                {/* En-tête */}
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => router.get(route('accounting.transactions'))}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('comptabilite.expense.title')}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{t('comptabilite.expense.subtitle')}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">

                    {/* Détails de la dépense */}
                    <div className="rounded-2xl bg-linear-to-br from-orange-50 to-white ring-1 ring-orange-100 p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-orange-700">
                            <TrendingDown className="h-4 w-4" />
                            <p className="text-sm font-semibold">{t('comptabilite.expense.details')}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Catégorie */}
                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-gray-900 mb-2">{t('comptabilite.expense.category')}</label>
                                <Select value={data.category} onValueChange={(v) => setData('category', v)}>
                                    <SelectTrigger id="category" className={errors.category ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('comptabilite.expense.select_category')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => (
                                            <SelectItem key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.category && <p className="text-red-600 text-sm mt-1">{errors.category}</p>}
                            </div>

                            {/* Montant */}
                            <div>
                                <label htmlFor="amount" className="block text-sm font-medium text-gray-900 mb-2">{t('comptabilite.expense.amount')}</label>
                                <Input
                                    id="amount"
                                    type="number"
                                    min={1}
                                    value={data.amount}
                                    onChange={e => setData('amount', e.target.value)}
                                    placeholder={t('comptabilite.expense.amount_ph')}
                                    className={errors.amount ? 'border-red-500' : ''}
                                />
                                {errors.amount && <p className="text-red-600 text-sm mt-1">{errors.amount}</p>}
                            </div>

                            {/* Description */}
                            <div className="md:col-span-2">
                                <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">{t('comptabilite.expense.description')}</label>
                                <Input
                                    id="description"
                                    type="text"
                                    value={data.description}
                                    onChange={e => setData('description', e.target.value)}
                                    placeholder={t('comptabilite.expense.description_ph')}
                                    className={errors.description ? 'border-red-500' : ''}
                                />
                                {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
                            </div>

                            {/* Date */}
                            <div>
                                <label htmlFor="transaction_date" className="block text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                                    <CalendarDays className="w-3.5 h-3.5 text-gray-500" /> {t('comptabilite.expense.date')}
                                </label>
                                <Input
                                    id="transaction_date"
                                    type="date"
                                    max={todayStr()}
                                    value={data.transaction_date}
                                    onChange={e => setData('transaction_date', e.target.value)}
                                    className={errors.transaction_date ? 'border-red-500' : ''}
                                />
                                {errors.transaction_date && <p className="text-red-600 text-sm mt-1">{errors.transaction_date}</p>}
                            </div>

                            {/* Caisse */}
                            <div>
                                <label htmlFor="cash_account_id" className="block text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                                    <Wallet className="w-3.5 h-3.5 text-gray-500" /> {t('comptabilite.expense.cash_account')}
                                </label>
                                <Select value={data.cash_account_id} onValueChange={(v) => setData('cash_account_id', v)}>
                                    <SelectTrigger id="cash_account_id" className={errors.cash_account_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('comptabilite.expense.select_cash')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cashAccounts.map(ca => (
                                            <SelectItem key={ca.id} value={ca.id}>{t('comptabilite.expense.balance_opt', { name: ca.name, balance: fmt(ca.balance) })}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.cash_account_id && <p className="text-red-600 text-sm mt-1">{errors.cash_account_id}</p>}
                                {selectedAccount && amountNum > 0 && (
                                    <p className={`text-sm mt-1.5 flex items-center gap-1 ${willGoNegative ? 'text-red-600' : 'text-gray-500'}`}>
                                        {willGoNegative && <AlertTriangle className="w-3.5 h-3.5" />}
                                        {t('comptabilite.expense.after_expense')} <span className="font-semibold">{fmt(projected ?? 0)}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dernières dépenses */}
                    {recent.length > 0 && (
                        <div className="rounded-2xl bg-linear-to-br from-slate-50 to-white ring-1 ring-slate-100 p-6 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 text-slate-600">
                                <History className="h-4 w-4" />
                                <p className="text-sm font-semibold">{t('comptabilite.expense.recent')}</p>
                            </div>
                            <ul className="divide-y divide-slate-100">
                                {recent.map(r => (
                                    <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                                        <span className="flex items-center gap-2 min-w-0 text-gray-700">
                                            <span className="shrink-0">{categoryEmoji(r.category)}</span>
                                            <span className="truncate" title={`${categoryLabel(r.category)} — ${r.description}`}>{r.description}</span>
                                        </span>
                                        <span className="shrink-0 text-gray-400">{new Date(r.transaction_date).toLocaleDateString(dateLocale)}</span>
                                        <span className="shrink-0 font-semibold text-red-600 w-28 text-right">− {fmt(r.amount)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700">
                            {processing ? t('comptabilite.expense.saving') : t('comptabilite.expense.submit')}
                        </Button>
                        <Button type="button" variant="outline" className="border-slate-200 text-gray-700" onClick={() => router.get(route('accounting.transactions'))}>
                            {t('common.actions.cancel')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
