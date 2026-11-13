import { Head, router } from '@inertiajs/react';
import { CheckCircle2, Download, GraduationCap, Search, Settings2, Users, X, XCircle, ListChecks } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Year { id: string; year: string; active: boolean; }
interface Classroom { id: string; name: string; code: string; }
interface Row {
    id: string;
    student_id: string;
    student_name: string;
    matricule: string | null;
    gender: string | null;
    payment_status: string;
    academic_status: string;
    status_reason: string | null;
}

interface Props {
    years: Year[];
    classrooms: Classroom[];
    enrollments: Row[];
    stats: Record<string, number>;
    statuses: Record<string, string>;
    filters: { academic_year_id: string; class_id: string; academic_status: string; search: string };
    canManage: boolean;
}

const STATUS_STYLE: Record<string, string> = {
    en_cours:   'bg-blue-100 text-blue-700',
    valide:     'bg-emerald-100 text-emerald-700',
    non_valide: 'bg-amber-100 text-amber-700',
    abandon:    'bg-red-100 text-red-700',
    transfere:  'bg-gray-100 text-gray-600',
};

const ALL = 'all';

export default function Index({ years, classrooms, enrollments, stats, statuses, filters, canManage }: Readonly<Props>) {
    const { t } = useTranslation();
    const [yearId, setYearId]   = useState(filters.academic_year_id || '');
    const [classId, setClassId] = useState(filters.class_id || '');
    const [statusF, setStatusF] = useState(filters.academic_status || ALL);
    const [search, setSearch]   = useState(filters.search || '');
    const [selected, setSelected] = useState<string[]>([]);
    const [dialog, setDialog] = useState<{ row: Row } | null>(null);
    const [newStatus, setNewStatus] = useState('en_cours');
    const [reason, setReason] = useState('');

    const apply = (overrides: Record<string, string> = {}) => {
        router.get(route('roster.index'), {
            academic_year_id: overrides.academic_year_id ?? yearId,
            class_id:         overrides.class_id ?? classId,
            academic_status:  (overrides.academic_status ?? statusF) === ALL ? '' : (overrides.academic_status ?? statusF),
            search:           overrides.search ?? search,
        }, { preserveScroll: true, replace: true });
        setSelected([]);
    };

    const openDialog = (row: Row) => {
        setDialog({ row });
        setNewStatus(row.academic_status);
        setReason(row.status_reason ?? '');
    };

    const saveStatus = () => {
        if (!dialog) return;
        router.patch(route('roster.update-status', dialog.row.id), {
            academic_status: newStatus,
            status_reason: reason || null,
        }, { preserveScroll: true, onSuccess: () => setDialog(null) });
    };

    const bulkApply = (status: string) => {
        if (selected.length === 0) return;
        router.post(route('roster.bulk-status'), { enrollment_ids: selected, academic_status: status }, {
            preserveScroll: true,
            onSuccess: () => setSelected([]),
        });
    };

    const toggle = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    const toggleAll = () => setSelected(selected.length === enrollments.length ? [] : enrollments.map(e => e.id));

    const ready = yearId && classId;

    const statCards = [
        { label: t('roster.stat.enrolled'), value: stats.total ?? 0, color: 'text-gray-700', icon: Users },
        { label: t('roster.stat.en_cours'), value: stats.en_cours ?? 0, color: 'text-blue-600', icon: GraduationCap },
        { label: t('roster.stat.valide'), value: stats.valide ?? 0, color: 'text-emerald-600', icon: CheckCircle2 },
        { label: t('roster.stat.non_valide'), value: stats.non_valide ?? 0, color: 'text-amber-600', icon: XCircle },
        { label: t('roster.stat.abandon'), value: stats.abandon ?? 0, color: 'text-red-600', icon: XCircle },
    ];

    return (
        <AppLayout>
            <Head title={t('roster.title')} />
            <div className="w-full space-y-6">

                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><ListChecks className="h-7 w-7 text-blue-600 shrink-0" />{t('roster.title')}</h1>
                        <p className="mt-2 text-gray-500">{t('roster.subtitle')}</p>
                    </div>
                    {ready && (
                        <Button
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => {
                                const params = new URLSearchParams({ academic_year_id: yearId, class_id: classId });
                                if (statusF !== ALL) params.set('academic_status', statusF);
                                window.open(`${route('roster.export')}?${params.toString()}`, '_blank');
                            }}
                        >
                            <Download className="w-4 h-4" /> {t('roster.export_pdf')}
                        </Button>
                    )}
                </div>

                {/* Filtres */}
                <div className="rounded-2xl bg-slate-50/70 ring-1 ring-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
                    <div className="min-w-44">
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('roster.year')}</label>
                        <Select value={yearId} onValueChange={v => { setYearId(v); apply({ academic_year_id: v }); }}>
                            <SelectTrigger><SelectValue placeholder={t('roster.choose')} /></SelectTrigger>
                            <SelectContent>
                                {years.map(y => <SelectItem key={y.id} value={y.id}>{y.year}{y.active ? ` (${t('roster.active')})` : ''}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="min-w-44">
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('roster.class')}</label>
                        <Select value={classId || 'none'} onValueChange={v => { const val = v === 'none' ? '' : v; setClassId(val); apply({ class_id: val }); }}>
                            <SelectTrigger><SelectValue placeholder={t('roster.choose_class')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none" disabled>{t('roster.choose_class')}</SelectItem>
                                {classrooms.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {ready && (
                        <>
                            <div className="min-w-40">
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('roster.status')}</label>
                                <Select value={statusF} onValueChange={v => { setStatusF(v); apply({ academic_status: v }); }}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>{t('roster.all')}</SelectItem>
                                        {Object.entries(statuses).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="relative flex-1 min-w-48">
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('roster.search')}</label>
                                <Search className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
                                <Input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && apply()} placeholder={t('roster.search_ph')} className="pl-9" />
                            </div>
                        </>
                    )}
                </div>

                {!ready ? (
                    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 py-20 text-center text-gray-400">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-lg font-medium">{t('roster.select_prompt')}</p>
                    </div>
                ) : (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            {statCards.map(c => {
                                const Icon = c.icon;
                                return (
                                    <div key={c.label} className="bg-gray-50 ring-1 ring-gray-100 rounded-2xl p-4 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-gray-500">{c.label}</p>
                                                <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                                            </div>
                                            <Icon className={`w-7 h-7 ${c.color} opacity-25`} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Barre actions groupées */}
                        {canManage && selected.length > 0 && (
                            <div className="flex items-center gap-3 bg-blue-50 ring-1 ring-blue-100 rounded-2xl px-5 py-3">
                                <span className="text-sm font-medium text-blue-800">{t('roster.selected', { count: selected.length })}</span>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={() => bulkApply('valide')}>
                                    <CheckCircle2 className="w-4 h-4" /> {t('roster.validate')}
                                </Button>
                                <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 gap-1" onClick={() => bulkApply('non_valide')}>
                                    <XCircle className="w-4 h-4" /> {t('roster.invalidate')}
                                </Button>
                                <button onClick={() => setSelected([])} className="ml-auto text-blue-500 hover:text-blue-700 text-sm">{t('common.actions.cancel')}</button>
                            </div>
                        )}

                        {/* Table */}
                        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        {canManage && (
                                            <TableHead className="w-10">
                                                <input type="checkbox" checked={selected.length > 0 && selected.length === enrollments.length} onChange={toggleAll} className="rounded" />
                                            </TableHead>
                                        )}
                                        <TableHead>{t('roster.col_student')}</TableHead>
                                        <TableHead>{t('roster.col_matricule')}</TableHead>
                                        <TableHead>{t('roster.col_payment')}</TableHead>
                                        <TableHead>{t('roster.col_schooling')}</TableHead>
                                        {canManage && <TableHead className="text-center w-24">{t('roster.col_action')}</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {enrollments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={canManage ? 6 : 4} className="py-12 text-center text-gray-400">
                                                {t('roster.empty')}
                                            </TableCell>
                                        </TableRow>
                                    ) : enrollments.map(e => (
                                        <TableRow key={e.id} className="hover:bg-gray-50">
                                            {canManage && (
                                                <TableCell>
                                                    <input type="checkbox" checked={selected.includes(e.id)} onChange={() => toggle(e.id)} className="rounded" />
                                                </TableCell>
                                            )}
                                            <TableCell className="font-medium text-gray-900">{e.student_name}</TableCell>
                                            <TableCell className="font-mono text-xs text-gray-500">{e.matricule}</TableCell>
                                            <TableCell>
                                                {(() => {
                                                    const map: Record<string, { label: string; cls: string }> = {
                                                        PAID:           { label: t('roster.pay.PAID'),    cls: 'bg-emerald-100 text-emerald-700' },
                                                        PARTIALLY_PAID: { label: t('roster.pay.PARTIALLY_PAID'), cls: 'bg-amber-100 text-amber-700' },
                                                        ISSUED:         { label: t('roster.pay.ISSUED'),  cls: 'bg-red-100 text-red-700' },
                                                        NONE:           { label: t('roster.pay.NONE'), cls: 'bg-gray-100 text-gray-500' },
                                                    };
                                                    const p = map[e.payment_status] ?? map.NONE;
                                                    return <span className={`text-xs px-2 py-0.5 rounded-full ${p.cls}`}>{p.label}</span>;
                                                })()}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[e.academic_status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                    {statuses[e.academic_status] ?? e.academic_status}
                                                </span>
                                                {e.status_reason && <span className="block text-xs text-gray-400 mt-0.5 italic">{e.status_reason}</span>}
                                            </TableCell>
                                            {canManage && (
                                                <TableCell className="text-center">
                                                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openDialog(e)}>
                                                        <Settings2 className="w-3.5 h-3.5" /> {t('roster.status_btn')}
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </div>

            {/* Dialog changement de statut */}
            <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('roster.dialog.title')}</DialogTitle>
                        <DialogDescription>{dialog?.row.student_name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">{t('roster.dialog.status')}</label>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(statuses).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {(newStatus === 'abandon' || newStatus === 'transfere') && (
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">{t('roster.dialog.reason')}</label>
                                <Input value={reason} onChange={e => setReason(e.target.value)} placeholder={t('roster.dialog.reason_ph')} />
                            </div>
                        )}
                        {newStatus === 'abandon' && (
                            <p className="text-xs text-red-500">{t('roster.dialog.abandon_warning')}</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setDialog(null)}>{t('common.actions.cancel')}</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={saveStatus}>{t('common.actions.save')}</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
