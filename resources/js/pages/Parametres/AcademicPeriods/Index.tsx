import { Head, router } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Search, Calendar, CheckCircle2, Eye, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';
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
}

interface AcademicPeriod {
    id: string;
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    type: 'trimestre' | 'semestre';
    order: number | null;
    is_current: boolean;
    academic_year_id: string;
    academic_year: AcademicYear;
    created_at: string;
}

interface PaginatedAcademicPeriods {
    data: AcademicPeriod[];
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
}

interface IndexProps {
    academicPeriods: PaginatedAcademicPeriods;
    filters: {
        search?: string;
        type?: string;
        academic_year_id?: string;
    };
}

export default function Index({ academicPeriods, filters }: Readonly<IndexProps>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');

    const handleDelete = (academicPeriodId: string) => {
        setIsDeleting(true);
        router.delete(route('academic-periods.destroy', academicPeriodId), {
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
        router.get(route('academic-periods.index'), { search: searchQuery }, { 
            preserveScroll: true,
            replace: true 
        });
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        router.get(route('academic-periods.index'), {}, { 
            preserveScroll: true,
            replace: true 
        });
    };

    const currentPeriods = academicPeriods.data.filter(p => p.is_current).length;

    const statsCards = [
        {
            title: t('parametres.academic_periods.stat_total'),
            value: academicPeriods.total,
            icon: Calendar,
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
        },
        {
            title: t('parametres.academic_periods.stat_active'),
            value: currentPeriods,
            icon: CheckCircle2,
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
        },
        {
            title: t('parametres.academic_periods.stat_page'),
            value: `${academicPeriods.current_page}/${academicPeriods.last_page}`,
            icon: Clock,
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

    const getTypeLabel = (type: string) => {
        return type === 'trimestre' ? t('parametres.academic_periods.type_trimester') : t('parametres.academic_periods.type_semester');
    };

    return (
        <AppLayout>
            <Head title={t('parametres.academic_periods.head')} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><Clock className="h-7 w-7 text-blue-600 shrink-0" />
                            {t('parametres.academic_periods.title')}
                        </h1>
                        <p className="mt-2 text-lg text-gray-600">
                            {t('parametres.academic_periods.subtitle')}
                        </p>
                    </div>
                    <Button 
                        onClick={() => router.get(route('academic-periods.create'))}
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="w-5 h-5" />
                        {t('parametres.academic_periods.new')}
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
                                placeholder={t('parametres.academic_periods.search_ph')}
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
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="font-semibold text-gray-900">{t('parametres.academic_periods.th_name')}</TableHead>
                                <TableHead className="font-semibold text-gray-900">{t('parametres.academic_periods.th_year')}</TableHead>
                                <TableHead className="font-semibold text-gray-900">{t('parametres.academic_periods.th_type')}</TableHead>
                                <TableHead className="font-semibold text-gray-900">{t('parametres.academic_periods.th_order')}</TableHead>
                                <TableHead className="font-semibold text-gray-900">{t('parametres.academic_periods.th_period')}</TableHead>
                                <TableHead className="font-semibold text-gray-900">{t('parametres.academic_periods.th_status')}</TableHead>
                                <TableHead className="text-right font-semibold text-gray-900">{t('parametres.common.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {academicPeriods.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-2">
                                            <Clock className="w-12 h-12 text-gray-300" />
                                            <p className="text-gray-500 font-medium">{t('parametres.academic_periods.empty')}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                academicPeriods.data.map((period) => (
                                    <TableRow key={period.id} className="hover:bg-gray-50">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-blue-100">
                                                    <Calendar className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {period.name}
                                                    </div>
                                                    {period.description && (
                                                        <div className="text-sm text-gray-500 truncate max-w-xs">
                                                            {period.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-600">
                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                                {period.academic_year.year}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                                period.type === 'trimestre' 
                                                    ? 'bg-blue-100 text-blue-700' 
                                                    : 'bg-purple-100 text-purple-700'
                                            }`}>
                                                {getTypeLabel(period.type)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-gray-600">
                                            {period.order || '-'}
                                        </TableCell>
                                        <TableCell className="text-gray-600 text-sm">
                                            {formatDate(period.start_date)} - {formatDate(period.end_date)}
                                        </TableCell>
                                        <TableCell>
                                            {period.is_current ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    {t('parametres.academic_periods.status_active')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                                                    {t('parametres.academic_periods.status_inactive')}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <IconButton
                                                    label={t('parametres.common.view')}
                                                    variant="ghost"
                                                    icon={<Eye className="w-4 h-4" />}
                                                    onClick={() => router.get(route('academic-periods.show', period.id))}
                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                />
                                                <IconButton
                                                    label={t('parametres.common.edit')}
                                                    variant="ghost"
                                                    icon={<Pencil className="w-4 h-4" />}
                                                    onClick={() => router.get(route('academic-periods.edit', period.id))}
                                                    className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                                                />
                                                <IconButton
                                                    label={t('parametres.common.delete')}
                                                    variant="ghost"
                                                    icon={<Trash2 className="w-4 h-4" />}
                                                    onClick={() => setDeleteConfirm(period.id)}
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
                {academicPeriods.last_page > 1 && (
                    <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                        <div className="text-sm text-gray-600">
                            {t('parametres.common.showing', { from: academicPeriods.from, to: academicPeriods.to, total: academicPeriods.total })}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    router.get(route('academic-periods.index'), {
                                        ...filters,
                                        page: academicPeriods.current_page - 1
                                    });
                                }}
                                disabled={academicPeriods.current_page === 1}
                                className="gap-1"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                {t('parametres.common.prev')}
                            </Button>

                            <div className="flex gap-1">
                                {Array.from({ length: Math.min(5, academicPeriods.last_page) }, (_, i) => {
                                    let pageNum;
                                    if (academicPeriods.last_page <= 5) {
                                        pageNum = i + 1;
                                    } else if (academicPeriods.current_page <= 3) {
                                        pageNum = i + 1;
                                    } else if (academicPeriods.current_page >= academicPeriods.last_page - 2) {
                                        pageNum = academicPeriods.last_page - 4 + i;
                                    } else {
                                        pageNum = academicPeriods.current_page - 2 + i;
                                    }

                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={academicPeriods.current_page === pageNum ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => {
                                                router.get(route('academic-periods.index'), {
                                                    ...filters,
                                                    page: pageNum
                                                });
                                            }}
                                            className={academicPeriods.current_page === pageNum ? "bg-blue-600 hover:bg-blue-700" : ""}
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
                                    router.get(route('academic-periods.index'), {
                                        ...filters,
                                        page: academicPeriods.current_page + 1
                                    });
                                }}
                                disabled={academicPeriods.current_page === academicPeriods.last_page}
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
                        <AlertDialogTitle>{t('parametres.academic_periods.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('parametres.academic_periods.delete_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-3">
                        <AlertDialogCancel disabled={isDeleting}>{t('parametres.common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? t('parametres.academic_periods.deleting') : t('parametres.common.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
