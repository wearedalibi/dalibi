import { Head, router } from '@inertiajs/react';
import { Eye, Pencil, Plus, Search, Trash2, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/icon-button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useMoney } from '@/helpers/money';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Student {
    id: string;
    firstname: string;
    lastname: string;
    matricule?: string | null;
}

interface Classroom {
    id: string;
    name: string;
    code: string;
}

interface AcademicYear {
    id: string;
    year: string;
}

interface Invoice {
    total: number;
    amount_paid: number;
    amount_remaining: number;
    status: string;
}
interface Enrollment {
    id: string;
    enrollment_code: string;
    enrollment_date: string;
    status: 'PENDING' | 'ACTIVE' | 'CANCELLED';
    student: Student;
    classroom: Classroom;
    academic_year: AcademicYear;
    invoice: Invoice | null;
}

interface PaginatedEnrollments {
    data: Enrollment[];
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

interface IndexProps {
    enrollments: PaginatedEnrollments;
    perPage: number;
    filters: {
        search?: string;
        status?: string;
        academic_year_id?: string;
        class_id?: string;
        per_page?: string;
    };
    finance: {
        billed: number;
        collected: number;
        remaining: number;
        recovery_rate: number;
        unpaid_count: number;
        unpaid_amount: number;
    };
    academicYears: AcademicYear[];
    classrooms: Classroom[];
}

const statusBadgeClass: Record<Enrollment['status'], string> = {
    PENDING:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    ACTIVE:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function PaymentBadge({ invoice, fmt }: Readonly<{ invoice: Invoice | null; fmt: (n: number) => string }>) {
    const { t } = useTranslation();
    if (!invoice) {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">{t('enrollments.index.pay.no_invoice')}</span>;
    }
    if (invoice.amount_remaining <= 0 && invoice.total > 0) {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{t('enrollments.index.pay.paid')}</span>;
    }
    if (invoice.amount_paid > 0) {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">{t('enrollments.index.pay.remaining', { amount: fmt(invoice.amount_remaining) })}</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">{t('enrollments.index.pay.unpaid')}</span>;
}

export default function Index({ enrollments, perPage, filters, finance, academicYears, classrooms }: Readonly<IndexProps>) {
    const fmt = useMoney();
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [academicYearId, setAcademicYearId] = useState(filters.academic_year_id ?? '');
    const [classId, setClassId] = useState(filters.class_id ?? '');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const getFilters = () => ({
        search,
        status,
        academic_year_id: academicYearId,
        class_id: classId,
        per_page: perPage !== 25 ? String(perPage) : undefined,
    });

    const goToPage = (page: number) => {
        router.get(route('enrollments.index'), { ...getFilters(), page }, { preserveState: true, replace: true });
    };

    const changePerPage = (value: number) => {
        router.get(route('enrollments.index'), { ...getFilters(), per_page: String(value), page: 1 }, { preserveState: true, replace: true });
    };

    const windowedPages = () => {
        const total = enrollments.last_page;
        const cur = enrollments.current_page;
        const win = 5;
        const start = Math.max(1, Math.min(cur - Math.floor(win / 2), total - win + 1));
        const end = Math.min(total, start + win - 1);
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    };

    const handleSearch = () => {
        router.get(route('enrollments.index'), { ...getFilters(), page: 1 }, { preserveState: true, replace: true });
    };

    const handleClearSearch = () => {
        setSearch('');
        setStatus('');
        setAcademicYearId('');
        setClassId('');
        // academic_year_id explicitement vide = « Toutes les années » (sinon le
        // serveur retomberait sur l'année active par défaut).
        router.get(route('enrollments.index'), {
            academic_year_id: '',
            per_page: perPage !== 25 ? String(perPage) : undefined,
        }, { preserveState: true, replace: true });
    };

    const handleDelete = (id: string) => {
        router.delete(route('enrollments.destroy', id), {
            onSuccess: () => setDeletingId(null),
        });
    };

    return (
        <AppLayout>
            <Head title={t('enrollments.index.title')} />

            <div className="space-y-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><ClipboardList className="h-7 w-7 text-blue-600 shrink-0" />{t('enrollments.index.title')}</h1>
                        <p className="mt-2 text-lg text-gray-600">{t('enrollments.index.subtitle')}</p>
                    </div>
                    <Button onClick={() => router.get(route('enrollments.create'))} className="bg-blue-600 hover:bg-blue-700 gap-2">
                        <Plus className="w-5 h-5" />
                        {t('enrollments.index.new')}
                    </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 shadow-sm">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('enrollments.index.billed')}</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2 break-words">{fmt(finance.billed)}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 shadow-sm">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('enrollments.index.collected')}</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2 break-words">{fmt(finance.collected)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('enrollments.index.recovered', { rate: finance.recovery_rate })}</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-6 shadow-sm">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('enrollments.index.remaining')}</p>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2 break-words">{fmt(finance.remaining)}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 shadow-sm">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('enrollments.index.unpaid')}</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">{finance.unpaid_count}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{fmt(finance.unpaid_amount)} {t('enrollments.index.no_payment')}</p>
                    </div>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        handleSearch();
                                    }
                                }}
                                placeholder={t('enrollments.index.search_ph')}
                                className="pl-10 border-gray-300"
                            />
                        </div>

                        <select
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">{t('enrollments.index.all_statuses')}</option>
                            <option value="PENDING">{t('enrollments.index.status.pending')}</option>
                            <option value="ACTIVE">{t('enrollments.index.status.active')}</option>
                            <option value="CANCELLED">{t('enrollments.index.status.cancelled')}</option>
                        </select>

                        <select
                            value={academicYearId}
                            onChange={(event) => setAcademicYearId(event.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">{t('enrollments.index.all_years')}</option>
                            {academicYears.map((year) => (
                                <option key={year.id} value={year.id}>
                                    {year.year}
                                </option>
                            ))}
                        </select>

                        <select
                            value={classId}
                            onChange={(event) => setClassId(event.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">{t('enrollments.index.all_classes')}</option>
                            {classrooms.map((classroom) => (
                                <option key={classroom.id} value={classroom.id}>
                                    {classroom.name} ({classroom.code})
                                </option>
                            ))}
                        </select>

                        <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                            <Search className="w-4 h-4" />
                            {t('common.actions.search')}
                        </Button>
                        {(search || status || academicYearId || classId) && (
                            <Button variant="outline" onClick={handleClearSearch} className="border-gray-300 text-gray-700">
                                {t('enrollments.index.reset')}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {/* Table header: count + per-page selector */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <p className="text-sm text-gray-600">
                            <span className="font-semibold">{enrollments.total}</span> {t('enrollments.index.unit')}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{t('enrollments.index.per_page')}</span>
                            <select
                                value={perPage}
                                onChange={(e) => changePerPage(Number(e.target.value))}
                                className="h-8 px-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {PER_PAGE_OPTIONS.map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow className="border-b border-gray-200">
                                    <TableHead className="font-semibold text-gray-900">{t('enrollments.index.col.code')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('enrollments.index.col.student')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('enrollments.index.col.class')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('enrollments.index.col.year')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('enrollments.index.col.date')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('enrollments.index.col.status')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('enrollments.index.col.payment')}</TableHead>
                                    <TableHead className="text-center font-semibold text-gray-900 w-28">{t('enrollments.index.col.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {enrollments.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <ClipboardList className="w-12 h-12 text-gray-300" />
                                                <p className="text-lg">{t('enrollments.index.empty')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    enrollments.data.map((enrollment) => (
                                        <TableRow key={enrollment.id} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors">
                                            <TableCell className="font-semibold text-gray-900">{enrollment.enrollment_code}</TableCell>
                                            <TableCell className="text-gray-700">
                                                {enrollment.student ? `${enrollment.student.firstname} ${enrollment.student.lastname}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-gray-700">
                                                {enrollment.classroom ? `${enrollment.classroom.name} (${enrollment.classroom.code})` : '-'}
                                            </TableCell>
                                            <TableCell className="text-gray-700">{enrollment.academic_year?.year ?? '-'}</TableCell>
                                            <TableCell className="text-gray-700">{new Date(enrollment.enrollment_date).toLocaleDateString(dateLocale)}</TableCell>
                                            <TableCell>
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass[enrollment.status]}`}>
                                                    {t(`enrollments.index.status.${enrollment.status.toLowerCase()}`)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <PaymentBadge invoice={enrollment.invoice} fmt={fmt} />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex gap-2 justify-center">
                                                    <IconButton
                                                        label={t('common.actions.view')}
                                                        icon={<Eye className="w-4 h-4" />}
                                                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                                        onClick={() => router.get(route('enrollments.show', enrollment.id))}
                                                    />
                                                    <IconButton
                                                        label={t('common.actions.edit')}
                                                        icon={<Pencil className="w-4 h-4" />}
                                                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                                        onClick={() => router.get(route('enrollments.edit', enrollment.id))}
                                                    />
                                                    <IconButton
                                                        label={t('common.actions.delete')}
                                                        icon={<Trash2 className="w-4 h-4" />}
                                                        className="border-red-300 text-red-600 hover:bg-red-50"
                                                        onClick={() => setDeletingId(enrollment.id)}
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {enrollments.last_page > 1 && (
                    <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm">
                        <p className="text-sm text-gray-600">
                            {t('enrollments.index.range', { from: enrollments.from, to: enrollments.to, total: enrollments.total })}
                        </p>
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 px-2"
                                disabled={enrollments.current_page === 1}
                                onClick={() => goToPage(1)}>⟪</Button>
                            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 px-2"
                                disabled={enrollments.current_page === 1}
                                onClick={() => goToPage(enrollments.current_page - 1)}>‹</Button>

                            {windowedPages().map((page) => (
                                <Button
                                    key={page}
                                    variant={page === enrollments.current_page ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => goToPage(page)}
                                    className={page === enrollments.current_page
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-700'}
                                >
                                    {page}
                                </Button>
                            ))}

                            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 px-2"
                                disabled={enrollments.current_page === enrollments.last_page}
                                onClick={() => goToPage(enrollments.current_page + 1)}>›</Button>
                            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 px-2"
                                disabled={enrollments.current_page === enrollments.last_page}
                                onClick={() => goToPage(enrollments.last_page)}>⟫</Button>
                        </div>
                    </div>
                )}
            </div>

            <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('enrollments.index.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('enrollments.index.delete_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel className="border-gray-300 text-gray-700">{t('common.actions.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deletingId && handleDelete(deletingId)}>
                            {t('common.actions.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
