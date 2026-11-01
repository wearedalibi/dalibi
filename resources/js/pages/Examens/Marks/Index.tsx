import { Head, router } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Lock, MessageSquareWarning, Save, TrendingUp, Users, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Student { id: string; firstname: string; lastname: string; matricule: string; }

interface StudentMark {
    student_id: string;
    student: Student;
    mark_id: string | null;
    score: number | null;
    absent: boolean;
    comments: string | null;
}

interface Evaluation {
    id: string;
    status: 'scheduled' | 'completed';
    locked_at: string | null;
    date: string | null;
    template: {
        name: string; coefficient: number; max_score: number;
        academic_period: { name: string };
        evaluation_type: { name: string };
    };
    class_subject: {
        coefficient: number;
        class: { name: string; code: string };
        subject: { name: string };
    };
}

interface Stats {
    total: number; graded: number; absent: number;
    average: number | null; min: number | null; max: number | null;
}

interface Props {
    evaluation: Evaluation;
    studentsWithMarks: StudentMark[];
    stats: Stats;
}

interface MarkState { score: string; absent: boolean; comments: string; }

function scoreColor(score: number | null, max: number): string {
    if (score === null) return '';
    const pct = score / max;
    if (pct >= 0.7) return 'text-emerald-600 font-bold';
    if (pct >= 0.5) return 'text-blue-600 font-semibold';
    return 'text-red-600 font-semibold';
}

export default function Index({ evaluation, studentsWithMarks, stats }: Readonly<Props>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const maxScore = Number(evaluation.template.max_score);
    const isLocked = !!evaluation.locked_at;

    const [marks, setMarks] = useState<Record<string, MarkState>>({});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved]   = useState(false);

    useEffect(() => {
        const init: Record<string, MarkState> = {};
        for (const sm of studentsWithMarks) {
            init[sm.student_id] = {
                score:    sm.score !== null ? String(sm.score) : '',
                absent:   sm.absent,
                comments: sm.comments ?? '',
            };
        }
        setMarks(init);
        setSaved(false);
    }, [studentsWithMarks]);

    const setScore   = (id: string, v: string) => { setMarks(p => ({ ...p, [id]: { ...p[id], score: v, absent: false } })); setSaved(false); };
    const setAbsent  = (id: string, v: boolean) => { setMarks(p => ({ ...p, [id]: { ...p[id], absent: v, score: v ? '' : p[id].score } })); setSaved(false); };
    const setComment = (id: string, v: string) => { setMarks(p => ({ ...p, [id]: { ...p[id], comments: v } })); setSaved(false); };

    const onSave = () => {
        if (isLocked) return;
        const payload = studentsWithMarks.map(sm => ({
            student_id: sm.student_id,
            score:      marks[sm.student_id]?.score !== '' ? marks[sm.student_id]?.score : null,
            absent:     marks[sm.student_id]?.absent ?? false,
            comments:   marks[sm.student_id]?.comments || null,
        }));
        setSaving(true);
        router.post(route('marks.store', evaluation.id), { marks: payload }, {
            preserveScroll: true,
            onSuccess: () => { setSaved(true); setSaving(false); },
            onError:   () => setSaving(false),
        });
    };

    const onReclamation = (studentId: string) => {
        router.get(route('note-reclamations.create'), {
            evaluation_id: evaluation.id,
            student_id:    studentId,
        });
    };

    const gradedNow = studentsWithMarks.filter(sm => {
        const m = marks[sm.student_id];
        return m && !m.absent && m.score !== '';
    }).length;

    const absentNow = studentsWithMarks.filter(sm => marks[sm.student_id]?.absent).length;

    const statsCards = [
        { title: t('examens.marks.students'), value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 ring-blue-100' },
        { title: t('examens.marks.graded'), value: gradedNow, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 ring-emerald-100' },
        { title: t('examens.marks.absent'), value: absentNow, icon: UserX, color: 'text-orange-600', bg: 'bg-orange-50 ring-orange-100' },
        { title: t('examens.marks.avg_saved'), value: stats.average !== null ? `${stats.average}/${maxScore}` : '—', icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50 ring-violet-100' },
    ];

    return (
        <AppLayout>
            <Head title={t('examens.marks.head', { name: evaluation.template.name })} />

            <div className="w-full space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-4">
                        <Button variant="outline" size="sm" className="gap-2 mt-1" onClick={() => history.back()}>
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{evaluation.template.name}</h1>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-sm text-gray-500">
                                <span>{evaluation.class_subject.class.name} ({evaluation.class_subject.class.code})</span>
                                <span>·</span>
                                <span>{evaluation.class_subject.subject.name}</span>
                                <span>·</span>
                                <span>{evaluation.template.academic_period.name}</span>
                                <span>·</span>
                                <span>{evaluation.template.evaluation_type.name}</span>
                                <span>·</span>
                                <span>{t('examens.marks.coeff_exam')} <strong>{Number(evaluation.template.coefficient).toFixed(2)}</strong></span>
                                <span>·</span>
                                <span>{t('examens.marks.coeff_subject')} <strong>{evaluation.class_subject.coefficient}</strong></span>
                                <span>·</span>
                                <span>{t('examens.marks.on')} <strong>{maxScore}</strong></span>
                            </div>
                        </div>
                    </div>
                    {!isLocked && (
                        <Button
                            className={`gap-2 ${saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                            onClick={onSave}
                            disabled={saving}
                        >
                            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {saving ? t('examens.marks.saving') : saved ? t('examens.marks.saved') : t('common.actions.save')}
                        </Button>
                    )}
                </div>

                {/* Lock banner */}
                {isLocked && (
                    <div className="flex items-center gap-3 bg-red-50 ring-1 ring-red-200 rounded-2xl px-5 py-4">
                        <Lock className="w-5 h-5 text-red-500 shrink-0" />
                        <div>
                            <p className="font-semibold text-red-800">{t('examens.marks.locked_title')}</p>
                            <p className="text-sm text-red-600 mt-0.5">
                                {t('examens.marks.locked_hint', { date: new Date(evaluation.locked_at!).toLocaleDateString(dateLocale) })}
                            </p>
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {statsCards.map(c => {
                        const Icon = c.icon;
                        return (
                            <div key={c.title} className={`${c.bg} ring-1 rounded-2xl p-5 shadow-sm`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500">{c.title}</p>
                                        <p className={`text-3xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                                    </div>
                                    <Icon className={`w-8 h-8 ${c.color} opacity-25`} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Grille */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900">
                            {isLocked ? t('examens.marks.grid_locked') : t('examens.marks.grid_entry')}
                        </h2>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${evaluation.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {evaluation.status === 'completed' ? t('examens.marks.status_completed') : t('examens.marks.status_scheduled')}
                        </span>
                    </div>

                    {studentsWithMarks.length === 0 ? (
                        <div className="py-16 text-center text-gray-400">
                            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p>{t('examens.marks.no_students')}</p>
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="w-10">#</TableHead>
                                        <TableHead>{t('examens.marks.col_matricule')}</TableHead>
                                        <TableHead>{t('examens.marks.col_student')}</TableHead>
                                        <TableHead className="w-40">{t('examens.marks.col_mark', { max: maxScore })}</TableHead>
                                        {!isLocked && <TableHead className="w-24 text-center">{t('examens.marks.col_absent')}</TableHead>}
                                        <TableHead>{t('examens.marks.col_comment')}</TableHead>
                                        {isLocked && <TableHead className="w-36 text-center">{t('examens.marks.col_appeal')}</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {studentsWithMarks.map((sm, i) => {
                                        const m     = marks[sm.student_id];
                                        const score = m && !m.absent && m.score !== '' ? parseFloat(m.score) : null;
                                        const isAbs = m?.absent ?? false;
                                        return (
                                            <TableRow
                                                key={sm.student_id}
                                                className={`border-b border-gray-100 transition-colors ${isAbs ? 'bg-orange-50/40' : 'hover:bg-blue-50/20'}`}
                                            >
                                                <TableCell className="text-gray-400 text-xs">{i + 1}</TableCell>
                                                <TableCell className="font-mono text-xs text-gray-500">{sm.student.matricule}</TableCell>
                                                <TableCell className="font-medium text-gray-900">
                                                    {sm.student.lastname} {sm.student.firstname}
                                                </TableCell>
                                                <TableCell>
                                                    {isAbs ? (
                                                        <span className="text-xs text-orange-500 italic">{t('examens.marks.absent_mark')}</span>
                                                    ) : isLocked ? (
                                                        <span className={`font-mono text-sm ${scoreColor(score, maxScore)}`}>
                                                            {score !== null ? score : <span className="text-gray-300">—</span>}
                                                        </span>
                                                    ) : (
                                                        <div className="relative w-32">
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                max={maxScore}
                                                                step={0.25}
                                                                value={m?.score ?? ''}
                                                                onChange={e => setScore(sm.student_id, e.target.value)}
                                                                className={`pr-10 text-right ${scoreColor(score, maxScore)}`}
                                                                placeholder="—"
                                                            />
                                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">/{maxScore}</span>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                {!isLocked && (
                                                    <TableCell className="text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isAbs}
                                                            onChange={e => setAbsent(sm.student_id, e.target.checked)}
                                                            className="w-4 h-4 rounded border-gray-300 text-orange-500 cursor-pointer"
                                                        />
                                                    </TableCell>
                                                )}
                                                <TableCell>
                                                    {isLocked ? (
                                                        <span className="text-sm text-gray-500 italic">{m?.comments || '—'}</span>
                                                    ) : (
                                                        <Input
                                                            value={m?.comments ?? ''}
                                                            onChange={e => setComment(sm.student_id, e.target.value)}
                                                            placeholder={t('examens.marks.comment_ph')}
                                                            className="max-w-xs text-sm"
                                                            disabled={isAbs}
                                                        />
                                                    )}
                                                </TableCell>
                                                {isLocked && (
                                                    <TableCell className="text-center">
                                                        <Button
                                                            variant="outline" size="sm"
                                                            className="gap-1 text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
                                                            onClick={() => onReclamation(sm.student_id)}
                                                        >
                                                            <MessageSquareWarning className="w-3.5 h-3.5" />
                                                            {t('examens.marks.appeal')}
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                            {isLocked ? (
                                <div className="px-6 py-4 bg-red-50/50 flex items-center gap-3 border-t border-red-100">
                                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                                    <p className="text-sm text-red-600">
                                        {t('examens.marks.locked_footer')}
                                    </p>
                                </div>
                            ) : (
                                <div className="px-6 py-4 bg-gray-50 flex justify-between items-center border-t border-gray-100">
                                    <p className="text-sm text-gray-500">
                                        {t('examens.marks.entered_count', { count: gradedNow })}
                                        {absentNow > 0 && ` · ${t('examens.marks.absent_count', { count: absentNow })}`}
                                        {' '}{t('examens.marks.of_students', { total: studentsWithMarks.length })}
                                    </p>
                                    <Button
                                        className={`gap-2 ${saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                        onClick={onSave}
                                        disabled={saving}
                                    >
                                        {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                        {saving ? t('examens.marks.saving') : saved ? t('examens.marks.saved') : t('examens.marks.save_marks')}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
