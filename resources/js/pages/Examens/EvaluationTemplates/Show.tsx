import { Head, router } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, BookOpen, Calendar, CheckCircle2, ClipboardList, Layers, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface ClassSubject {
    id: string;
    coefficient: number;
    class: { id: string; name: string; code: string };
    subject: { id: string; name: string };
}

interface EvalRow {
    id: string;
    status: 'scheduled' | 'completed';
    date: string | null;
    marks_count: number;
    graded_count: number;
    class_subject: ClassSubject;
}

interface Template {
    id: string;
    name: string;
    coefficient: number;
    max_score: number;
    date: string | null;
    description: string | null;
    academic_period: { name: string };
    evaluation_type: { name: string };
}

interface Props {
    template: Template;
    evaluations: EvalRow[];
    availableClassSubjects: ClassSubject[];
    activeYear: { id: string } | null;
}

export default function Show({ template, evaluations, availableClassSubjects, activeYear }: Readonly<Props>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [selected, setSelected]         = useState<string[]>([]);
    const [dates, setDates]               = useState<Record<string, string>>({});
    const [generating, setGenerating]     = useState(false);
    const [deleteId, setDeleteId]         = useState<string | null>(null);
    const [showSelector, setShowSelector] = useState(false);

    const defaultDate = template.date ? template.date.substring(0, 10) : '';

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (!dates[id]) setDates(d => ({ ...d, [id]: defaultDate }));
            return [...prev, id];
        });
    };

    const selectAll = () => {
        if (selected.length === availableClassSubjects.length) {
            setSelected([]);
        } else {
            const allIds = availableClassSubjects.map(cs => cs.id);
            setSelected(allIds);
            const init: Record<string, string> = {};
            allIds.forEach(id => { if (!dates[id]) init[id] = defaultDate; });
            setDates(d => ({ ...d, ...init }));
        }
    };

    const handleGenerate = () => {
        if (selected.length === 0) return;
        setGenerating(true);
        const payload = selected.map(id => ({ id, date: dates[id] || null }));
        router.post(
            route('evaluation-templates.generate', template.id),
            { class_subjects: payload },
            {
                preserveScroll: true,
                onSuccess: () => { setGenerating(false); setSelected([]); setDates({}); setShowSelector(false); },
                onError:   () => setGenerating(false),
            },
        );
    };

    const onDeleteEval = (id: string) => {
        router.delete(route('evaluations.destroy', id), {
            preserveScroll: true,
            onSuccess: () => setDeleteId(null),
        });
    };

    const statusLabel = (s: string) => s === 'completed' ? t('examens.templates.show.status_completed') : t('examens.templates.show.status_scheduled');

    return (
        <AppLayout>
            <Head title={t('examens.templates.show.head', { name: template.name })} />

            <div className="w-full space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => router.get(route('evaluation-templates.index'))}>
                            <ArrowLeft className="w-4 h-4" /> {t('common.actions.back')}
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{template.name}</h1>
                            <p className="text-gray-500 mt-1">
                                {template.academic_period.name} · {template.evaluation_type.name}
                                · {t('examens.templates.index.col_coeff')} {Number(template.coefficient).toFixed(2)}
                                · /{Number(template.max_score).toFixed(0)}
                                {template.date && ` · ${new Date(template.date).toLocaleDateString(dateLocale)}`}
                            </p>
                            {template.description && <p className="text-sm text-gray-400 mt-1 italic">{template.description}</p>}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="gap-2" onClick={() => router.get(route('evaluation-templates.edit', template.id))}>
                            <Pencil className="w-4 h-4" /> {t('common.actions.edit')}
                        </Button>
                        <Button
                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                            onClick={() => setShowSelector(v => !v)}
                            disabled={availableClassSubjects.length === 0}
                        >
                            <Plus className="w-4 h-4" />
                            {t('examens.templates.show.deploy')}
                            {availableClassSubjects.length > 0 && (
                                <span className="ml-1 bg-white/20 rounded px-1.5 text-xs">{availableClassSubjects.length}</span>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Messages de diagnostic quand le déploiement est impossible */}
                {!activeYear && (
                    <div className="bg-amber-50 ring-1 ring-amber-200 rounded-2xl p-4 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-amber-800">{t('examens.templates.show.no_active_year')}</p>
                            <p className="text-sm text-amber-600 mt-0.5">
                                {t('examens.templates.show.no_active_year_hint')}{' '}
                                <button onClick={() => router.get(route('academic-years.index'))} className="underline font-medium">
                                    {t('examens.templates.show.manage_years')}
                                </button>
                            </p>
                        </div>
                    </div>
                )}
                {activeYear && availableClassSubjects.length === 0 && evaluations.length === 0 && (
                    <div className="bg-amber-50 ring-1 ring-amber-200 rounded-2xl p-4 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-amber-800">{t('examens.templates.show.no_classes')}</p>
                            <p className="text-sm text-amber-600 mt-0.5">
                                {t('examens.templates.show.no_classes_hint')}{' '}
                                <button onClick={() => router.get(route('classrooms.index'))} className="underline font-medium">
                                    {t('examens.templates.show.configure_classes')}
                                </button>
                            </p>
                        </div>
                    </div>
                )}
                {activeYear && availableClassSubjects.length === 0 && evaluations.length > 0 && (
                    <div className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-4 flex gap-2 items-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <p className="text-sm text-emerald-700 font-medium">
                            {t('examens.templates.show.all_deployed')}
                        </p>
                    </div>
                )}

                {/* Sélecteur de déploiement */}
                {showSelector && availableClassSubjects.length > 0 && (
                    <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                {t('examens.templates.show.select_title')}
                            </h3>
                            <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">
                                {selected.length === availableClassSubjects.length ? t('examens.templates.show.deselect_all') : t('examens.templates.show.select_all')}
                            </button>
                        </div>

                        {/* En-tête colonnes */}
                        <div className="hidden sm:grid grid-cols-[1fr_1fr_160px] gap-2 px-3 text-xs font-semibold text-blue-700 uppercase tracking-wide">
                            <span>{t('examens.templates.show.col_class')}</span>
                            <span>{t('examens.templates.show.col_subject_coeff')}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {t('examens.templates.show.col_planned_date')}</span>
                        </div>

                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {availableClassSubjects.map(cs => {
                                const isChecked = selected.includes(cs.id);
                                return (
                                    <div key={cs.id} className={`grid grid-cols-1 sm:grid-cols-[1fr_1fr_160px] gap-2 items-center p-3 rounded-xl border transition-colors ${
                                        isChecked ? 'bg-blue-600/5 border-blue-400' : 'bg-white border-gray-200'
                                    }`}>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleSelect(cs.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                                            />
                                            <span className="font-medium text-sm text-gray-900">
                                                {cs.class.name}
                                                <span className="ml-1 text-xs text-gray-400">({cs.class.code})</span>
                                            </span>
                                        </label>
                                        <span className="text-sm text-gray-600 pl-7 sm:pl-0">
                                            {cs.subject.name}
                                            <span className="ml-1 text-xs text-gray-400">· {t('examens.templates.show.coeff', { n: cs.coefficient })}</span>
                                        </span>
                                        <Input
                                            type="date"
                                            value={dates[cs.id] ?? defaultDate}
                                            onChange={e => setDates(d => ({ ...d, [cs.id]: e.target.value }))}
                                            disabled={!isChecked}
                                            className={`text-sm h-8 ${!isChecked ? 'opacity-40' : ''}`}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {selected.length > 0 && (
                            <p className="text-xs text-blue-700 font-medium">
                                {t('examens.templates.show.selected_summary', { count: selected.length })}
                                {selected.filter(id => dates[id]).length > 0 && ` · ${t('examens.templates.show.with_date', { count: selected.filter(id => dates[id]).length })}`}
                            </p>
                        )}

                        <div className="flex gap-3">
                            <Button
                                className="bg-blue-600 hover:bg-blue-700 gap-2"
                                disabled={selected.length === 0 || generating}
                                onClick={handleGenerate}
                            >
                                <Play className="w-4 h-4" />
                                {generating ? t('examens.templates.show.generating') : t('examens.templates.show.generate', { count: selected.length })}
                            </Button>
                            <Button variant="outline" onClick={() => { setShowSelector(false); setSelected([]); setDates({}); }}>{t('common.actions.cancel')}</Button>
                        </div>
                    </div>
                )}

                {/* Liste des évaluations générées */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-blue-500" />
                            {t('examens.templates.show.generated')}
                            <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">{evaluations.length}</span>
                        </h2>
                    </div>
                    {evaluations.length === 0 ? (
                        <div className="py-16 text-center text-gray-400">
                            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p>{t('examens.templates.show.empty')}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead>{t('examens.templates.show.col_class')}</TableHead>
                                    <TableHead>{t('examens.templates.show.col_subject')}</TableHead>
                                    <TableHead className="text-center">{t('examens.templates.show.col_subject_coeff2')}</TableHead>
                                    <TableHead>{t('examens.templates.show.col_date')}</TableHead>
                                    <TableHead>{t('examens.templates.show.col_status')}</TableHead>
                                    <TableHead className="text-center">{t('examens.templates.show.col_progress')}</TableHead>
                                    <TableHead className="text-center w-32">{t('examens.templates.show.col_actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {evaluations.map(ev => {
                                    const pct = ev.marks_count > 0 ? Math.round((ev.graded_count / ev.marks_count) * 100) : 0;
                                    return (
                                        <TableRow key={ev.id} className="hover:bg-blue-50/20 transition-colors">
                                            <TableCell className="font-medium text-gray-900">
                                                {ev.class_subject.class.name}
                                                <span className="ml-1 text-xs text-gray-400">({ev.class_subject.class.code})</span>
                                            </TableCell>
                                            <TableCell className="text-gray-600">{ev.class_subject.subject.name}</TableCell>
                                            <TableCell className="text-center font-mono text-gray-600">{ev.class_subject.coefficient}</TableCell>
                                            <TableCell className="text-gray-500 text-sm">
                                                {ev.date ? new Date(ev.date).toLocaleDateString(dateLocale) : '—'}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    ev.status === 'completed'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {ev.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : null}
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
                                                    <span className="text-xs text-gray-500 whitespace-nowrap">{ev.graded_count}/{ev.marks_count}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-center gap-1.5">
                                                    <Button
                                                        variant="outline" size="sm" className="gap-1 text-xs"
                                                        onClick={() => router.get(route('marks.index', ev.id))}
                                                    >
                                                        <ClipboardList className="w-3.5 h-3.5" /> {t('examens.templates.show.marks')}
                                                    </Button>
                                                    <Button
                                                        variant="outline" size="sm"
                                                        className="border-red-200 text-red-500 hover:bg-red-50"
                                                        onClick={() => setDeleteId(ev.id)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('examens.templates.show.delete_eval_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('examens.templates.show.delete_eval_desc')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('common.actions.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && onDeleteEval(deleteId)}>
                            {t('common.actions.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
