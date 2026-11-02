import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Award, BookOpen, Medal, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface GradeRow {
    class_subject_id: string;
    subject: { id: string; name: string; code: string };
    coefficient: number;
    score: number | null;
    comments: string | null;
    rang: number | null;
}

interface Period { id: string; name: string; is_current: boolean }

interface StudentProps {
    student: { id: string; firstname: string; lastname: string; matricule: string };
    enrollment: { class_id: string; classroom: { name: string; code: string } } | null;
    grades: GradeRow[];
    periods: Period[];
    average: number | null;
    rang_global: number | null;
    mention: string | null;
    academic_period_id: string;
    activeYear: { id: string; name: string } | null;
}

function scoreColor(score: number | null): string {
    if (score === null) return 'text-gray-400';
    if (score >= 14) return 'text-emerald-600 font-bold';
    if (score >= 10) return 'text-blue-600 font-semibold';
    return 'text-red-600 font-semibold';
}

function mentionColor(average: number | null): string {
    if (average === null) return 'text-gray-400';
    if (average >= 16) return 'text-emerald-600';
    if (average >= 14) return 'text-green-600';
    if (average >= 12) return 'text-blue-600';
    if (average >= 10) return 'text-amber-600';
    return 'text-red-600';
}

export default function Student({
    student,
    enrollment,
    grades,
    periods,
    average,
    rang_global: rangGlobal,
    mention,
    academic_period_id: term,
    activeYear,
}: Readonly<StudentProps>) {
    const { t } = useTranslation();
    const ordinal = (rank: number | null): string =>
        rank === null ? '—' : rank === 1 ? t('notes.grades.student.ord_first') : `${rank}${t('notes.grades.student.ord_suffix')}`;

    const onTermChange = (value: string) => {
        router.get(route('grades.student', student.id), { academic_period_id: value }, { preserveScroll: true, replace: true });
    };

    const termLabel = periods.find((p) => p.id === term)?.name ?? '';
    const mentionLabel = mention ?? '—';

    const totalCoef = grades.filter((g) => g.score !== null).reduce((sum, g) => sum + g.coefficient, 0);
    const graded = grades.filter((g) => g.score !== null).length;

    return (
        <AppLayout>
            <Head title={t('notes.grades.student.head', { name: `${student.lastname} ${student.firstname}` })} />

            <div className="w-full space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 border-gray-300"
                            onClick={() => router.get(route('grades.index'))}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {t('common.actions.back')}
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                                {student.lastname} {student.firstname}
                            </h1>
                            <p className="mt-1 text-gray-500">
                                {t('notes.grades.student.matricule_label')} <span className="font-mono font-medium text-gray-700">{student.matricule}</span>
                                {enrollment && (
                                    <> · {t('notes.grades.student.class_label')} <span className="font-medium text-gray-700">{enrollment.classroom.name}</span></>
                                )}
                                {activeYear && (
                                    <> · {activeYear.name}</>
                                )}
                            </p>
                        </div>
                    </div>
                    {periods.length > 0 && (
                        <Select value={term} onValueChange={onTermChange}>
                            <SelectTrigger className="w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {periods.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Summary cards */}
                {enrollment && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="bg-linear-to-br from-violet-50/70 to-white ring-1 ring-violet-100 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{t('notes.grades.student.general_average')}</p>
                                    <p className={`text-4xl font-bold mt-2 ${average !== null ? scoreColor(average) : 'text-gray-400'}`}>
                                        {average !== null ? `${average}/20` : '—'}
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6 text-violet-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-linear-to-br from-amber-50/70 to-white ring-1 ring-amber-100 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{t('notes.grades.student.rank')}</p>
                                    <p className="text-4xl font-bold mt-2 text-amber-600">{ordinal(rangGlobal)}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                    <Medal className="w-6 h-6 text-amber-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-linear-to-br from-blue-50/70 to-white ring-1 ring-blue-100 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{t('notes.grades.student.mention')}</p>
                                    <p className={`text-2xl font-bold mt-2 ${mentionColor(average)}`}>{mentionLabel}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Award className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-linear-to-br from-emerald-50/70 to-white ring-1 ring-emerald-100 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{t('notes.grades.student.graded_subjects')}</p>
                                    <p className="text-4xl font-bold mt-2 text-emerald-600">
                                        {graded}<span className="text-lg text-gray-400">/{grades.length}</span>
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <BookOpen className="w-6 h-6 text-emerald-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Grades table */}
                {enrollment ? (
                    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {t('notes.grades.student.transcript', { period: termLabel })}
                            </h2>
                            {totalCoef > 0 && (
                                <p className="text-sm text-gray-500 mt-0.5">{t('notes.grades.student.total_coef', { total: totalCoef })}</p>
                            )}
                        </div>
                        {grades.length > 0 ? (
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow className="border-b border-gray-200">
                                        <TableHead>{t('notes.grades.student.col_subject')}</TableHead>
                                        <TableHead className="w-20 text-center">{t('notes.grades.student.col_coef')}</TableHead>
                                        <TableHead className="w-28 text-center">{t('notes.grades.student.col_mark')}</TableHead>
                                        <TableHead className="w-28 text-center">{t('notes.grades.student.col_weighted')}</TableHead>
                                        <TableHead className="w-20 text-center">{t('notes.grades.student.col_rank')}</TableHead>
                                        <TableHead>{t('notes.grades.student.col_comment')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {grades.map((g) => {
                                        const weighted = g.score !== null ? (g.score * g.coefficient).toFixed(2) : null;
                                        return (
                                            <TableRow key={g.class_subject_id} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                                                <TableCell className="font-medium text-gray-900">{g.subject.name}</TableCell>
                                                <TableCell className="text-center text-gray-600">{g.coefficient}</TableCell>
                                                <TableCell className={`text-center text-lg ${scoreColor(g.score)}`}>
                                                    {g.score !== null ? g.score : <span className="text-gray-300 text-base">—</span>}
                                                </TableCell>
                                                <TableCell className="text-center text-gray-600">
                                                    {weighted ?? <span className="text-gray-300">—</span>}
                                                </TableCell>
                                                <TableCell className="text-center text-gray-600">
                                                    {ordinal(g.rang)}
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-500 italic">
                                                    {g.comments || '—'}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {/* Average row */}
                                    <TableRow className="bg-gray-50 border-t-2 border-gray-200">
                                        <TableCell colSpan={2} className="font-bold text-gray-900">
                                            {t('notes.grades.student.general_average')}
                                        </TableCell>
                                        <TableCell className={`text-center text-xl font-bold ${scoreColor(average)}`} colSpan={2}>
                                            {average !== null ? `${average}/20` : '—'}
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-amber-600">
                                            {ordinal(rangGlobal)}
                                        </TableCell>
                                        <TableCell className={`font-semibold ${mentionColor(average)}`}>
                                            {mentionLabel}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="py-12 text-center text-gray-500">
                                <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                <p>{t('notes.grades.student.no_subjects')}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 py-16 text-center text-gray-500">
                        <TrendingDown className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-lg font-medium">{t('notes.grades.student.not_enrolled')}</p>
                        <p className="text-sm mt-1">{t('notes.grades.student.not_enrolled_hint')}</p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
