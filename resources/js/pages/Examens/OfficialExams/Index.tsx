import { Head, router, useForm } from '@inertiajs/react';
import { Award, CalendarDays, Eye, GraduationCap, MapPin, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/icon-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Exam {
    id: string; type: string; type_label: string; name: string; year: number;
    session: string; exam_date: string | null; center: string | null; status: string;
    class_id: string | null; class_name: string | null;
    total: number; admis: number;
}
interface Year { id: string; year: string; active: boolean; }
interface Classroom { id: string; name: string; }

interface Props {
    exams: Exam[];
    years: Year[];
    activeYear: { id: string; year: string } | null;
    classrooms: Classroom[];
    types: Record<string, string>;
    sessions: Record<string, string>;
    statuses: Record<string, string>;
    filters: { academic_year_id: string; type: string; session: string; status: string; search: string };
}

const ALL = 'all';
const STATUS_STYLE: Record<string, string> = {
    ouvert: 'bg-emerald-100 text-emerald-700', clos: 'bg-amber-100 text-amber-700', termine: 'bg-gray-100 text-gray-600',
};

export default function Index({ exams, years, activeYear, classrooms, types, sessions, statuses, filters }: Readonly<Props>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [createOpen, setCreateOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [yearId, setYearId]   = useState(filters.academic_year_id || (activeYear?.id ?? ''));
    const [type, setType]       = useState(filters.type || ALL);
    const [session, setSession] = useState(filters.session || ALL);
    const [status, setStatus]   = useState(filters.status || ALL);
    const [search, setSearch]   = useState(filters.search || '');

    const apply = (ov: Record<string, string> = {}) => {
        const clean = (v: string) => (v === ALL ? '' : v);
        router.get(route('official-exams.index'), {
            academic_year_id: ov.academic_year_id ?? yearId,
            type:    clean(ov.type ?? type),
            session: clean(ov.session ?? session),
            status:  clean(ov.status ?? status),
            search:  ov.search ?? search,
        }, { preserveScroll: true, replace: true });
    };

    const resetFilters = () => {
        setType(ALL); setSession(ALL); setStatus(ALL); setSearch('');
        router.get(route('official-exams.index'), { academic_year_id: yearId }, { preserveScroll: true, replace: true });
    };

    const { data, setData, post, processing, errors, reset } = useForm({
        type: 'bepc', name: '', year: new Date().getFullYear(), session: 'normale', class_id: '', exam_date: '', center: '', status: 'ouvert',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('official-exams.store'), { onSuccess: () => { setCreateOpen(false); reset(); } });
    };

    const activeFilters = [type, session, status].filter(v => v !== ALL).length + (search ? 1 : 0);

    return (
        <AppLayout>
            <Head title={t('examens.official.index.head')} />
            <div className="w-full space-y-6">

                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><GraduationCap className="h-7 w-7 text-blue-600 shrink-0" />{t('examens.official.index.head')}</h1>
                        <p className="mt-2 text-gray-500">{t('examens.official.index.subtitle', { year: activeYear?.year ?? '—' })}</p>
                    </div>
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setCreateOpen(true)}>
                        <Plus className="w-4 h-4" /> {t('examens.official.index.new')}
                    </Button>
                </div>

                {/* Filtres */}
                <div className="rounded-2xl bg-slate-50/70 ring-1 ring-slate-200 shadow-sm p-4 space-y-3">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="min-w-44">
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('examens.official.index.year')}</label>
                            <Select value={yearId} onValueChange={v => { setYearId(v); apply({ academic_year_id: v }); }}>
                                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {years.map(y => <SelectItem key={y.id} value={y.id}>{y.year}{y.active ? ` (${t('examens.official.index.active_suffix')})` : ''}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="relative flex-1 min-w-48">
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('examens.official.index.search')}</label>
                            <Search className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
                            <Input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && apply()} placeholder={t('examens.official.index.search_ph')} className="pl-9 bg-white" />
                        </div>
                        <div className="min-w-36">
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('examens.official.index.type')}</label>
                            <Select value={type} onValueChange={v => { setType(v); apply({ type: v }); }}>
                                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>{t('examens.official.index.all')}</SelectItem>
                                    {Object.keys(types).map(k => <SelectItem key={k} value={k}>{k.toUpperCase()}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="min-w-36">
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('examens.official.index.session')}</label>
                            <Select value={session} onValueChange={v => { setSession(v); apply({ session: v }); }}>
                                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>{t('examens.official.index.all_sessions')}</SelectItem>
                                    {Object.entries(sessions).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="min-w-36">
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('examens.official.index.status')}</label>
                            <Select value={status} onValueChange={v => { setStatus(v); apply({ status: v }); }}>
                                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>{t('examens.official.index.all_statuses')}</SelectItem>
                                    {Object.entries(statuses).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {activeFilters > 0 && (
                        <button onClick={resetFilters} className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
                            <X className="w-3 h-3" /> {t('examens.official.index.reset', { count: activeFilters })}
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead>{t('examens.official.index.col_type')}</TableHead>
                                <TableHead>{t('examens.official.index.col_exam')}</TableHead>
                                <TableHead>{t('examens.official.index.col_class')}</TableHead>
                                <TableHead>{t('examens.official.index.col_session')}</TableHead>
                                <TableHead>{t('examens.official.index.col_date')}</TableHead>
                                <TableHead>{t('examens.official.index.col_center')}</TableHead>
                                <TableHead className="text-center">{t('examens.official.index.col_registered')}</TableHead>
                                <TableHead className="text-center">{t('examens.official.index.col_admitted')}</TableHead>
                                <TableHead>{t('examens.official.index.col_status')}</TableHead>
                                <TableHead className="text-center w-28">{t('examens.official.index.col_actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {exams.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="py-16 text-center text-gray-400">
                                        <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        {t('examens.official.index.empty')}
                                    </TableCell>
                                </TableRow>
                            ) : exams.map(exam => (
                                <TableRow key={exam.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.get(route('official-exams.show', exam.id))}>
                                    <TableCell><span className="text-xs font-bold uppercase text-blue-600">{exam.type}</span></TableCell>
                                    <TableCell className="font-medium text-gray-900">{exam.name}</TableCell>
                                    <TableCell className="text-sm text-gray-600">{exam.class_name ?? '—'}</TableCell>
                                    <TableCell className="text-sm text-gray-600">{sessions[exam.session]}</TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                        {exam.exam_date ? <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 text-gray-400" />{new Date(exam.exam_date).toLocaleDateString(dateLocale)}</span> : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                        {exam.center ? <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400" />{exam.center}</span> : '—'}
                                    </TableCell>
                                    <TableCell className="text-center text-sm"><span className="inline-flex items-center gap-1 text-gray-600"><Users className="w-3.5 h-3.5 text-gray-400" />{exam.total}</span></TableCell>
                                    <TableCell className="text-center text-sm"><span className="inline-flex items-center gap-1 text-emerald-600"><Award className="w-3.5 h-3.5" />{exam.admis}</span></TableCell>
                                    <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[exam.status]}`}>{statuses[exam.status]}</span></TableCell>
                                    <TableCell onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-center gap-1.5">
                                            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => router.get(route('official-exams.show', exam.id))}>
                                                <Eye className="w-3.5 h-3.5" /> {t('examens.official.index.manage')}
                                            </Button>
                                            <IconButton label={t('common.actions.delete')} icon={<Trash2 className="w-3.5 h-3.5" />} className="border-red-200 text-red-500 hover:bg-red-50" onClick={() => setDeleteId(exam.id)} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <p className="text-sm text-gray-400 text-right">{t('examens.official.index.total', { count: exams.length })}</p>
            </div>

            {/* Dialog création */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{t('examens.official.index.create_title')}</DialogTitle></DialogHeader>
                    <form onSubmit={submit} className="space-y-4 py-2">
                        <p className="text-xs text-gray-400">{t('examens.official.index.attached', { suffix: activeYear ? ` (${activeYear.year})` : '' })}</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">{t('examens.official.index.form_type')}</label>
                                <Select value={data.type} onValueChange={v => setData('type', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{Object.keys(types).map(k => <SelectItem key={k} value={k}>{k.toUpperCase()}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">{t('examens.official.index.form_year')}</label>
                                <Input type="number" value={data.year} onChange={e => setData('year', Number(e.target.value))} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">{t('examens.official.index.form_name')}</label>
                            <Input value={data.name} onChange={e => setData('name', e.target.value)} placeholder={t('examens.official.index.name_ph')} className={errors.name ? 'border-red-400' : ''} />
                            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">{t('examens.official.index.form_session')}</label>
                                <Select value={data.session} onValueChange={v => setData('session', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{Object.entries(sessions).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">{t('examens.official.index.form_date')}</label>
                                <Input type="date" value={data.exam_date} onChange={e => setData('exam_date', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">{t('examens.official.index.form_class')}</label>
                                <Select value={data.class_id} onValueChange={v => setData('class_id', v)}>
                                    <SelectTrigger className={errors.class_id ? 'border-red-400' : ''}><SelectValue placeholder={t('examens.official.index.choose_class')} /></SelectTrigger>
                                    <SelectContent>
                                        {classrooms.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {errors.class_id && <p className="text-xs text-red-500">{errors.class_id}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">{t('examens.official.index.form_center')}</label>
                                <Input value={data.center} onChange={e => setData('center', e.target.value)} placeholder={t('examens.official.index.center_ph')} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t('common.actions.cancel')}</Button>
                            <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700">{t('common.actions.create')}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('examens.official.index.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('examens.official.index.delete_desc')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('common.actions.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && router.delete(route('official-exams.destroy', deleteId), { onSuccess: () => setDeleteId(null) })}>
                            {t('common.actions.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
