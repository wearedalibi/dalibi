import { Head, router } from '@inertiajs/react';
import { Plus, Receipt, ChevronLeft, ChevronRight, Eye, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/icon-button';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useMoney } from '@/helpers/money';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface PayRun {
    id: string;
    reference: string;
    period_month: number;
    period_year: number;
    label: string | null;
    status: string;
    total_net: number;
    payslips_count: number;
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
    payRuns: Paginated<PayRun>;
    years: number[];
    perPage: number;
    canDelete: boolean;
    filters: { status?: string; period_year?: string; period_month?: string; search?: string };
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

const STATUS_CLS: Record<string, string> = {
    draft:     'bg-gray-100 text-gray-600',
    validated: 'bg-blue-100 text-blue-700',
    paid:      'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
};

export default function Index({ payRuns, years, perPage, canDelete, filters }: Readonly<Props>) {
    const fmt = useMoney();
    const { t } = useTranslation();
    const MONTHS = ['', ...Array.from({ length: 12 }, (_, i) => t('paie.months.' + (i + 1)))];
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [year, setYear] = useState(filters.period_year ?? '');
    const [month, setMonth] = useState(filters.period_month ?? '');
    const [deleting, setDeleting] = useState<PayRun | null>(null);

    const apply = (over: Record<string, string | undefined> = {}) => {
        router.get(route('pay-runs.index'), {
            search: (over.search !== undefined ? over.search : search) || undefined,
            status: (over.status !== undefined ? over.status : status) || undefined,
            period_year: (over.period_year !== undefined ? over.period_year : year) || undefined,
            period_month: (over.period_month !== undefined ? over.period_month : month) || undefined,
            per_page: String(perPage),
        }, { preserveState: true, replace: true });
    };

    const clear = () => {
        setSearch(''); setStatus(''); setYear(''); setMonth('');
        router.get(route('pay-runs.index'), {}, { preserveState: true, replace: true });
    };

    const goToPage = (page: number) => router.get(route('pay-runs.index'), { ...filters, per_page: String(perPage), page: String(page) }, { preserveState: true, replace: true });
    const changePerPage = (value: number) => router.get(route('pay-runs.index'), { ...filters, per_page: String(value), page: '1' }, { preserveState: true, replace: true });

    const hasFilters = !!(search || status || year || month);
    const selectCls = "px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

    return (
        <AppLayout>
            <Head title={t('paie.index.head')} />
            <div className="space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Receipt className="w-7 h-7 text-blue-600" /> {t('paie.index.head')}
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">{t('paie.index.subtitle')}</p>
                    </div>
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => router.get(route('pay-runs.create'))}>
                        <Plus className="w-4 h-4" /> {t('paie.index.new')}
                    </Button>
                </div>

                {/* Filtres */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && apply()}
                                placeholder={t('paie.index.search_ph')}
                                className="pl-10 border-gray-300"
                            />
                        </div>

                        <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls}>
                            <option value="">{t('paie.index.all_statuses')}</option>
                            <option value="draft">{t('paie.status.draft')}</option>
                            <option value="validated">{t('paie.status.validated')}</option>
                            <option value="paid">{t('paie.status.paid')}</option>
                            <option value="cancelled">{t('paie.status.cancelled')}</option>
                        </select>

                        <select value={year} onChange={e => setYear(e.target.value)} className={selectCls}>
                            <option value="">{t('paie.index.all_years')}</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>

                        <select value={month} onChange={e => setMonth(e.target.value)} className={selectCls}>
                            <option value="">{t('paie.index.all_months')}</option>
                            {MONTHS.slice(1).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>

                        <Button onClick={() => apply()} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                            <Search className="w-4 h-4" /> {t('paie.index.search')}
                        </Button>
                        {hasFilters && (
                            <Button variant="outline" onClick={clear} className="border-gray-300 text-gray-700">{t('paie.index.reset')}</Button>
                        )}
                    </div>
                </div>

                {/* Tableau */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 gap-4 flex-wrap">
                        <p className="text-sm text-gray-600">{t('paie.index.count', { count: payRuns.total })}{hasFilters && <span className="text-blue-500 ml-2">{t('paie.index.filtered')}</span>}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{t('paie.index.per_page')}</span>
                            <select value={perPage} onChange={e => changePerPage(Number(e.target.value))} className="h-8 px-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow className="border-b border-gray-200">
                                    <TableHead className="font-semibold text-gray-900">{t('paie.index.col_period')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('paie.index.col_reference')}</TableHead>
                                    <TableHead className="text-center font-semibold text-gray-900">{t('paie.index.col_payslips')}</TableHead>
                                    <TableHead className="text-right font-semibold text-gray-900">{t('paie.index.col_net')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('paie.index.col_status')}</TableHead>
                                    <TableHead className="text-center font-semibold text-gray-900 w-20">{t('paie.index.col_actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payRuns.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Receipt className="w-12 h-12 text-gray-300" />
                                                <p className="text-lg">{t('paie.index.empty')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    payRuns.data.map(run => {
                                        const badgeCls = STATUS_CLS[run.status] ?? STATUS_CLS.draft;
                                        return (
                                            <TableRow key={run.id} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors cursor-pointer" onClick={() => router.get(route('pay-runs.show', run.id))}>
                                                <TableCell className="font-semibold text-gray-900">
                                                    {MONTHS[run.period_month]} {run.period_year}
                                                    {run.label && <span className="block text-xs font-normal text-gray-400">{run.label}</span>}
                                                </TableCell>
                                                <TableCell className="text-gray-500">{run.reference}</TableCell>
                                                <TableCell className="text-center text-gray-700">{run.payslips_count}</TableCell>
                                                <TableCell className="text-right font-semibold text-gray-900">{fmt(run.total_net)}</TableCell>
                                                <TableCell>
                                                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${badgeCls}`}>{t('paie.status.' + run.status)}</span>
                                                </TableCell>
                                                <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <IconButton label={t('paie.index.view')} icon={<Eye className="w-4 h-4" />} onClick={() => router.get(route('pay-runs.show', run.id))} />
                                                        {canDelete && (
                                                            <IconButton label={t('paie.index.delete')} icon={<Trash2 className="w-4 h-4" />} className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDeleting(run)} />
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                        {payRuns.total > 0 && <p className="text-xs text-gray-400">{t('paie.index.range', { from: payRuns.from, to: payRuns.to, total: payRuns.total })}</p>}
                        {payRuns.last_page > 1 && (
                            <div className="flex items-center gap-1.5">
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={payRuns.current_page === 1} onClick={() => goToPage(payRuns.current_page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                                <span className="text-xs text-gray-500 px-2">{payRuns.current_page} / {payRuns.last_page}</span>
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={payRuns.current_page === payRuns.last_page} onClick={() => goToPage(payRuns.current_page + 1)}><ChevronRight className="w-4 h-4" /></Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('paie.index.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleting ? t('paie.index.delete_desc_prefix', { period: `${MONTHS[deleting.period_month]} ${deleting.period_year}`, count: deleting.payslips_count }) : ''}
                            {deleting?.status === 'paid' ? t('paie.index.delete_desc_paid') : t('paie.index.delete_desc_irreversible')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('paie.index.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => {
                            if (deleting) router.delete(route('pay-runs.destroy', deleting.id), { preserveScroll: true, onFinish: () => setDeleting(null) });
                        }}>{t('paie.index.delete_btn')}</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
