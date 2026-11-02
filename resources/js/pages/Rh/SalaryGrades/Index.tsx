import { Head, router } from '@inertiajs/react';
import { Layers, Plus, Pencil, Trash2, Clock, Users, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMoney } from '@/helpers/money';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Grade {
    id: string;
    name: string;
    category: string | null;
    echelon: number | null;
    base_amount: number;
    active: boolean;
    employee_profiles_count: number;
}

interface Settings {
    seniority_enabled: boolean;
    seniority_rate_per_year: number;
    seniority_cap_percent: number;
}

interface Paginated<T> { data: T[]; current_page: number; last_page: number; from: number; to: number; total: number; }
interface Props {
    grades: Paginated<Grade>;
    perPage: number;
    filters: { search?: string; status?: string };
    settings: Settings;
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function Index({ grades, perPage, filters, settings }: Readonly<Props>) {
    const fmt = useMoney();
    const { t } = useTranslation();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');

    const apply = () => router.get(route('salary-grades.index'), {
        search: search || undefined, status: status || undefined, per_page: String(perPage),
    }, { preserveState: true, replace: true });
    const clear = () => { setSearch(''); setStatus(''); router.get(route('salary-grades.index'), {}, { preserveState: true, replace: true }); };
    const goToPage = (page: number) => router.get(route('salary-grades.index'), { ...filters, per_page: String(perPage), page: String(page) }, { preserveState: true, replace: true });
    const changePerPage = (value: number) => router.get(route('salary-grades.index'), { ...filters, per_page: String(value), page: '1' }, { preserveState: true, replace: true });
    const selectCls = "px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

    return (
        <AppLayout>
            <Head title={t('rh.salary_grades.index.head')} />
            <div className="space-y-5">
                {/* En-tête */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Layers className="w-7 h-7 text-blue-600" /> {t('rh.salary_grades.index.head')}
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">{t('rh.salary_grades.index.subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="gap-2" onClick={() => router.get(route('payroll-settings.edit'))}>
                            <Clock className="w-4 h-4 text-amber-600" /> {t('rh.salary_grades.index.settings')}
                        </Button>
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => router.get(route('salary-grades.create'))}>
                            <Plus className="w-4 h-4" /> {t('rh.salary_grades.index.new')}
                        </Button>
                    </div>
                </div>

                {/* État de l'ancienneté */}
                <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 px-4 py-2.5 flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-amber-500" />
                    {settings.seniority_enabled
                        ? <span>{t('rh.salary_grades.index.seniority_active')} <strong className="text-emerald-600">{t('rh.salary_grades.index.seniority_active_state')}</strong> : {t('rh.salary_grades.index.seniority_active_desc', { rate: settings.seniority_rate_per_year })}{settings.seniority_cap_percent > 0 ? t('rh.salary_grades.index.seniority_cap', { cap: settings.seniority_cap_percent }) : ''}.</span>
                        : <span>{t('rh.salary_grades.index.seniority_active')} <strong className="text-gray-500">{t('rh.salary_grades.index.seniority_disabled_state')}</strong>.</span>}
                </div>

                {/* Filtres */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && apply()} placeholder={t('rh.salary_grades.index.search_ph')} className="pl-10 border-gray-300" />
                        </div>
                        <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls}>
                            <option value="">{t('rh.salary_grades.index.all')}</option>
                            <option value="active">{t('rh.salary_grades.index.actives')}</option>
                            <option value="inactive">{t('rh.salary_grades.index.inactives')}</option>
                        </select>
                        <Button onClick={apply} className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><Search className="w-4 h-4" /> {t('rh.salary_grades.index.search')}</Button>
                        {(search || status) && <Button variant="outline" onClick={clear} className="border-gray-300 text-gray-700">{t('rh.salary_grades.index.reset')}</Button>}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 gap-4 flex-wrap">
                        <p className="text-sm font-semibold text-gray-700">{t('rh.salary_grades.index.count', { count: grades.total })}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{t('rh.salary_grades.index.per_page')}</span>
                            <select value={perPage} onChange={e => changePerPage(Number(e.target.value))} className="h-8 px-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>
                    {grades.data.length === 0 ? (
                        <div className="px-5 py-16 text-center text-gray-400">
                            <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">{t('rh.salary_grades.index.empty')}</p>
                            <Button className="mt-3 gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => router.get(route('salary-grades.create'))}>
                                <Plus className="w-4 h-4" /> {t('rh.salary_grades.index.create_first')}
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('rh.salary_grades.index.col_grade')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('rh.salary_grades.index.col_category')}</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t('rh.salary_grades.index.col_employees')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('rh.salary_grades.index.col_base')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('rh.salary_grades.index.col_status')}</th>
                                        <th className="px-4 py-3 w-24"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {grades.data.map(g => (
                                        <tr key={g.id} className="hover:bg-gray-50/50">
                                            <td className="px-5 py-3 font-medium text-gray-900">{g.name}</td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {[g.category && t('rh.salary_grades.index.cat', { category: g.category }), g.echelon != null && t('rh.salary_grades.index.echelon', { echelon: g.echelon })].filter(Boolean).join(' · ') || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center gap-1 text-gray-600">
                                                    <Users className="w-3.5 h-3.5 text-gray-400" /> {g.employee_profiles_count}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(g.base_amount)}</td>
                                            <td className="px-4 py-3">
                                                {g.active
                                                    ? <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">{t('rh.salary_grades.index.active')}</span>
                                                    : <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">{t('rh.salary_grades.index.inactive')}</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => router.get(route('salary-grades.employees', g.id))} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50" aria-label={t('rh.salary_grades.index.assign_employees')} title={t('rh.salary_grades.index.assign_employees')}><Users className="w-4 h-4" /></button>
                                                    <button onClick={() => router.get(route('salary-grades.edit', g.id))} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50" aria-label={t('rh.salary_grades.index.edit')}><Pencil className="w-4 h-4" /></button>
                                                    <button onClick={() => setDeletingId(g.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" aria-label={t('rh.salary_grades.index.delete')}><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                        {grades.total > 0 && <p className="text-xs text-gray-400">{t('rh.salary_grades.index.range', { from: grades.from, to: grades.to, total: grades.total })}</p>}
                        {grades.last_page > 1 && (
                            <div className="flex items-center gap-1.5">
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={grades.current_page === 1} onClick={() => goToPage(grades.current_page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                                <span className="text-xs text-gray-500 px-2">{grades.current_page} / {grades.last_page}</span>
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={grades.current_page === grades.last_page} onClick={() => goToPage(grades.current_page + 1)}><ChevronRight className="w-4 h-4" /></Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('rh.salary_grades.index.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('rh.salary_grades.index.delete_desc')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('rh.salary_grades.index.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => {
                            if (deletingId) router.delete(route('salary-grades.destroy', deletingId), { preserveScroll: true, onFinish: () => setDeletingId(null) });
                        }}>{t('rh.salary_grades.index.delete')}</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
