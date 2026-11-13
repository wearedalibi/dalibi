import { Head, router } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, ClipboardList, TrendingUp, UserX, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Mark {
    id: string;
    score: number | null;
    absent: boolean;
    comments: string | null;
    student: { firstname: string; lastname: string; matricule: string };
}

interface Evaluation {
    id: string;
    status: 'scheduled' | 'completed';
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
    marks: Mark[];
}

interface Props { evaluation: Evaluation; }

export default function Show({ evaluation }: Readonly<Props>) {
    const { t } = useTranslation();
    const maxScore   = Number(evaluation.template.max_score);
    const gradedMarks = evaluation.marks.filter(m => !m.absent && m.score !== null);
    const absentCount = evaluation.marks.filter(m => m.absent).length;
    const scores     = gradedMarks.map(m => Number(m.score));
    const avg        = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : null;
    const min        = scores.length > 0 ? Math.min(...scores) : null;
    const max        = scores.length > 0 ? Math.max(...scores) : null;

    const scoreColor = (score: number) => {
        const pct = score / maxScore;
        if (pct >= 0.7) return 'text-emerald-600 font-bold';
        if (pct >= 0.5) return 'text-blue-600 font-semibold';
        return 'text-red-600 font-semibold';
    };

    const statsCards = [
        { title: t('examens.evaluations.show.students'), value: evaluation.marks.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 ring-blue-100' },
        { title: t('examens.evaluations.show.graded'), value: gradedMarks.length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 ring-emerald-100' },
        { title: t('examens.evaluations.show.absent'), value: absentCount, icon: UserX, color: 'text-orange-600', bg: 'bg-orange-50 ring-orange-100' },
        { title: t('examens.evaluations.show.avg', { max: maxScore }), value: avg ?? '—', icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50 ring-violet-100' },
    ];

    return (
        <AppLayout>
            <Head title={t('examens.evaluations.show.head', { template: evaluation.template.name, class: evaluation.class_subject.class.name })} />

            <div className="w-full space-y-6">

                <div className="flex items-start gap-4">
                    <Button variant="outline" size="sm" className="gap-2 mt-1" onClick={() => router.get(route('evaluations.index'))}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-gray-900">{evaluation.template.name}</h1>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-sm text-gray-500">
                            <span>{evaluation.class_subject.class.name} ({evaluation.class_subject.class.code})</span>
                            <span>·</span>
                            <span>{evaluation.class_subject.subject.name}</span>
                            <span>·</span>
                            <span>{evaluation.template.academic_period.name}</span>
                            <span>·</span>
                            <span>{t('examens.templates.index.col_coeff')} {Number(evaluation.template.coefficient).toFixed(2)}</span>
                            <span>·</span>
                            <span>/{maxScore}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <span className={`self-start mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            evaluation.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                            {evaluation.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                            {evaluation.status === 'completed' ? t('examens.evaluations.show.status_completed') : t('examens.evaluations.show.status_scheduled')}
                        </span>
                        <Button
                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                            onClick={() => router.get(route('marks.index', evaluation.id))}
                        >
                            <ClipboardList className="w-4 h-4" /> {t('examens.evaluations.show.enter_marks')}
                        </Button>
                    </div>
                </div>

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

                {min !== null && max !== null && (
                    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 flex gap-8 text-sm text-gray-600">
                        <span>{t('examens.evaluations.show.min_label')} <strong className="text-red-500">{min}/{maxScore}</strong></span>
                        <span>{t('examens.evaluations.show.max_label')} <strong className="text-emerald-600">{max}/{maxScore}</strong></span>
                        <span>{t('examens.evaluations.show.avg_label')} <strong className="text-blue-600">{avg}/{maxScore}</strong></span>
                    </div>
                )}

                {/* Notes */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900">{t('examens.evaluations.show.marks_entered')}</h2>
                    </div>
                    {evaluation.marks.length === 0 ? (
                        <div className="py-12 text-center text-gray-400">{t('examens.evaluations.show.no_marks')}</div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="w-10">#</TableHead>
                                    <TableHead>{t('examens.evaluations.show.col_matricule')}</TableHead>
                                    <TableHead>{t('examens.evaluations.show.col_student')}</TableHead>
                                    <TableHead className="text-center">{t('examens.evaluations.show.col_mark')}</TableHead>
                                    <TableHead>{t('examens.evaluations.show.col_comment')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {evaluation.marks.map((m, i) => (
                                    <TableRow key={m.id} className={m.absent ? 'bg-orange-50/40' : 'hover:bg-gray-50/50'}>
                                        <TableCell className="text-gray-400 text-xs">{i + 1}</TableCell>
                                        <TableCell className="font-mono text-xs text-gray-500">{m.student.matricule}</TableCell>
                                        <TableCell className="font-medium text-gray-900">
                                            {m.student.lastname} {m.student.firstname}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {m.absent ? (
                                                <span className="text-xs text-orange-500 italic">{t('examens.evaluations.show.absent_mark')}</span>
                                            ) : m.score !== null ? (
                                                <span className={scoreColor(Number(m.score))}>
                                                    {Number(m.score).toFixed(2)}/{maxScore}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-sm">{m.comments ?? '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
