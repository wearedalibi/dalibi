import { Head, router } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Search, BookOpen, CheckCircle2, Eye, ChevronLeft, ChevronRight, X, Users, ClipboardList, BarChart3 } from 'lucide-react';
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
import { route } from '@/helpers/route';
import AppLayout from '@/layouts/app-layout';

interface Subject {
    id: string;
    name: string;
}

interface Teacher {
    firstname: string;
    lastname: string;
    id: string;
    name: string;
}

interface AcademicYear {
    id: string;
    year: string;
}

interface Classroom {
    id: string;
    name: string;
}

interface SubjectAssignment {
    id: string;
    subject: Subject;
    teacher: Teacher;
    academic_year: AcademicYear;
    classroom: Classroom;
    active: boolean;
    notes: string | null;
    created_at: string;
}

interface PaginatedAssignments {
    data: SubjectAssignment[];
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
}

interface IndexProps {
    assignments: PaginatedAssignments;
    academicYears: AcademicYear[];
    classrooms: Classroom[];
    filters: {
        search?: string;
        active?: string;
        academic_year_id?: string;
        class_id?: string;
    };
}

export default function Index({ assignments, academicYears, classrooms, filters }: Readonly<IndexProps>) {
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [yearFilter, setYearFilter] = useState(filters.academic_year_id ?? '');
    const [classFilter, setClassFilter] = useState(filters.class_id ?? '');

    const handleDelete = (assignmentId: string) => {
        setIsDeleting(true);
        router.delete(route('subject-assignments.destroy', assignmentId), {
            onSuccess: () => {
                setDeleteConfirm(null);
                setIsDeleting(false);
            },
            onError: () => {
                setIsDeleting(false);
            },
        });
    };

    // Applique tous les filtres via des paramètres d'URL (année, classe, recherche).
    const applyFilters = (overrides: Record<string, string> = {}) => {
        router.get(route('subject-assignments.index'), {
            search: searchQuery,
            academic_year_id: yearFilter,
            class_id: classFilter,
            ...overrides,
        }, { preserveScroll: true, replace: true });
    };

    const handleSearch = () => applyFilters();

    const handleClearSearch = () => {
        setSearchQuery('');
        applyFilters({ search: '' });
    };

    const handleYearChange = (value: string) => {
        setYearFilter(value);
        applyFilters({ academic_year_id: value });
    };

    const handleClassChange = (value: string) => {
        setClassFilter(value);
        applyFilters({ class_id: value });
    };

    const activeAssignments = assignments.data.filter(a => a.active).length;

    const statsCards = [
        {
            title: 'Affectations totales',
            value: assignments.total,
            icon: BookOpen,
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
        },
        {
            title: 'Affectations actives',
            value: activeAssignments,
            icon: CheckCircle2,
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
        },
        {
            title: 'Page',
            value: `${assignments.current_page}/${assignments.last_page}`,
            icon: Users,
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-600',
        },
    ];

    return (
        <AppLayout>
            <Head title="Affectations de matières" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><ClipboardList className="h-7 w-7 text-blue-600 shrink-0" />
                            Affectations de matières
                        </h1>
                        <p className="mt-2 text-lg text-gray-600">
                            Gérez les affectations des enseignants aux matières et classes
                        </p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <Button
                            variant="outline"
                            onClick={() => router.get(route('subject-assignments.statistics'))}
                            className="gap-2"
                        >
                            <BarChart3 className="w-5 h-5" />
                            Statistiques des affectations
                        </Button>
                        <Button
                            onClick={() => router.get(route('subject-assignments.create'))}
                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                            <Plus className="w-5 h-5" />
                            Nouvelle affectation
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {statsCards.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={stat.title}
                                className={`${stat.bgColor} rounded-lg p-6 transition-all hover:shadow-md shadow-sm`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">
                                            {stat.title}
                                        </p>
                                        <p className={`text-3xl font-bold ${stat.textColor} mt-2`}>
                                            {stat.value}
                                        </p>
                                    </div>
                                    <div className={`${stat.bgColor}`}>
                                        <Icon className={`w-10 h-10 ${stat.textColor}`} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Filtres */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex flex-wrap gap-3 items-center">
                        <select
                            id="filter_year"
                            aria-label="Filtrer par année"
                            value={yearFilter}
                            onChange={(e) => handleYearChange(e.target.value)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            <option value="">Toutes les années</option>
                            {academicYears.map((year) => (
                                <option key={year.id} value={year.id}>{year.year}</option>
                            ))}
                        </select>

                        <select
                            id="filter_class"
                            aria-label="Filtrer par classe"
                            value={classFilter}
                            onChange={(e) => handleClassChange(e.target.value)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            <option value="">Toutes les classes</option>
                            {classrooms.map((classroom) => (
                                <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
                            ))}
                        </select>

                        <div className="relative flex-1 min-w-[220px] ml-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Rechercher par matière, enseignant ou classe..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSearch();
                                    }
                                }}
                                className="pl-10 pr-10"
                            />
                            {searchQuery && (
                                <button
                                    onClick={handleClearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow className="border-b border-gray-200">
                                <TableHead className="font-semibold text-gray-900">Matière</TableHead>
                                <TableHead className="font-semibold text-gray-900">Enseignant</TableHead>
                                <TableHead className="font-semibold text-gray-900">Classe</TableHead>
                                <TableHead className="font-semibold text-gray-900">Année</TableHead>
                                <TableHead className="font-semibold text-gray-900">Statut</TableHead>
                                <TableHead className="text-center font-semibold text-gray-900 w-28">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assignments.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-2">
                                            <BookOpen className="w-12 h-12 text-gray-300" />
                                            <p className="text-gray-500 font-medium">Aucune affectation trouvée</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                assignments.data.map((assignment) => (
                                    <TableRow key={assignment.id} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-blue-100">
                                                    <BookOpen className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div className="font-medium text-gray-900">
                                                    {assignment.subject.name}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4" />
                                                {assignment.teacher.firstname} {assignment.teacher.lastname}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-600">
                                            {assignment.classroom.name}
                                        </TableCell>
                                        <TableCell className="text-gray-600">
                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                                {assignment.academic_year.year}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {assignment.active ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                                                    Inactive
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex gap-2 justify-center">
                                                <IconButton
                                                    label="Voir"
                                                    icon={<Eye className="w-4 h-4" />}
                                                    onClick={() => router.get(route('subject-assignments.show', assignment.id))}
                                                    className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                />
                                                <IconButton
                                                    label="Modifier"
                                                    icon={<Pencil className="w-4 h-4" />}
                                                    onClick={() => router.get(route('subject-assignments.edit', assignment.id))}
                                                    className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                />
                                                <IconButton
                                                    label="Supprimer"
                                                    icon={<Trash2 className="w-4 h-4" />}
                                                    onClick={() => setDeleteConfirm(assignment.id)}
                                                    className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
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

                {/* Pagination */}
                {assignments.last_page > 1 && (
                    <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4">
                        <div className="text-sm text-gray-600">
                            Affichage de {assignments.from} à {assignments.to} sur {assignments.total} résultats
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    router.get(route('subject-assignments.index'), {
                                        ...filters,
                                        page: assignments.current_page - 1
                                    });
                                }}
                                disabled={assignments.current_page === 1}
                                className="gap-1"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Précédent
                            </Button>

                            <div className="flex gap-1">
                                {Array.from({ length: Math.min(5, assignments.last_page) }, (_, i) => {
                                    let pageNum;
                                    if (assignments.last_page <= 5) {
                                        pageNum = i + 1;
                                    } else if (assignments.current_page <= 3) {
                                        pageNum = i + 1;
                                    } else if (assignments.current_page >= assignments.last_page - 2) {
                                        pageNum = assignments.last_page - 4 + i;
                                    } else {
                                        pageNum = assignments.current_page - 2 + i;
                                    }

                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={assignments.current_page === pageNum ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => {
                                                router.get(route('subject-assignments.index'), {
                                                    ...filters,
                                                    page: pageNum
                                                });
                                            }}
                                            className={assignments.current_page === pageNum ? "bg-blue-600 hover:bg-blue-700" : ""}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    router.get(route('subject-assignments.index'), {
                                        ...filters,
                                        page: assignments.current_page + 1
                                    });
                                }}
                                disabled={assignments.current_page === assignments.last_page}
                                className="gap-1"
                            >
                                Suivant
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer cette affectation ? Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-3">
                        <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? 'Suppression...' : 'Supprimer'}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
