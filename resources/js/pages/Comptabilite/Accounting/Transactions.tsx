import { Head, router } from '@inertiajs/react';
import { useMoney } from '@/helpers/money';
import {
    ArrowLeftRight, TrendingUp, TrendingDown,
    ChevronLeft, ChevronRight, XCircle,
    Banknote, Smartphone, Building2, ArrowUpRight, ArrowDownRight,
    CalendarDays, SlidersHorizontal, Plus, Trash2,
} from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type TxType        = 'INCOME' | 'EXPENSE';
type ReferenceType = 'PAYMENT' | 'SCHOLARSHIP' | 'EXPENSE' | 'CANCELLATION';
type CashType      = 'CASH' | 'MOBILE_MONEY' | 'BANK';

interface CashAccount { id: string; name: string; type: CashType; balance: number; }
interface Category { value: string; label: string; emoji: string; }

interface Transaction {
    id: string;
    type: TxType;
    amount: number;
    description: string;
    reference_type: ReferenceType;
    category: string | null;
    transaction_date: string;
    cash_account?: { id: string; name: string; type: CashType } | null;
    created_by?: { id: string; name: string } | null;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
}

interface Totals { total_income: number; total_expense: number; total_count: number; }

interface Props {
    transactions: Paginated<Transaction>;
    cashAccounts: { id: string; name: string; type: CashType }[];
    cashSummary:  CashAccount[];
    categories:   Category[];
    totals:       Totals | null;
    perPage:      number;
    filters:      { type?: string; reference_type?: string; category?: string; cash_account_id?: string; date_from?: string; date_to?: string; per_page?: string };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const todayStr      = () => new Date().toISOString().slice(0, 10);
const firstOfMonth  = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); };
const firstOfYear   = () => { const d = new Date(); d.setMonth(0, 1); return d.toISOString().slice(0, 10); };

const txConfig: Record<TxType, { bg: string; text: string; icon: React.ReactNode }> = {
    INCOME:  { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
    EXPENSE: { bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-400',    icon: <ArrowDownRight className="w-3.5 h-3.5" /> },
};

const refConfig: Record<ReferenceType, { color: string }> = {
    PAYMENT:      { color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
    SCHOLARSHIP:  { color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' },
    EXPENSE:      { color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' },
    CANCELLATION: { color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
};

const cashTypeIcon: Record<CashType, React.ReactNode> = {
    CASH:         <Banknote className="w-3.5 h-3.5" />,
    MOBILE_MONEY: <Smartphone className="w-3.5 h-3.5" />,
    BANK:         <Building2 className="w-3.5 h-3.5" />,
};

/* ------------------------------------------------------------------ */
/* StatCard                                                             */
/* ------------------------------------------------------------------ */
function StatCard({ title, value, sub, icon: Icon, color }: {
    title: string; value: string; sub?: string;
    icon: React.ElementType; color: 'blue' | 'green' | 'red' | 'gray';
}) {
    const styles = {
        blue:  { bg: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-600 dark:text-blue-400' },
        green: { bg: 'bg-green-50 dark:bg-green-900/20',  text: 'text-green-600 dark:text-green-400' },
        red:   { bg: 'bg-red-50 dark:bg-red-900/20',      text: 'text-red-600 dark:text-red-400' },
        gray:  { bg: 'bg-gray-100 dark:bg-gray-700',      text: 'text-gray-500 dark:text-gray-400' },
    };
    const { bg, text } = styles[color];
    return (
        <div className={`${bg} rounded-lg p-6 transition-all hover:shadow-md shadow-sm`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
                    <p className={`text-3xl font-bold ${text} mt-2`}>{value}</p>
                    {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
                </div>
                <Icon className={`w-12 h-12 ${text} opacity-20`} />
            </div>
        </div>
    );
}


/* ------------------------------------------------------------------ */
/* Composant principal                                                  */
/* ------------------------------------------------------------------ */
const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function Transactions({ transactions, cashAccounts, cashSummary, categories, totals, perPage, filters }: Readonly<Props>) {
    const fmt = useMoney();
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';

    const [type,          setType]          = useState(filters.type ?? '');
    const [refType,       setRefType]       = useState(filters.reference_type ?? '');
    const [category,      setCategory]      = useState(filters.category ?? '');
    const [cashAccountId, setCashAccountId] = useState(filters.cash_account_id ?? '');
    const [dateFrom,      setDateFrom]      = useState(filters.date_from ?? '');
    const [dateTo,        setDateTo]        = useState(filters.date_to ?? '');
    const [deletingId, setDeletingId]       = useState<string | null>(null);

    const catLabel = (key: string | null) => categories.find(c => c.value === key)?.label ?? null;
    const catEmoji = (key: string | null) => categories.find(c => c.value === key)?.emoji ?? '📌';

    const push = (overrides: Record<string, string | undefined> = {}) => {
        const params = {
            type:             (overrides.type            !== undefined ? overrides.type            : type)            || undefined,
            reference_type:   (overrides.refType         !== undefined ? overrides.refType         : refType)         || undefined,
            category:         (overrides.category        !== undefined ? overrides.category        : category)        || undefined,
            cash_account_id:  (overrides.cashAccountId   !== undefined ? overrides.cashAccountId   : cashAccountId)   || undefined,
            date_from:        (overrides.dateFrom        !== undefined ? overrides.dateFrom        : dateFrom)        || undefined,
            date_to:          (overrides.dateTo          !== undefined ? overrides.dateTo          : dateTo)          || undefined,
            per_page:         String(perPage),
        };
        router.get(route('accounting.transactions'), params, { preserveState: true, replace: true });
    };

    const changePerPage = (value: number) => {
        router.get(route('accounting.transactions'), {
            ...filters,
            per_page: String(value),
            page:     '1',
        }, { preserveState: true, replace: true });
    };

    const goToPage = (page: number) => {
        router.get(route('accounting.transactions'), {
            ...filters,
            per_page: String(perPage),
            page:     String(page),
        }, { preserveState: true, replace: true });
    };

    const clearAll = () => {
        setType(''); setRefType(''); setCategory(''); setCashAccountId(''); setDateFrom(''); setDateTo('');
        router.get(route('accounting.transactions'), {}, { preserveState: true, replace: true });
    };

    const setQuickDate = (from: string, to: string) => {
        setDateFrom(from); setDateTo(to);
        push({ dateFrom: from, dateTo: to });
    };

    const onDeleteExpense = (id: string) => {
        router.delete(route('expenses.destroy', id), {
            preserveScroll: true,
            onSuccess: () => setDeletingId(null),
            onError:   () => setDeletingId(null),
        });
    };

    const activeFilters = [
        type          && { key: 'type',          label: type === 'INCOME' ? t('comptabilite.tx.income') : t('comptabilite.tx.outflows'), clear: () => { setType('');          push({ type: '' }); } },
        refType       && { key: 'refType',        label: t(`comptabilite.tx.ref.${refType}`),                              clear: () => { setRefType('');       push({ refType: '' }); } },
        category      && { key: 'category',        label: catLabel(category) ?? category,                                   clear: () => { setCategory('');      push({ category: '' }); } },
        cashAccountId && { key: 'cashAccountId',  label: cashAccounts.find(c => c.id === cashAccountId)?.name ?? t('comptabilite.tx.cash'), clear: () => { setCashAccountId(''); push({ cashAccountId: '' }); } },
        (dateFrom || dateTo) && { key: 'dates', label: [dateFrom, dateTo].filter(Boolean).join(' → '), clear: () => { setDateFrom(''); setDateTo(''); push({ dateFrom: '', dateTo: '' }); } },
    ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

    const balance = (totals?.total_income ?? 0) - (totals?.total_expense ?? 0);

    const sel = "h-9 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-card dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

    return (
        <AppLayout>
            <Head title={t('comptabilite.tx.head')} />

            <div className="space-y-5">

                {/* ── En-tête ── */}
                <div className="flex flex-col gap-4">

                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <ArrowLeftRight className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                {t('comptabilite.tx.title')}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {t('comptabilite.tx.subtitle')}
                            </p>
                        </div>
                        <Button
                            className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                            onClick={() => router.get(route('expenses.create'))}
                        >
                            <Plus className="w-4 h-4" />
                            {t('comptabilite.tx.new_expense')}
                        </Button>
                    </div>

                    {/* ── Cards stats ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title={t('comptabilite.tx.total_collected')}
                            value={fmt(totals?.total_income ?? 0)}
                            sub={t('comptabilite.tx.transactions_count', { count: totals?.total_count ?? 0 })}
                            icon={TrendingUp}
                            color="green"
                        />
                        <StatCard
                            title={t('comptabilite.tx.total_out')}
                            value={fmt(totals?.total_expense ?? 0)}
                            icon={TrendingDown}
                            color="red"
                        />
                        <StatCard
                            title={t('comptabilite.tx.net_balance')}
                            value={fmt(balance)}
                            sub={balance >= 0 ? t('comptabilite.tx.positive') : t('comptabilite.tx.negative')}
                            icon={ArrowLeftRight}
                            color={balance >= 0 ? 'blue' : 'red'}
                        />
                        <StatCard
                            title={t('comptabilite.tx.transactions')}
                            value={String(totals?.total_count ?? transactions.total)}
                            sub={t('comptabilite.tx.of_total')}
                            icon={ArrowLeftRight}
                            color="gray"
                        />
                    </div>

                    {/* ── Soldes caisses ── */}
                    {cashSummary.length > 0 && (
                        <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-700 px-5 py-4 shadow-sm flex items-center gap-3 flex-wrap">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide shrink-0">{t('comptabilite.tx.cash_accounts')}</p>
                            {cashSummary.map(ca => (
                                <div key={ca.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <span className="text-gray-400">{cashTypeIcon[ca.type]}</span>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">{ca.name}</span>
                                    <span className={`text-sm font-bold ${ca.balance < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{fmt(ca.balance)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Filtres ── */}
                <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                            <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                            {t('comptabilite.tx.filters')}
                        </div>
                        {activeFilters.length > 0 && (
                            <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors">
                                <XCircle className="w-3.5 h-3.5" /> {t('comptabilite.tx.clear_all')}
                            </button>
                        )}
                    </div>

                    <div className="p-4 space-y-3">

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('comptabilite.tx.type')}</label>
                                <select value={type} onChange={e => { setType(e.target.value); push({ type: e.target.value }); }} className={sel}>
                                    <option value="">{t('comptabilite.tx.all_types')}</option>
                                    <option value="INCOME">{t('comptabilite.tx.income_arrow')}</option>
                                    <option value="EXPENSE">{t('comptabilite.tx.expense_arrow')}</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('comptabilite.tx.reference')}</label>
                                <select value={refType} onChange={e => { setRefType(e.target.value); push({ refType: e.target.value }); }} className={sel}>
                                    <option value="">{t('comptabilite.tx.all_references')}</option>
                                    <option value="PAYMENT">{t('comptabilite.tx.ref_payment')}</option>
                                    <option value="SCHOLARSHIP">{t('comptabilite.tx.ref_scholarship')}</option>
                                    <option value="CANCELLATION">{t('comptabilite.tx.ref_cancellation')}</option>
                                    <option value="EXPENSE">{t('comptabilite.tx.ref_expense')}</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('comptabilite.tx.category')}</label>
                                <select value={category} onChange={e => { setCategory(e.target.value); push({ category: e.target.value }); }} className={sel}>
                                    <option value="">{t('comptabilite.tx.all_categories')}</option>
                                    {categories.map(c => (
                                        <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('comptabilite.tx.cash')}</label>
                                <select value={cashAccountId} onChange={e => { setCashAccountId(e.target.value); push({ cashAccountId: e.target.value }); }} className={sel}>
                                    <option value="">{t('comptabilite.tx.all_cash')}</option>
                                    {cashAccounts.map(ca => (
                                        <option key={ca.id} value={ca.id}>{ca.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <CalendarDays className="w-3 h-3" /> {t('comptabilite.tx.period')}
                                </label>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={e => setDateFrom(e.target.value)}
                                        onBlur={() => push()}
                                        className={`${sel} flex-1 min-w-0`}
                                    />
                                    <span className="text-gray-400 text-xs shrink-0">→</span>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={e => setDateTo(e.target.value)}
                                        onBlur={() => push()}
                                        className={`${sel} flex-1 min-w-0`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{t('comptabilite.tx.quick')}</span>
                            {[
                                { label: t('comptabilite.tx.today'),      from: todayStr(),       to: todayStr() },
                                { label: t('comptabilite.tx.this_month'), from: firstOfMonth(),   to: todayStr() },
                                { label: t('comptabilite.tx.this_year'),  from: firstOfYear(),    to: todayStr() },
                            ].map(q => (
                                <button
                                    key={q.label}
                                    onClick={() => setQuickDate(q.from, q.to)}
                                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                                        dateFrom === q.from && dateTo === q.to
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400'
                                    }`}
                                >
                                    {q.label}
                                </button>
                            ))}
                        </div>

                        {activeFilters.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-100 dark:border-gray-700">
                                <span className="text-xs text-gray-400 shrink-0">{t('comptabilite.tx.active')}</span>
                                {activeFilters.map(f => (
                                    <span key={f.key} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                        {f.label}
                                        <button onClick={f.clear} className="hover:text-red-500 transition-colors ml-0.5">
                                            <XCircle className="w-3.5 h-3.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Tableau ── */}
                <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">

                    <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4 flex-wrap">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {t('comptabilite.tx.transactions_count', { count: transactions.total })}
                            {activeFilters.length > 0 && <span className="text-xs text-blue-500 ml-2">{t('comptabilite.tx.filtered')}</span>}
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('comptabilite.tx.per_page')}</span>
                            <select
                                value={perPage}
                                onChange={e => changePerPage(Number(e.target.value))}
                                className="h-8 px-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-card dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {PER_PAGE_OPTIONS.map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {transactions.data.length === 0 ? (
                        <div className="px-5 py-16 text-center text-gray-400">
                            <ArrowLeftRight className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">{t('comptabilite.tx.empty')}</p>
                            {activeFilters.length > 0 && (
                                <button onClick={clearAll} className="mt-2 text-xs text-blue-500 hover:underline">
                                    {t('comptabilite.tx.clear_filters')}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-28">{t('comptabilite.tx.col_type')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.tx.col_description')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-32">{t('comptabilite.tx.col_reference')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-36">{t('comptabilite.tx.col_cash')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-36">{t('comptabilite.tx.col_amount')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-28">{t('comptabilite.tx.col_date')}</th>
                                        <th className="px-4 py-3 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                    {transactions.data.map(tx => {
                                        const tc  = txConfig[tx.type];
                                        const ref = refConfig[tx.reference_type];
                                        const isManualExpense = tx.reference_type === 'EXPENSE';
                                        return (
                                            <tr key={tx.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors ${isManualExpense ? 'bg-orange-50/20 dark:bg-orange-900/5' : ''}`}>
                                                <td className="px-5 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${tc.bg} ${tc.text}`}>
                                                        {tc.icon}{t(`comptabilite.tx.txtype.${tx.type}`)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        {tx.category && (
                                                            <span
                                                                className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
                                                                title={catLabel(tx.category) ?? undefined}
                                                            >
                                                                {catEmoji(tx.category)} {catLabel(tx.category)}
                                                            </span>
                                                        )}
                                                        <p className="truncate text-sm">{tx.description}</p>
                                                    </div>
                                                    {tx.created_by && (
                                                        <p className="text-xs text-gray-400 mt-0.5">{t('comptabilite.tx.by_user', { name: tx.created_by.name })}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${ref.color}`}>
                                                        {t(`comptabilite.tx.ref.${tx.reference_type}`)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {tx.cash_account ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                                                            <span className="text-gray-400">{cashTypeIcon[tx.cash_account.type]}</span>
                                                            {tx.cash_account.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`font-bold text-sm ${tc.text}`}>
                                                        {tx.type === 'EXPENSE' ? '− ' : '+ '}{fmt(tx.amount)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                    {new Date(tx.transaction_date).toLocaleDateString(dateLocale)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isManualExpense && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <button
                                                                    onClick={() => setDeletingId(tx.id)}
                                                                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                                    aria-label={t('comptabilite.tx.delete_expense_aria')}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>{t('comptabilite.tx.delete_expense_aria')}</TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pied de tableau : pagination */}
                    <div className="px-5 py-3.5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4 flex-wrap">

                        {transactions.total > 0 && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                {t('comptabilite.tx.range', { from: transactions.from, to: transactions.to, total: transactions.total })}
                            </p>
                        )}

                        {transactions.last_page > 1 && (
                            <div className="flex items-center gap-1.5">
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                                    disabled={transactions.current_page === 1}
                                    onClick={() => goToPage(1)} title={t('comptabilite.tx.first_page')}>
                                    <ChevronLeft className="w-3.5 h-3.5 -mr-1" />
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                                    disabled={transactions.current_page === 1}
                                    onClick={() => goToPage(transactions.current_page - 1)}>
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                {(() => {
                                    const total  = transactions.last_page;
                                    const cur    = transactions.current_page;
                                    const win    = 5;
                                    const start  = Math.max(1, Math.min(cur - Math.floor(win / 2), total - win + 1));
                                    const end    = Math.min(total, start + win - 1);
                                    return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(p => (
                                        <Button key={p} size="sm"
                                            variant={p === cur ? 'default' : 'outline'}
                                            className={`h-8 w-8 p-0 text-xs ${p === cur ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                                            onClick={() => goToPage(p)}>
                                            {p}
                                        </Button>
                                    ));
                                })()}
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                                    disabled={transactions.current_page === transactions.last_page}
                                    onClick={() => goToPage(transactions.current_page + 1)}>
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                                    disabled={transactions.current_page === transactions.last_page}
                                    onClick={() => goToPage(transactions.last_page)} title={t('comptabilite.tx.last_page')}>
                                    <ChevronRight className="w-3.5 h-3.5 -mr-1" />
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Confirmation suppression */}
            <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('comptabilite.tx.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('comptabilite.tx.delete_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('common.actions.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deletingId && onDeleteExpense(deletingId)}
                        >
                            {t('common.actions.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
