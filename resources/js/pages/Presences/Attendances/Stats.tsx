import { Head, router } from '@inertiajs/react';
import { BarChart3, ChevronRight, TrendingDown, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';
import { useState } from 'react';

interface Classroom { id: string; name: string; code: string; }
interface Period    { id: string; name: string; }
interface Student  { id: string; firstname: string; lastname: string; matricule: string; }

interface StudentStat {
    student: Student;
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    absence_rate: number;
}

interface DayRow {
    id: string;
    date: string;
    session: string;
    records_count: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    excused_count: number;
}

interface Props {
    classrooms:   Classroom[];
    periods:      Period[];
    stats:        StudentStat[];
    topAbsent:    StudentStat[];
    dailySummary: DayRow[];
    filters:      { classroomId: string; periodId: string };
    activeYear:   { year: string } | null;
}

function RateBar({ rate }: { rate: number }) {
    const color = rate >= 20 ? 'bg-red-500' : rate >= 10 ? 'bg-amber-500' : 'bg-emerald-500';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-20">
                <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(rate, 100)}%` }} />
            </div>
            <span className={`text-xs font-semibold w-10 text-right ${rate >= 20 ? 'text-red-600' : rate >= 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {rate}%
            </span>
        </div>
    );
}

export default function Stats({ classrooms, periods, stats, dailySummary, filters, activeYear }: Readonly<Props>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [classroomId, setClassroomId] = useState(filters.classroomId ?? '');
    const [periodId, setPeriodId]       = useState(filters.periodId ?? '');

    const apply = (overrides: Record<string, string> = {}) => {
        router.get(route('attendances.stats'), {
            classroom_id: overrides.classroomId ?? classroomId,
            period_id:    overrides.periodId    ?? periodId,
        }, { preserveScroll: true, replace: true });
    };

    const sessionLabel: Record<string, string> = {
        matin: t('presences.session.matin'),
        'apres-midi': t('presences.session.apres_midi'),
        journee: t('presences.session.journee_short'),
    };

    return (
        <AppLayout>
            <Head title={t('presences.attendances.stats.head')} />
            <div className="w-full space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><BarChart3 className="h-7 w-7 text-blue-600 shrink-0" />{t('presences.attendances.stats.head')}</h1>
                        <p className="mt-2 text-lg text-gray-600">{t('presences.attendances.stats.subtitle')}</p>
                    </div>
                    <button onClick={() => router.get(route('attendances.index'))} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                        <ChevronRight className="w-4 h-4 rotate-180" /> {t('presences.attendances.stats.back_to_entry')}
                    </button>
                </div>

                {/* Filtres */}
                <div className="rounded-2xl bg-slate-50/70 ring-1 ring-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-44">
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('presences.attendances.stats.class')}</label>
                        <Select value={classroomId || 'none'} onValueChange={v => { const val = v === 'none' ? '' : v; setClassroomId(val); apply({ classroomId: val }); }}>
                            <SelectTrigger><SelectValue placeholder={t('presences.attendances.stats.select')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{t('presences.attendances.stats.all_classes')}</SelectItem>
                                {classrooms.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="min-w-44">
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('presences.attendances.stats.period')}</label>
                        <Select value={periodId || 'none'} onValueChange={v => { const val = v === 'none' ? '' : v; setPeriodId(val); apply({ periodId: val }); }}>
                            <SelectTrigger><SelectValue placeholder={t('presences.attendances.stats.all_periods')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{t('presences.attendances.stats.all_periods')}</SelectItem>
                                {periods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {stats.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 py-20 text-center text-gray-400">
                        <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p>{t('presences.attendances.stats.empty')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Résumé journalier */}
                        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900 flex items-center gap-2">
                                <TrendingDown className="w-4 h-4 text-blue-500" />
                                {t('presences.attendances.stats.recorded_calls')}
                                <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{dailySummary.length}</span>
                            </div>
                            <div className="overflow-auto max-h-96">
                                <Table>
                                    <TableHeader className="bg-gray-50">
                                        <TableRow>
                                            <TableHead>{t('presences.attendances.stats.col_date')}</TableHead>
                                            <TableHead className="text-center">✓</TableHead>
                                            <TableHead className="text-center">✗</TableHead>
                                            <TableHead className="text-center">⏱</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dailySummary.map(d => (
                                            <TableRow key={d.id} className="hover:bg-gray-50">
                                                <TableCell className="text-xs">
                                                    <div className="font-medium">{new Date(d.date).toLocaleDateString(dateLocale)}</div>
                                                    <div className="text-gray-400">{sessionLabel[d.session] ?? d.session}</div>
                                                </TableCell>
                                                <TableCell className="text-center text-xs text-emerald-600 font-semibold">{d.present_count}</TableCell>
                                                <TableCell className="text-center text-xs text-red-600 font-semibold">{d.absent_count}</TableCell>
                                                <TableCell className="text-center text-xs text-amber-600 font-semibold">{d.late_count}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Stats par élève */}
                        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900 flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-500" />
                                {t('presences.attendances.stats.per_student')}
                                <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{t('presences.attendances.stats.students_count', { count: stats.length })}</span>
                            </div>
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead>{t('presences.attendances.stats.col_student')}</TableHead>
                                        <TableHead className="text-center">{t('presences.attendances.stats.col_present')}</TableHead>
                                        <TableHead className="text-center">{t('presences.attendances.stats.col_absent')}</TableHead>
                                        <TableHead className="text-center">{t('presences.attendances.stats.col_late')}</TableHead>
                                        <TableHead className="text-center">{t('presences.attendances.stats.col_excused')}</TableHead>
                                        <TableHead className="w-36">{t('presences.attendances.stats.col_absence_rate')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.map(s => (
                                        <TableRow key={s.student.id} className={`${s.absence_rate >= 20 ? 'bg-red-50/30' : ''} hover:bg-gray-50`}>
                                            <TableCell>
                                                <div className="font-medium text-gray-900 text-sm">{s.student.lastname} {s.student.firstname}</div>
                                                <div className="text-xs text-gray-400 font-mono">{s.student.matricule}</div>
                                            </TableCell>
                                            <TableCell className="text-center text-emerald-600 font-semibold text-sm">{s.present}</TableCell>
                                            <TableCell className="text-center text-red-600 font-semibold text-sm">{s.absent}</TableCell>
                                            <TableCell className="text-center text-amber-600 font-semibold text-sm">{s.late}</TableCell>
                                            <TableCell className="text-center text-blue-600 font-semibold text-sm">{s.excused}</TableCell>
                                            <TableCell><RateBar rate={s.absence_rate} /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
