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

const statusMap: Record<Enrollment['status'], string> = {
    PENDING:   'En attente',
    ACTIVE:    'Actif',
    CANCELLED: 'Annulé',
};

const statusBadgeClass: Record<Enrollment['status'], string> = {
    PENDING:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    ACTIVE:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function PaymentBadge({ invoice, fmt }: Readonly<{ invoice: Invoice | null; fmt: (n: number) => string }>) {
    if (!invoice) {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Sans facture</span>;
    }
    if (invoice.amount_remaining <= 0 && invoice.total > 0) {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Payé</span>;
    }
    if (invoice.amount_paid > 0) {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Reste {fmt(invoice.amount_remaining)}</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Impayé</span>;
}

export default function Index({ enrollments, perPage, filters, finance, academicYears, classrooms }: Readonly<IndexProps>) {
    const fmt = useMoney();
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
            <Head title="Inscriptions & Paiements" />

            <div className="space-y-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><ClipboardList className="h-7 w-7 text-blue-600 shrink-0" />Inscriptions &amp; Paiements</h1>
                        <p className="mt-2 text-lg text-gray-600">Gérez les inscriptions des élèves par année académique</p>
                    </div>
                    <Button onClick={() => router.get(route('enrollments.create'))} className="bg-blue-600 hover:bg-blue-700 gap-2">
                        <Plus className="w-5 h-5" />
                        Nouvelle inscription
                    </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 shadow-sm">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total facturé</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2 break-words">{fmt(finance.billed)}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 shadow-sm">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Encaissé</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2 break-words">{fmt(finance.collected)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{finance.recovery_rate}% recouvré</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-6 shadow-sm">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Reste à recouvrer</p>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2 break-words">{fmt(finance.remaining)}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 shadow-sm">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Impayées</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">{finance.unpaid_count}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{fmt(finance.unpaid_amount)} sans paiement</p>
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
                                placeholder="Code, élève, classe, année..."
                                className="pl-10 border-gray-300"
                            />
                        </div>

                        <select
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Tous les statuts</option>
                            <option value="PENDING">En attente</option>
                            <option value="ACTIVE">Actif</option>
                            <option value="CANCELLED">Annulé</option>
                        </select>

                        <select
                            value={academicYearId}
                            onChange={(event) => setAcademicYearId(event.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Toutes les années</option>
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
                            <option value="">Toutes les classes</option>
                            {classrooms.map((classroom) => (
                                <option key={classroom.id} value={classroom.id}>
                                    {classroom.name} ({classroom.code})
                                </option>
                            ))}
                        </select>

                        <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                            <Search className="w-4 h-4" />
                            Rechercher
                        </Button>
                        {(search || status || academicYearId || classId) && (
                            <Button variant="outline" onClick={handleClearSearch} className="border-gray-300 text-gray-700">
                                Réinit.
                            </Button>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {/* Table header: count + per-page selector */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <p className="text-sm text-gray-600">
                            <span className="font-semibold">{enrollments.total}</span> inscription(s)
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Lignes par page :</span>
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
                                    <TableHead className="font-semibold text-gray-900">Code</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Élève</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Classe</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Année</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Date</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Statut</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Paiement</TableHead>
                                    <TableHead className="text-center font-semibold text-gray-900 w-28">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {enrollments.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <ClipboardList className="w-12 h-12 text-gray-300" />
                                                <p className="text-lg">Aucune inscription trouvée</p>
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
                                            <TableCell className="text-gray-700">{new Date(enrollment.enrollment_date).toLocaleDateString('fr-FR')}</TableCell>
                                            <TableCell>
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass[enrollment.status]}`}>
                                                    {statusMap[enrollment.status]}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <PaymentBadge invoice={enrollment.invoice} fmt={fmt} />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex gap-2 justify-center">
                                                    <IconButton
                                                        label="Voir"
                                                        icon={<Eye className="w-4 h-4" />}
                                                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                                        onClick={() => router.get(route('enrollments.show', enrollment.id))}
                                                    />
                                                    <IconButton
                                                        label="Modifier"
                                                        icon={<Pencil className="w-4 h-4" />}
                                                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                                        onClick={() => router.get(route('enrollments.edit', enrollment.id))}
                                                    />
                                                    <IconButton
                                                        label="Supprimer"
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
                            {enrollments.from}–{enrollments.to} sur <span className="font-semibold">{enrollments.total}</span> inscriptions
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
                        <AlertDialogTitle>Supprimer cette inscription ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel className="border-gray-300 text-gray-700">Annuler</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deletingId && handleDelete(deletingId)}>
                            Supprimer
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
