import { Head, router, useForm } from '@inertiajs/react';
import { Users, Plus, Search, ChevronLeft, ChevronRight, ExternalLink, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
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

interface Employee {
    id: string;
    name: string;
    user_id: string;
    employee_number: string | null;
    job_title: string;
    status: string;
    salary_grade_id: string | null;
    effective_base: number;
}
interface Grade { id: string; name: string; base_amount: number; }
interface UserOption { id: string; name: string; }
interface ContractType { value: string; label: string; }
interface Paginated<T> { data: T[]; current_page: number; last_page: number; from: number; to: number; total: number; }

interface Props {
    employees: Paginated<Employee>;
    salaryGrades: Grade[];
    ungradedCount: number;
    assignableUsers: UserOption[];
    contractTypes: ContractType[];
    canManage: boolean;
    perPage: number;
    filters: { status?: string; salary_grade_id?: string; ungraded?: string; search?: string };
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

const STATUS_BADGE: Record<string, { cls: string }> = {
    active:     { cls: 'bg-green-100 text-green-700' },
    suspended:  { cls: 'bg-amber-100 text-amber-700' },
    terminated: { cls: 'bg-gray-200 text-gray-600' },
};

export default function Index({ employees, salaryGrades, ungradedCount, assignableUsers, contractTypes, canManage, perPage, filters }: Readonly<Props>) {
    const fmt = useMoney();
    const { t } = useTranslation();
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [gradeId, setGradeId] = useState(filters.salary_grade_id ?? '');
    const [ungraded, setUngraded] = useState(filters.ungraded === '1' || filters.ungraded === 'true');
    const [addOpen, setAddOpen] = useState(false);
    const [userQuery, setUserQuery] = useState('');
    const [userOpen, setUserOpen] = useState(false);

    const apply = (over: { ungraded?: boolean } = {}) => {
        const ung = over.ungraded !== undefined ? over.ungraded : ungraded;
        router.get(route('personnel.index'), {
            search: search || undefined,
            status: status || undefined,
            salary_grade_id: gradeId || undefined,
            ungraded: ung ? '1' : undefined,
            per_page: String(perPage),
        }, { preserveState: true, replace: true });
    };

    const clear = () => {
        setSearch(''); setStatus(''); setGradeId(''); setUngraded(false);
        router.get(route('personnel.index'), {}, { preserveState: true, replace: true });
    };

    const goToPage = (page: number) => router.get(route('personnel.index'), { ...filters, per_page: String(perPage), page: String(page) }, { preserveState: true, replace: true });
    const changePerPage = (value: number) => router.get(route('personnel.index'), { ...filters, per_page: String(value), page: '1' }, { preserveState: true, replace: true });

    const assignGrade = (emp: Employee, value: string) => {
        router.put(route('personnel.grade', emp.id), { salary_grade_id: value === 'none' ? null : value }, { preserveScroll: true });
    };

    const addForm = useForm({ user_id: '', job_title: '', contract_type: 'CDI', salary_grade_id: 'none', base_salary: '', payment_method: 'CASH', status: 'active' });
    const submitAdd = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        addForm.transform(d => ({ ...d, salary_grade_id: d.salary_grade_id === 'none' ? '' : d.salary_grade_id }));
        addForm.post(route('personnel.store'), { preserveScroll: true, onSuccess: () => { addForm.reset(); setUserQuery(''); setAddOpen(false); } });
    };

    const sel = "h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
    const ungradedActive = filters.ungraded === '1' || filters.ungraded === 'true';

    return (
        <AppLayout>
            <Head title={t('rh.personnel.index.head')} />
            <div className="space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-7 h-7 text-blue-600" /> {t('rh.personnel.index.head')}
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">{t('rh.personnel.index.subtitle')}</p>
                    </div>
                    {canManage && (
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setAddOpen(true)}>
                            <Plus className="w-4 h-4" /> {t('rh.personnel.index.add')}
                        </Button>
                    )}
                </div>

                {ungradedCount > 0 && !ungradedActive && (
                    <button onClick={() => { setUngraded(true); apply({ ungraded: true }); }} className="w-full text-left rounded-xl bg-amber-50 ring-1 ring-amber-100 px-4 py-2.5 flex items-center gap-2 text-sm text-amber-800 hover:bg-amber-100 transition-colors">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> {t('rh.personnel.index.ungraded_banner', { count: ungradedCount })}
                    </button>
                )}

                {/* Filtres */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-56">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && apply()} placeholder={t('rh.personnel.index.search_ph')} className="pl-9" />
                    </div>
                    <select value={status} onChange={e => setStatus(e.target.value)} className={sel}>
                        <option value="">{t('rh.personnel.index.all_statuses')}</option>
                        <option value="active">{t('rh.personnel.index.status_active')}</option>
                        <option value="suspended">{t('rh.personnel.index.status_suspended')}</option>
                        <option value="terminated">{t('rh.personnel.index.status_terminated')}</option>
                    </select>
                    <select value={gradeId} onChange={e => setGradeId(e.target.value)} className={sel}>
                        <option value="">{t('rh.personnel.index.all_grades')}</option>
                        {salaryGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <button
                        type="button"
                        onClick={() => setUngraded(v => !v)}
                        className={`h-9 px-3 text-sm rounded-lg border transition-colors ${ungraded ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-600 hover:border-amber-400'}`}
                    >
                        {t('rh.personnel.index.ungraded')}
                    </button>
                    <Button onClick={() => apply()} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                        <Search className="w-4 h-4" /> {t('rh.personnel.index.search')}
                    </Button>
                    {(search || status || gradeId || ungraded) && (
                        <Button variant="outline" onClick={clear} className="border-gray-300 text-gray-700">{t('rh.personnel.index.reset')}</Button>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 gap-4 flex-wrap">
                        <p className="text-sm text-gray-600">{t('rh.personnel.index.count', { count: employees.total })}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{t('rh.personnel.index.per_page')}</span>
                            <select value={perPage} onChange={e => changePerPage(Number(e.target.value))} className="h-8 px-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>
                    {employees.data.length === 0 ? (
                        <div className="px-5 py-16 text-center text-gray-400">
                            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">{t('rh.personnel.index.empty')}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('rh.personnel.index.col_employee')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('rh.personnel.index.col_job')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-64">{t('rh.personnel.index.col_grade')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('rh.personnel.index.col_base')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('rh.personnel.index.col_status')}</th>
                                        <th className="px-4 py-3 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {employees.data.map(emp => {
                                        const badge = STATUS_BADGE[emp.status] ?? STATUS_BADGE.active;
                                        return (
                                            <tr key={emp.id} className="hover:bg-gray-50/50">
                                                <td className="px-5 py-3">
                                                    <p className="font-medium text-gray-900">{emp.name}</p>
                                                    <p className="text-xs text-gray-400">{emp.employee_number ?? '—'}</p>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{emp.job_title}</td>
                                                <td className="px-4 py-3">
                                                    {canManage ? (
                                                        <Select value={emp.salary_grade_id ?? 'none'} onValueChange={(v) => assignGrade(emp, v)}>
                                                            <SelectTrigger className="h-8"><SelectValue placeholder={t('rh.personnel.index.choose_grade')} /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none">{t('rh.personnel.index.off_grade_dash')}</SelectItem>
                                                                {salaryGrades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <span className="text-gray-600">{salaryGrades.find(g => g.id === emp.salary_grade_id)?.name ?? t('rh.personnel.index.off_grade')}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(emp.effective_base)}</td>
                                                <td className="px-4 py-3"><span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{t('rh.employee_status.' + emp.status)}</span></td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => router.get(route('users.show', emp.user_id))} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50" aria-label={t('rh.personnel.index.open_sheet')} title={t('rh.personnel.index.open_sheet_title')}>
                                                        <ExternalLink className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                        {employees.total > 0 && <p className="text-xs text-gray-400">{t('rh.personnel.index.range', { from: employees.from, to: employees.to, total: employees.total })}</p>}
                        {employees.last_page > 1 && (
                            <div className="flex items-center gap-1.5">
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={employees.current_page === 1} onClick={() => goToPage(employees.current_page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                                <span className="text-xs text-gray-500 px-2">{employees.current_page} / {employees.last_page}</span>
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={employees.current_page === employees.last_page} onClick={() => goToPage(employees.current_page + 1)}><ChevronRight className="w-4 h-4" /></Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal : ajouter au personnel */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent onOpenAutoFocus={e => e.preventDefault()}>
                    <DialogHeader><DialogTitle>{t('rh.personnel.index.modal_title')}</DialogTitle></DialogHeader>
                    <form onSubmit={submitAdd} className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">{t('rh.personnel.index.user')}</label>
                            {(() => {
                                const selectedUser = assignableUsers.find(u => u.id === addForm.data.user_id) ?? null;
                                const q = userQuery.trim().toLowerCase();
                                const filtered = q ? assignableUsers.filter(u => u.name.toLowerCase().includes(q)) : assignableUsers;
                                return (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            value={selectedUser ? selectedUser.name : userQuery}
                                            onChange={e => { setUserQuery(e.target.value); if (addForm.data.user_id) addForm.setData('user_id', ''); setUserOpen(true); }}
                                            onFocus={() => setUserOpen(true)}
                                            onBlur={() => setTimeout(() => setUserOpen(false), 150)}
                                            placeholder={t('rh.personnel.index.search_user_ph')}
                                            disabled={assignableUsers.length === 0}
                                            className={`pl-9 ${addForm.errors.user_id ? 'border-red-500' : ''}`}
                                        />
                                        {userOpen && assignableUsers.length > 0 && (
                                            <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg max-h-56 overflow-auto ring-1 ring-gray-100">
                                                {filtered.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">{t('rh.personnel.index.no_result')}</div>}
                                                {filtered.map(u => (
                                                    <button
                                                        type="button"
                                                        key={u.id}
                                                        onMouseDown={e => e.preventDefault()}
                                                        onClick={() => { addForm.setData('user_id', u.id); setUserQuery(''); setUserOpen(false); }}
                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${u.id === addForm.data.user_id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                                                    >
                                                        {u.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                            {addForm.errors.user_id && <p className="text-red-600 text-sm mt-1">{addForm.errors.user_id}</p>}
                            {assignableUsers.length === 0 && <p className="text-xs text-gray-400 mt-1">{t('rh.personnel.index.no_assignable')}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">{t('rh.personnel.index.job')}</label>
                                <Input value={addForm.data.job_title} onChange={e => addForm.setData('job_title', e.target.value)} placeholder={t('rh.personnel.index.job_ph')} className={addForm.errors.job_title ? 'border-red-500' : ''} />
                                {addForm.errors.job_title && <p className="text-red-600 text-sm mt-1">{addForm.errors.job_title}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">{t('rh.personnel.index.contract')}</label>
                                <Select value={addForm.data.contract_type} onValueChange={v => addForm.setData('contract_type', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{contractTypes.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">{t('rh.personnel.index.grade')}</label>
                                <Select value={addForm.data.salary_grade_id} onValueChange={v => addForm.setData('salary_grade_id', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t('rh.personnel.index.off_grade')}</SelectItem>
                                        {salaryGrades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">{t('rh.personnel.index.base')} {addForm.data.salary_grade_id !== 'none' ? t('rh.personnel.index.base_ignored') : ''}</label>
                                <Input type="number" min={0} value={addForm.data.base_salary} onChange={e => addForm.setData('base_salary', e.target.value)} disabled={addForm.data.salary_grade_id !== 'none'} placeholder={t('rh.personnel.index.base_ph')} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>{t('rh.personnel.index.cancel')}</Button>
                            <Button type="submit" disabled={addForm.processing || assignableUsers.length === 0} className="bg-blue-600 hover:bg-blue-700">{t('rh.personnel.index.add_btn')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
