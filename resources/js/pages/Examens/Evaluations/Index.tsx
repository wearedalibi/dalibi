import { Head, router } from '@inertiajs/react';
import { CheckCircle2, ClipboardList, ListChecks, Lock, LockOpen, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/icon-button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface EvalRow {
    id: string;
    status: 'scheduled' | 'completed';
    locked_at: string | null;
    date: string | null;
    marks_count: number;
    graded_count: number;
    template: {
        name: string;
        coefficient: number;
        max_score: number;
        academic_period: { name: string };
        evaluation_type: { name: string };
    };
    class_subject: {
        coefficient: number;
        class: { name: string; code: string };
        subject: { name: string };
    };
}

interface Option { id: string; name: string; code?: string }

interface Props {
    evaluations: { data: EvalRow[]; total: number; current_page: number; last_page: number };
    filters: {
        search: string; status: string; period_id: string; template_id: string;
        class_id: string; subject_id: string; evaluation_type_id: string; scheduling: string;
    };
    options: { classrooms: Option[]; subjects: Option[]; evaluationTypes: Option[]; periods: Option[] };
    canLock: boolean;
}

const ALL = 'all';

export default function Index({ evaluations, filters, options, canLock }: Readonly<Props>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [search, setSearch]   = useState(filters.search ?? '');
    const [status, setStatus]   = useState(filters.status || ALL);
    const [classId, setClassId] = useState(filters.class_id || ALL);
    const [subjectId, setSubjectId] = useState(filters.subject_id || ALL);
    const [evalTypeId, setEvalTypeId] = useState(filters.evaluation_type_id || ALL);
    const [periodId, setPeriodId] = useState(filters.period_id || ALL);
    const [scheduling, setScheduling] = useState(filters.scheduling || ALL);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const apply = (overrides: Record<string, string> = {}) => {
        const v = (key: string, fallback: string) => overrides[key] ?? fallback;
        const clean = (val: string) => (val === ALL ? '' : val);
        router.get(route('evaluations.index'), {
            search:             v('search', search),
            status:             clean(v('status', status)),
            class_id:           clean(v('class_id', classId)),
            subject_id:         clean(v('subject_id', subjectId)),
            evaluation_type_id: clean(v('evaluation_type_id', evalTypeId)),
            period_id:          clean(v('period_id', periodId)),
            scheduling:         clean(v('scheduling', scheduling)),
        }, { preserveScroll: true, replace: true });
    };

    const resetFilters = () => {
        setSearch(''); setStatus(ALL); setClassId(ALL); setSubjectId(ALL);
        setEvalTypeId(ALL); setPeriodId(ALL); setScheduling(ALL);
        router.get(route('evaluations.index'), {}, { preserveScroll: true, replace: true });
    };

    const activeFilterCount = [
        status, classId, subjectId, evalTypeId, periodId, scheduling,
    ].filter(v => v && v !== ALL).length + (search ? 1 : 0);

    const onDelete = (id: string) => {
        router.delete(route('evaluations.destroy', id), {
            preserveScroll: true,
            onSuccess: () => setDeleteId(null),
        });
    };

    const onToggleLock = (id: string) => {
        router.patch(route('evaluations.toggle-lock', id), {}, { preserveScroll: true });
    };

    const statusLabel = (s: string) => s === 'completed' ? t('examens.evaluations.index.completed') : t('examens.evaluations.index.scheduled');

    return (
        <AppLayout>
            <Head title={t('examens.evaluations.index.head')} />

            <div className="w-full space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><ClipboardList className="h-7 w-7 text-blue-600 shrink-0" />{t('examens.evaluations.index.title')}</h1>
                        <p className="mt-2 text-lg text-gray-600">
                            {t('examens.evaluations.index.subtitle')}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => router.get(route('evaluation-templates.index'))}
                    >
                        <ListChecks className="w-4 h-4" />
                        {t('examens.evaluations.index.manage_templates')}
                    </Button>
                </div>

                {/* Filtres */}
                <div className="rounded-2xl bg-slate-50/70 ring-1 ring-slate-200 shadow-sm p-4 space-y-3">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="relative flex-1 min-w-56">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && apply()}
                                placeholder={t('examens.evaluations.index.search_ph')}
                                className="pl-9"
                            />
                            {search && (
                                <button onClick={() => { setSearch(''); apply({ search: '' }); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <Select value={classId} onValueChange={v => { setClassId(v); apply({ class_id: v }); }}>
                            <SelectTrigger className="w-44"><SelectValue placeholder={t('examens.evaluations.index.class')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>{t('examens.evaluations.index.all_classes')}</SelectItem>
                                {options.classrooms.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={subjectId} onValueChange={v => { setSubjectId(v); apply({ subject_id: v }); }}>
                            <SelectTrigger className="w-44"><SelectValue placeholder={t('examens.evaluations.index.subject')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>{t('examens.evaluations.index.all_subjects')}</SelectItem>
                                {options.subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={evalTypeId} onValueChange={v => { setEvalTypeId(v); apply({ evaluation_type_id: v }); }}>
                            <SelectTrigger className="w-44"><SelectValue placeholder={t('examens.evaluations.index.type')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>{t('examens.evaluations.index.all_types')}</SelectItem>
                                {options.evaluationTypes.map(et => <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {options.periods.length > 0 && (
                            <Select value={periodId} onValueChange={v => { setPeriodId(v); apply({ period_id: v }); }}>
                                <SelectTrigger className="w-40"><SelectValue placeholder={t('examens.evaluations.index.period')} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>{t('examens.evaluations.index.all_periods')}</SelectItem>
                                    {options.periods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}

                        <Select value={status} onValueChange={v => { setStatus(v); apply({ status: v }); }}>
                            <SelectTrigger className="w-40"><SelectValue placeholder={t('examens.evaluations.index.status')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>{t('examens.evaluations.index.all_statuses')}</SelectItem>
                                <SelectItem value="scheduled">{t('examens.evaluations.index.scheduled')}</SelectItem>
                                <SelectItem value="completed">{t('examens.evaluations.index.completed')}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={scheduling} onValueChange={v => { setScheduling(v); apply({ scheduling: v }); }}>
                            <SelectTrigger className="w-40"><SelectValue placeholder={t('examens.evaluations.index.scheduling')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>{t('examens.evaluations.index.all')}</SelectItem>
                                <SelectItem value="with">{t('examens.evaluations.index.with_date')}</SelectItem>
                                <SelectItem value="without">{t('examens.evaluations.index.without_date')}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button onClick={() => apply()} className="bg-blue-600 hover:bg-blue-700">{t('examens.evaluations.index.filter')}</Button>
                    </div>

                    {activeFilterCount > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{t('examens.evaluations.index.active_filters', { count: activeFilterCount })}</span>
                            <button onClick={resetFilters} className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
                                <X className="w-3 h-3" /> {t('examens.evaluations.index.reset')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead>{t('examens.evaluations.index.col_template')}</TableHead>
                                <TableHead>{t('examens.evaluations.index.col_class')}</TableHead>
                                <TableHead>{t('examens.evaluations.index.col_subject')}</TableHead>
                                <TableHead>{t('examens.evaluations.index.col_period')}</TableHead>
                                <TableHead className="text-center">{t('examens.evaluations.index.col_coeff')}</TableHead>
                                <TableHead>{t('examens.evaluations.index.col_date')}</TableHead>
                                <TableHead>{t('examens.evaluations.index.col_status')}</TableHead>
                                <TableHead className="text-center">{t('examens.evaluations.index.col_progress')}</TableHead>
                                <TableHead className="text-center w-36">{t('examens.evaluations.index.col_actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {evaluations.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="py-16 text-center text-gray-400">
                                        <ListChecks className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        {t('examens.evaluations.index.empty')}
                                    </TableCell>
                                </TableRow>
                            ) : evaluations.data.map(ev => {
                                const pct      = ev.marks_count > 0 ? Math.round((ev.graded_count / ev.marks_count) * 100) : 0;
                                const isLocked = !!ev.locked_at;
                                return (
                                    <TableRow key={ev.id} className={`transition-colors ${isLocked ? 'bg-red-50/30' : 'hover:bg-blue-50/20'}`}>
                                        <TableCell className="font-semibold text-gray-900">
                                            {ev.template?.name}
                                            {isLocked && (
                                                <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-600">
                                                    <Lock className="w-3 h-3" /> {t('examens.evaluations.index.locked')}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-gray-700">
                                            {ev.class_subject?.class?.name}
                                            <span className="ml-1 text-xs text-gray-400">({ev.class_subject?.class?.code})</span>
                                        </TableCell>
                                        <TableCell className="text-gray-600">{ev.class_subject?.subject?.name}</TableCell>
                                        <TableCell className="text-gray-500 text-sm">{ev.template?.academic_period?.name}</TableCell>
                                        <TableCell className="text-center font-mono text-gray-600">
                                            {Number(ev.template?.coefficient).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-sm">
                                            {ev.date ? new Date(ev.date).toLocaleDateString(dateLocale) : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                ev.status === 'completed'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {ev.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                                                {statusLabel(ev.status)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-16">
                                                    <div
                                                        className={`h-1.5 rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-400 whitespace-nowrap">{ev.graded_count}/{ev.marks_count}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-center gap-1.5">
                                                <Button
                                                    variant="outline" size="sm" className="gap-1 text-xs"
                                                    onClick={() => router.get(route('marks.index', ev.id))}
                                                >
                                                    <ClipboardList className="w-3.5 h-3.5" /> {t('examens.evaluations.index.marks')}
                                                </Button>
                                                {canLock && (
                                                    <IconButton
                                                        label={isLocked ? t('examens.evaluations.index.unlock') : t('examens.evaluations.index.lock')}
                                                        icon={isLocked ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
                                                        className={isLocked
                                                            ? 'border-red-200 text-red-500 hover:bg-red-50'
                                                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                                                        }
                                                        onClick={() => onToggleLock(ev.id)}
                                                    />
                                                )}
                                                <IconButton
                                                    label={t('common.actions.delete')}
                                                    icon={<Trash2 className="w-3.5 h-3.5" />}
                                                    className="border-red-200 text-red-500 hover:bg-red-50"
                                                    onClick={() => setDeleteId(ev.id)}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                <p className="text-sm text-gray-400 text-right">{t('examens.evaluations.index.total', { count: evaluations.total })}</p>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('examens.evaluations.index.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('examens.evaluations.index.delete_desc')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('common.actions.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && onDelete(deleteId)}>
                            {t('common.actions.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
