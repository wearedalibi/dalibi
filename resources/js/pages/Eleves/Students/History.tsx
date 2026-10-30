import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    History,
    School,
    CalendarDays,
    UserCircle2,
    BadgeCheck,
    GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface StudentSummary {
    id: string;
    firstname: string;
    lastname: string;
    matricule?: string | null;
}

interface EnrollmentHistoryItem {
    id: string;
    classroom: {
        name?: string | null;
        code?: string | null;
    };
    academic_year?: string | null;
    enrollment_date?: string | null;
    enrollment_code?: string | null;
    status?: string | null;
    academic_status?: string | null;
    academic_status_label?: string | null;
    status_reason?: string | null;
}

const ACADEMIC_BADGE: Record<string, string> = {
    en_cours:   'bg-blue-100 text-blue-700 border border-blue-200',
    valide:     'bg-emerald-100 text-emerald-700 border border-emerald-200',
    non_valide: 'bg-amber-100 text-amber-700 border border-amber-200',
    abandon:    'bg-red-100 text-red-700 border border-red-200',
    transfere:  'bg-gray-100 text-gray-600 border border-gray-200',
};

interface HistoryProps {
    student: StudentSummary;
    enrollments: EnrollmentHistoryItem[];
}

function formatDate(value: string | null | undefined, loc: string): string {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString(loc);
}

function getStatusClass(status?: string | null): string {
    if (status === 'PAID') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    if (status === 'PARTIALLY_PAID') return 'bg-amber-100 text-amber-700 border border-amber-200';
    if (status === 'ISSUED') return 'bg-rose-100 text-rose-700 border border-rose-200';
    return 'bg-gray-100 text-gray-700 border border-gray-200';
}

export default function HistoryPage({ student, enrollments }: Readonly<HistoryProps>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const getStatusLabel = (status?: string | null): string => {
        if (!status) return '—';
        return t(`students.history.pay.${status}`);
    };
    const firstEnrollment = enrollments.at(-1);
    const latestEnrollment = enrollments[0];

    return (
        <AppLayout>
            <Head title={t('students.history.title')} />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => router.get(route('students.index'))}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight text-gray-900">{t('students.history.title')}</h1>
                            <p className="mt-2 text-gray-600">
                                {student.firstname} {student.lastname}
                                {student.matricule ? ` (${student.matricule})` : ''}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => router.get(route('students.show', student.id))}
                        className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                        <History className="w-4 h-4" />
                        {t('students.history.view_profile')}
                    </Button>
                </div>

                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-sky-700 font-semibold">{t('students.history.journey')}</p>
                        <p className="mt-1 text-lg font-bold text-sky-900 inline-flex items-center gap-2">
                            <UserCircle2 className="w-5 h-5" />
                            {student.firstname} {student.lastname}
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white border border-sky-200 px-3 py-1 text-sm font-semibold text-sky-800">
                        <BadgeCheck className="w-4 h-4" />
                        {t('students.history.count', { count: enrollments.length })}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                        <p className="text-sm text-blue-700 inline-flex items-center gap-1.5"><History className="w-4 h-4" />{t('students.history.total')}</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">{enrollments.length}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                        <p className="text-sm text-emerald-700 inline-flex items-center gap-1.5"><GraduationCap className="w-4 h-4" />{t('students.history.first_class')}</p>
                        <p className="text-lg font-semibold text-emerald-900 mt-1">{firstEnrollment?.classroom?.name ?? '—'}</p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                        <p className="text-sm text-amber-700 inline-flex items-center gap-1.5"><School className="w-4 h-4" />{t('students.history.current_class')}</p>
                        <p className="text-lg font-semibold text-amber-900 mt-1">{latestEnrollment?.classroom?.name ?? '—'}</p>
                    </div>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-linear-to-br from-indigo-50 to-white shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-indigo-100 flex items-center gap-2 text-indigo-800 bg-indigo-50">
                        <School className="w-4 h-4" />
                        <span className="font-semibold">{t('students.history.by_class_year')}</span>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-indigo-50/60">
                                <TableRow className="border-b border-gray-200">
                                    <TableHead className="font-semibold text-gray-900">{t('students.history.col_class')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('students.history.col_year')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('students.history.col_date')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('students.history.col_code')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('students.history.col_payment')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('students.history.col_schooling')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {enrollments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <CalendarDays className="w-10 h-10 text-gray-300" />
                                                <p>{t('students.history.empty')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    enrollments.map((enrollment) => (
                                        <TableRow key={enrollment.id} className="border-b border-gray-100 hover:bg-indigo-50/40 transition-colors">
                                            <TableCell className="font-medium text-gray-900">
                                                {enrollment.classroom?.name ?? '—'}
                                                {enrollment.classroom?.code ? (
                                                    <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{enrollment.classroom.code}</span>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="text-gray-700">{enrollment.academic_year ?? '—'}</TableCell>
                                            <TableCell className="text-gray-700">{formatDate(enrollment.enrollment_date, dateLocale)}</TableCell>
                                            <TableCell className="text-gray-700">{enrollment.enrollment_code ?? '—'}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusClass(enrollment.status)}`}>
                                                    {getStatusLabel(enrollment.status)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${ACADEMIC_BADGE[enrollment.academic_status ?? 'en_cours'] ?? 'bg-gray-100 text-gray-600'}`}>
                                                    {enrollment.academic_status_label ?? '—'}
                                                </span>
                                                {enrollment.status_reason && (
                                                    <span className="block text-xs text-gray-400 italic mt-0.5">{enrollment.status_reason}</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
