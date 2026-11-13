import { Head, router } from '@inertiajs/react';
import { useMoney } from '@/helpers/money';
import { Plus, Pencil, Trash2, Search, Award, Eye, ChevronLeft, ChevronRight, X, Users, Calendar, GraduationCap } from 'lucide-react';
import { useState, useCallback } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface Student {
    id: string;
    matricule: string;
    firstname: string;
    lastname: string;
}

interface Scholarship {
    id: string;
    name: string;
    value: number;
}

interface AcademicYear {
    id: string;
    year: string;
}

interface StudentScholarship {
    id: string;
    notes?: string;
    created_at: string;
    student: Student;
    scholarship: Scholarship;
    academic_year: AcademicYear;
}

interface Props {
    studentScholarships: {
        data: StudentScholarship[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
    };
    scholarships: Scholarship[];
    academicYears: AcademicYear[];
    filters: {
        search?: string;
        scholarship_id?: string;
        academic_year_id?: string;
        per_page?: number;
    };
}

export default function Index({ studentScholarships, scholarships, academicYears, filters }: Readonly<Props>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedScholarship, setSelectedScholarship] = useState<StudentScholarship | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedScholarshipFilter, setSelectedScholarshipFilter] = useState(filters.scholarship_id || '');
    const [selectedAcademicYearFilter, setSelectedAcademicYearFilter] = useState(filters.academic_year_id || '');
    const [perPage, setPerPage] = useState(filters.per_page || 10);

    const currentFilters = {
        search: searchQuery || undefined,
        scholarship_id: selectedScholarshipFilter || undefined,
        academic_year_id: selectedAcademicYearFilter || undefined,
        per_page: perPage || undefined,
    };

    const formatMoney = useMoney();

    const handleSearch = useCallback(() => {
        router.get(route('student-scholarships.index'), currentFilters, {
            preserveScroll: true,
            replace: true
        });
    }, [currentFilters]);

    const handlePerPageChange = useCallback((value: string) => {
        const newPerPage = parseInt(value);
        setPerPage(newPerPage);
        // Appliquer immédiatement le changement de pagination
        router.get(route('student-scholarships.index'), {
            ...currentFilters,
            per_page: newPerPage
        }, {
            preserveScroll: true,
            replace: true
        });
    }, [currentFilters]);

    const handleClearFilters = useCallback(() => {
        setSearchQuery('');
        setSelectedScholarshipFilter('');
        setSelectedAcademicYearFilter('');
        setPerPage(10);

        router.get(route('student-scholarships.index'), {}, {
            preserveScroll: true,
            replace: true
        });
    }, []);

    const handleDelete = useCallback((scholarship: StudentScholarship) => {
        setSelectedScholarship(scholarship);
        setDeleteDialogOpen(true);
    }, []);

    const confirmDelete = useCallback(() => {
        if (!selectedScholarship) return;

        setIsDeleting(true);
        router.delete(route('student-scholarships.destroy', selectedScholarship.id), {
            onSuccess: () => {
                setDeleteDialogOpen(false);
                setSelectedScholarship(null);
                setIsDeleting(false);
            },
            onError: () => {
                setIsDeleting(false);
            },
        });
    }, [selectedScholarship]);

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    }, [handleSearch]);

    return (
        <AppLayout>
            <Head title={t('scholarships.index.title')} />

            <div className="space-y-6">
                {/* Header avec titre et bouton */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><GraduationCap className="h-7 w-7 text-blue-600 shrink-0" />
                            {t('scholarships.index.title')}
                        </h1>
                        <p className="mt-3 text-base text-gray-600">
                            {t('scholarships.index.subtitle')}
                        </p>
                    </div>
                    <Button
                        onClick={() => router.visit(route('student-scholarships.create'))}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('scholarships.index.new')}
                    </Button>
                </div>

                {/* Statistiques */}
                <div className="bg-linear-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-gray-300 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600">
                            <Award className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">{t('scholarships.index.total')}</p>
                            <p className="text-2xl font-bold text-gray-900">{studentScholarships.total}</p>
                        </div>
                    </div>
                </div>

                {/* Filtres et recherche */}
                <div className="bg-white rounded-lg border border-gray-300 shadow-sm p-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {/* Recherche */}
                        <div className="lg:col-span-2">
                            <Label htmlFor="search" className="text-sm font-medium text-gray-700">
                                {t('scholarships.index.search')}
                            </Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    id="search"
                                    type="text"
                                    placeholder={t('scholarships.index.search_ph')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    className="pl-10 border-gray-300"
                                />
                            </div>
                        </div>

                        {/* Filtre par bourse */}
                        <div>
                            <Label htmlFor="scholarship-filter" className="text-sm font-medium text-gray-700">
                                {t('scholarships.index.scholarship')}
                            </Label>
                            <Select value={selectedScholarshipFilter} onValueChange={setSelectedScholarshipFilter}>
                                <SelectTrigger className="border-gray-300">
                                    <SelectValue placeholder={t('scholarships.index.all_scholarships')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {scholarships.map((scholarship) => (
                                        <SelectItem key={scholarship.id} value={scholarship.id}>
                                            {scholarship.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Filtre par année académique */}
                        <div>
                            <Label htmlFor="academic-year-filter" className="text-sm font-medium text-gray-700">
                                {t('scholarships.index.academic_year')}
                            </Label>
                            <Select value={selectedAcademicYearFilter} onValueChange={setSelectedAcademicYearFilter}>
                                <SelectTrigger className="border-gray-300">
                                    <SelectValue placeholder={t('scholarships.index.all_years')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {academicYears.map((year) => (
                                        <SelectItem key={year.id} value={year.id}>
                                            {year.year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Boutons d'action */}
                    <div className="flex gap-3 mt-4">
                        {(searchQuery || selectedScholarshipFilter || selectedAcademicYearFilter) && (
                            <Button
                                variant="outline"
                                onClick={handleClearFilters}
                                className="border-gray-300"
                            >
                                <X className="h-4 w-4 mr-2" />
                                {t('scholarships.index.clear_filters')}
                            </Button>
                        )}
                        <Button
                            onClick={handleSearch}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Search className="h-4 w-4 mr-2" />
                            {t('common.actions.search')}
                        </Button>
                    </div>
                </div>

                {/* Contrôles de pagination */}
                <div className="bg-white rounded-lg border border-gray-300 shadow-sm p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div>
                                <Label htmlFor="per-page" className="text-sm font-medium text-gray-700">
                                    {t('scholarships.index.per_page')}
                                </Label>
                                <Select value={perPage.toString()} onValueChange={(value) => setPerPage(parseInt(value))}>
                                    <SelectTrigger className="border-gray-300 w-20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tableau */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow className="border-b border-gray-200">
                                    <TableHead className="font-semibold text-gray-900">{t('scholarships.index.col_student')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('scholarships.index.col_scholarship')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('scholarships.index.col_year')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('scholarships.index.col_date')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900 text-center">{t('scholarships.index.col_actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentScholarships.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Award className="w-12 h-12 text-gray-300" />
                                                <p className="text-lg">{t('scholarships.index.empty')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    studentScholarships.data.map((scholarship) => (
                                        <TableRow key={scholarship.id} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors">
                                            <TableCell className="font-semibold text-gray-900">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                                        <Users className="h-5 w-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{scholarship.student.firstname} {scholarship.student.lastname}</div>
                                                        <div className="text-sm text-gray-500">{scholarship.student.matricule}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Award className="h-4 w-4 text-green-600" />
                                                    <div>
                                                        <div className="font-medium text-gray-900">{scholarship.scholarship.name}</div>
                                                        <div className="text-sm text-green-600 font-semibold">{formatMoney(scholarship.scholarship.value)}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-blue-600" />
                                                    <span className="font-medium text-gray-900">{scholarship.academic_year.year}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {new Date(scholarship.created_at).toLocaleDateString(dateLocale)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex gap-2 justify-center">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.visit(route('student-scholarships.show', scholarship.id))}
                                                        className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.visit(route('student-scholarships.edit', scholarship.id))}
                                                        className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDelete(scholarship)}
                                                        className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {studentScholarships.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-gray-100 bg-white px-6 py-4">
                            <div className="text-sm text-gray-600">
                                {t('scholarships.index.showing', { from: studentScholarships.from, to: studentScholarships.to, total: studentScholarships.total })}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={studentScholarships.current_page === 1}
                                    onClick={() => router.get(route('student-scholarships.index', {
                                        page: studentScholarships.current_page - 1,
                                        search: searchQuery,
                                        scholarship_id: selectedScholarshipFilter,
                                        academic_year_id: selectedAcademicYearFilter,
                                        per_page: perPage
                                    }))}
                                    className="border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={studentScholarships.current_page === studentScholarships.last_page}
                                    onClick={() => router.get(route('student-scholarships.index', {
                                        page: studentScholarships.current_page + 1,
                                        search: searchQuery,
                                        scholarship_id: selectedScholarshipFilter,
                                        academic_year_id: selectedAcademicYearFilter,
                                        per_page: perPage
                                    }))}
                                    className="border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
    

        {/* Dialog de confirmation de suppression */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('scholarships.index.delete_title')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('scholarships.index.delete_confirm')}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-3">
                <AlertDialogCancel disabled={isDeleting}>{t('common.actions.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                    onClick={confirmDelete}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700"
                >
                    {isDeleting ? t('scholarships.index.deleting') : t('common.actions.delete')}
                </AlertDialogAction>
            </div>
        </AlertDialogContent>
        </AlertDialog>
        </AppLayout>    
    );
}