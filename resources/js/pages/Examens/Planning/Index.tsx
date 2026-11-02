import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Calendar, CheckCircle2, Clock, ClipboardList, Download, ListChecks, Pencil, Trash2, X, CalendarRange } from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Classroom { id: string; name: string; code: string; }
interface Period    { id: string; name: string; }

interface EvalRow {
    id: string;
    status: 'scheduled' | 'completed';
    locked_at: string | null;
    date: string | null;
    start_time: string | null;
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
        subject: { name: string };
    };
}

interface Props {
    classrooms:  Classroom[];
    evaluations: EvalRow[];
    periods:     Period[];
    filters:     { classroomId: string; periodId: string };
    activeYear:  { year: string } | null;
}

export default function Index({ classrooms, evaluations, periods, filters, activeYear }: Readonly<Props>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [classroomId, setClassroomId] = useState(filters.classroomId ?? '');
    const [periodId, setPeriodId]       = useState(filters.periodId ?? '');
    const [editingId, setEditingId]     = useState<string | null>(null);
    const [editDate, setEditDate]       = useState('');
    const [editTime, setEditTime]       = useState('');
    const [deleteTarget, setDeleteTarget] = useState<EvalRow | null>(null);

    const apply = (overrides: Record<string, string> = {}) => {
        router.get(route('evaluations.planning'), {
            classroom_id: overrides.classroomId ?? classroomId,
            period_id:    overrides.periodId    ?? periodId,
        }, { preserveScroll: true, replace: true });
    };

    const onClassChange = (v: string) => {
        const val = v === 'all' ? '' : v;
        setClassroomId(val);
        setPeriodId('');
        apply({ classroomId: val, periodId: '' });
    };

    const onPeriodChange = (v: string) => {
        const val = v === 'all' ? '' : v;
        setPeriodId(val);
        apply({ periodId: val });
    };

    const startEdit = (ev: EvalRow) => {
        setEditingId(ev.id);
        setEditDate(ev.date ? ev.date.substring(0, 10) : '');
        setEditTime(ev.start_time ? ev.start_time.substring(0, 5) : '');
    };

    const cancelEdit = () => { setEditingId(null); setEditDate(''); setEditTime(''); };

    const saveDate = (id: string) => {
        router.patch(route('evaluations.update-date', id), {
            date: editDate || null,
            start_time: editDate && editTime ? editTime : null,
        }, {
            preserveScroll: true,
            onSuccess: () => cancelEdit(),
        });
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('evaluations.destroy', deleteTarget.id), {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const exportUrl = () => {
        const url = route('evaluations.export-planning', classroomId);
        return periodId ? `${url}?period_id=${periodId}` : url;
    };

    const selectedClassroom = classrooms.find(c => c.id === classroomId);

    const noDateCount = evaluations.filter(ev => !ev.date).length;

    return (
        <AppLayout>
            <Head title={t('examens.planning.head')} />

            <div className="w-full space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><CalendarRange className="h-7 w-7 text-blue-600 shrink-0" />{t('examens.planning.title')}</h1>
                        <p className="mt-2 text-lg text-gray-600">
                            {t('examens.planning.subtitle')}
                        </p>
                    </div>
                    {classroomId && (
                        <Button
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => window.open(exportUrl(), '_blank')}
                        >
                            <Download className="w-4 h-4" />
                            {t('examens.planning.export')}
                        </Button>
                    )}
                </div>

                {/* Filtres */}
                <div className="rounded-2xl bg-slate-50/70 ring-1 ring-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-56">
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('examens.planning.class')}</label>
                        <Select value={classroomId || 'all'} onValueChange={onClassChange}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('examens.planning.select_class')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('examens.planning.all_classes')}</SelectItem>
                                {classrooms.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name} ({c.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {periods.length > 0 && (
                        <div className="min-w-48">
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('examens.planning.period')}</label>
                            <Select value={periodId || 'all'} onValueChange={onPeriodChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('examens.planning.all_periods')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('examens.planning.all_periods')}</SelectItem>
                                    {periods.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                {/* Alerte dates manquantes */}
                {classroomId && noDateCount > 0 && (
                    <div className="flex items-center gap-3 bg-amber-50 ring-1 ring-amber-200 rounded-2xl px-5 py-4">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <p className="text-sm text-amber-800 font-medium">
                            {t('examens.planning.no_date_alert_1', { count: noDateCount })} <Pencil className="inline w-3 h-3" /> {t('examens.planning.no_date_alert_2')}
                        </p>
                    </div>
                )}

                {/* Table */}
                {!classroomId ? (
                    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 py-20 text-center text-gray-400">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-lg font-medium">{t('examens.planning.select_prompt')}</p>
                        {classrooms.length === 0 && (
                            <p className="mt-2 text-sm">{t('examens.planning.no_classes')}</p>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                <ListChecks className="w-5 h-5 text-blue-500" />
                                {selectedClassroom ? `${selectedClassroom.name} (${selectedClassroom.code})` : ''}
                                <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                                    {t('examens.planning.count', { count: evaluations.length })}
                                </span>
                            </h2>
                            <span className="text-xs text-gray-400">{activeYear?.year}</span>
                        </div>

                        {evaluations.length === 0 ? (
                            <div className="py-16 text-center text-gray-400">
                                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p>{t('examens.planning.empty_base')}{periodId ? t('examens.planning.and_period') : ''}.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead>{t('examens.planning.col_subject')}</TableHead>
                                        <TableHead>{t('examens.planning.col_template')}</TableHead>
                                        <TableHead>{t('examens.planning.col_period')}</TableHead>
                                        <TableHead>{t('examens.planning.col_type')}</TableHead>
                                        <TableHead className="text-center">{t('examens.planning.col_coeff')}</TableHead>
                                        <TableHead className="w-64">{t('examens.planning.col_datetime')}</TableHead>
                                        <TableHead>{t('examens.planning.col_status')}</TableHead>
                                        <TableHead className="text-center">{t('examens.planning.col_progress')}</TableHead>
                                        <TableHead className="text-center w-24">{t('examens.planning.col_actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {evaluations.map(ev => {
                                        const pct      = ev.marks_count > 0 ? Math.round((ev.graded_count / ev.marks_count) * 100) : 0;
                                        const isEditing = editingId === ev.id;
                                        return (
                                            <TableRow
                                                key={ev.id}
                                                className={`transition-colors ${!ev.date ? 'bg-amber-50/30' : 'hover:bg-blue-50/20'}`}
                                            >
                                                <TableCell className="font-medium text-gray-900">
                                                    {ev.class_subject.subject.name}
                                                </TableCell>
                                                <TableCell className="text-gray-700 text-sm">{ev.template.name}</TableCell>
                                                <TableCell className="text-gray-500 text-sm">{ev.template.academic_period.name}</TableCell>
                                                <TableCell className="text-gray-500 text-sm">{ev.template.evaluation_type.name}</TableCell>
                                                <TableCell className="text-center font-mono text-sm">
                                                    {Number(ev.template.coefficient).toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <Input
                                                                type="date"
                                                                value={editDate}
                                                                onChange={e => setEditDate(e.target.value)}
                                                                className="h-7 text-xs w-32"
                                                                autoFocus
                                                            />
                                                            <Input
                                                                type="time"
                                                                value={editTime}
                                                                onChange={e => setEditTime(e.target.value)}
                                                                disabled={!editDate}
                                                                className="h-7 text-xs w-24"
                                                                title={editDate ? t('examens.planning.time') : t('examens.planning.date_first')}
                                                            />
                                                            <button
                                                                onClick={() => saveDate(ev.id)}
                                                                className="text-emerald-600 hover:text-emerald-700"
                                                                title={t('examens.planning.validate')}
                                                            >
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={cancelEdit}
                                                                className="text-gray-400 hover:text-gray-600"
                                                                title={t('common.actions.cancel')}
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => startEdit(ev)}
                                                            className={`flex items-center gap-2 group text-sm ${
                                                                ev.date ? 'text-gray-700' : 'text-amber-500'
                                                            }`}
                                                        >
                                                            {ev.date ? (
                                                                <span className="flex items-center gap-2">
                                                                    <span className="inline-flex items-center gap-1">
                                                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                                        {new Date(ev.date).toLocaleDateString(dateLocale)}
                                                                    </span>
                                                                    {ev.start_time && (
                                                                        <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                                                                            <Clock className="w-3.5 h-3.5" />
                                                                            {ev.start_time.substring(0, 5)}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            ) : (
                                                                <span className="italic text-xs">{t('examens.planning.not_scheduled')}</span>
                                                            )}
                                                            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                                                        </button>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        ev.status === 'completed'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {ev.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                                                        {ev.status === 'completed' ? t('examens.planning.status_completed') : t('examens.planning.status_scheduled')}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-14">
                                                            <div
                                                                className={`h-1.5 rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-400 whitespace-nowrap">{ev.graded_count}/{ev.marks_count}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => startEdit(ev)}
                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                                            title={t('examens.planning.edit_reschedule')}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteTarget(ev)}
                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                                                            title={t('common.actions.delete')}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                )}
            </div>

            {/* Confirmation de suppression */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('examens.planning.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget && (
                                <>
                                    {t('examens.planning.delete_desc_1', { template: deleteTarget.template.name, subject: deleteTarget.class_subject.subject.name })}
                                    {deleteTarget.marks_count > 0 && (
                                        <span className="block mt-2 text-red-600 font-medium">
                                            ⚠ {t('examens.planning.delete_desc_warn', { count: deleteTarget.graded_count })}
                                        </span>
                                    )}
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('common.actions.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>
                            {t('common.actions.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
