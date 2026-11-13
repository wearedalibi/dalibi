import { Head, router } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Search, Calendar, CheckCircle2, Eye, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface AcademicYear {
    id: string;
    year: string;
    start_date: string;
    end_date: string;
    active: boolean;
    created_at: string;
}

interface PaginatedAcademicYears {
    data: AcademicYear[];
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
}

interface IndexProps {
    academicYears: PaginatedAcademicYears;
    filters: {
        search?: string;
    };
}

export default function Index({ academicYears, filters }: Readonly<IndexProps>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');

    const handleDelete = (academicYearId: string) => {
        setIsDeleting(true);
        router.delete(route('academic-years.destroy', academicYearId), {
            onSuccess: () => {
                setDeleteConfirm(null);
                setIsDeleting(false);
            },
            onError: () => {
                setIsDeleting(false);
            },
        });
    };

    const handleSearch = () => {
        router.get(route('academic-years.index'), { search: searchQuery }, { 
            preserveScroll: true,
            replace: true 
        });
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        router.get(route('academic-years.index'), {}, { 
            preserveScroll: true,
            replace: true 
        });
    };

    const activeYears = academicYears.data.filter(y => y.active).length;

    const statsCards = [
        {
            title: t('parametres.academic_years.stat_total'),
            value: academicYears.total,
            icon: Calendar,
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
        },
        {
            title: t('parametres.academic_years.stat_active'),
            value: activeYears,
            icon: CheckCircle2,
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
        },
        {
            title: t('parametres.academic_years.stat_page'),
            value: `${academicYears.current_page}/${academicYears.last_page}`,
            icon: Calendar,
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-600',
        },
    ];

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(dateLocale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <AppLayout>
            <Head title={t('parametres.academic_years.head')} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><Calendar className="h-7 w-7 text-blue-600 shrink-0" />
                            {t('parametres.academic_years.title')}
                        </h1>
                        <p className="mt-2 text-lg text-gray-600">
                            {t('parametres.academic_years.subtitle')}
                        </p>
                    </div>
                    <Button 
                        onClick={() => router.get(route('academic-years.create'))}
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="w-5 h-5" />
                        {t('parametres.academic_years.new')}
                    </Button>
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

                {/* Search */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex gap-3 items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                type="text"
                                placeholder={t('parametres.academic_years.search_ph')}
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
                        <Button 
                            onClick={handleSearch}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {t('parametres.common.search')}
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="font-semibold text-gray-900">{t('parametres.academic_years.th_year')}</TableHead>
                                <TableHead className="font-semibold text-gray-900">{t('parametres.academic_years.th_start')}</TableHead>
                                <TableHead className="font-semibold text-gray-900">{t('parametres.academic_years.th_end')}</TableHead>
                                <TableHead className="font-semibold text-gray-900">{t('parametres.academic_years.th_status')}</TableHead>
                                <TableHead className="text-right font-semibold text-gray-900">{t('parametres.common.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {academicYears.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        {t('parametres.academic_years.empty')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                academicYears.data.map((academicYear) => (
                                    <TableRow key={academicYear.id} className="hover:bg-gray-50">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                                                    {academicYear.year}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-600">
                                            {formatDate(academicYear.start_date)}
                                        </TableCell>
                                        <TableCell className="text-gray-600">
                                            {formatDate(academicYear.end_date)}
                                        </TableCell>
                                        <TableCell>
                                            {academicYear.active ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    {t('parametres.academic_years.status_active')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                                                    {t('parametres.academic_years.status_inactive')}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <IconButton
                                                    label={t('parametres.common.view')}
                                                    variant="ghost"
                                                    icon={<Eye className="w-4 h-4" />}
                                                    onClick={() => router.get(route('academic-years.show', academicYear.id))}
                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                />
                                                <IconButton
                                                    label={t('parametres.common.edit')}
                                                    variant="ghost"
                                                    icon={<Pencil className="w-4 h-4" />}
                                                    onClick={() => router.get(route('academic-years.edit', academicYear.id))}
                                                    className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                                                />
                                                <IconButton
                                                    label={t('parametres.common.delete')}
                                                    variant="ghost"
                                                    icon={<Trash2 className="w-4 h-4" />}
                                                    onClick={() => setDeleteConfirm(academicYear.id)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {academicYears.last_page > 1 && (
                    <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                        <div className="text-sm text-gray-600">
                            {t('parametres.common.showing', { from: academicYears.from, to: academicYears.to, total: academicYears.total })}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    router.get(route('academic-years.index'), {
                                        ...filters,
                                        page: academicYears.current_page - 1
                                    });
                                }}
                                disabled={academicYears.current_page === 1}
                                className="gap-1"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                {t('parametres.common.prev')}
                            </Button>

                            <div className="flex gap-1">
                                {Array.from({ length: Math.min(5, academicYears.last_page) }, (_, i) => {
                                    let pageNum;
                                    if (academicYears.last_page <= 5) {
                                        pageNum = i + 1;
                                    } else if (academicYears.current_page <= 3) {
                                        pageNum = i + 1;
                                    } else if (academicYears.current_page >= academicYears.last_page - 2) {
                                        pageNum = academicYears.last_page - 4 + i;
                                    } else {
                                        pageNum = academicYears.current_page - 2 + i;
                                    }

                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={academicYears.current_page === pageNum ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => {
                                                router.get(route('academic-years.index'), {
                                                    ...filters,
                                                    page: pageNum
                                                });
                                            }}
                                            className={academicYears.current_page === pageNum ? "bg-blue-600 hover:bg-blue-700" : ""}
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
                                    router.get(route('academic-years.index'), {
                                        ...filters,
                                        page: academicYears.current_page + 1
                                    });
                                }}
                                disabled={academicYears.current_page === academicYears.last_page}
                                className="gap-1"
                            >
                                {t('parametres.common.next')}
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
                        <AlertDialogTitle>{t('parametres.academic_years.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('parametres.academic_years.delete_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-3">
                        <AlertDialogCancel disabled={isDeleting}>{t('parametres.common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? t('parametres.academic_years.deleting') : t('parametres.common.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
