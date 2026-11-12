import { Head, router } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Search, BookOpen, CheckCircle2, Eye, ChevronLeft, ChevronRight, X } from 'lucide-react';
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

interface Subject {
    id: string;
    name: string;
    code: string;
    description: string | null;
    created_at: string;
}

interface PaginatedSubjects {
    data: Subject[];
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
}

interface IndexProps {
    subjects: PaginatedSubjects;
    message?: string;
    filters: {
        search?: string;
    };
}

export default function Index({ subjects, message, filters }: Readonly<IndexProps>) {
    const { t } = useTranslation();
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');

    const handleDelete = (subjectId: string) => {
        setIsDeleting(true);
        router.delete(route('subjects.destroy', subjectId), {
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
        router.get(route('subjects.index'), { search: searchQuery }, { 
            preserveScroll: true,
            replace: true 
        });
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        router.get(route('subjects.index'), {}, { 
            preserveScroll: true,
            replace: true 
        });
    };

    const statsCards = [
        {
            title: t('parametres.subjects.stat_total'),
            value: subjects.total,
            icon: BookOpen,
            cardClass: 'bg-linear-to-br from-blue-50/70 to-white ring-1 ring-blue-100',
            iconWrapClass: 'bg-blue-100',
            textColor: 'text-blue-600',
        },
        {
            title: t('parametres.subjects.stat_shown'),
            value: subjects.data.length,
            icon: CheckCircle2,
            cardClass: 'bg-linear-to-br from-emerald-50/70 to-white ring-1 ring-emerald-100',
            iconWrapClass: 'bg-emerald-100',
            textColor: 'text-green-600',
        },
        {
            title: t('parametres.subjects.stat_page'),
            value: `${subjects.current_page}/${subjects.last_page}`,
            icon: BookOpen,
            cardClass: 'bg-linear-to-br from-violet-50/70 to-white ring-1 ring-violet-100',
            iconWrapClass: 'bg-violet-100',
            textColor: 'text-purple-600',
        },
    ];

    return (
        <AppLayout>
            <Head title={t('parametres.subjects.head')} />

            <div className="w-full space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><BookOpen className="h-7 w-7 text-blue-600 shrink-0" />
                            {t('parametres.subjects.title')}
                        </h1>
                        <p className="mt-2 text-lg text-gray-600">
                            {t('parametres.subjects.subtitle')}
                        </p>
                    </div>
                    <Button
                        onClick={() => router.get(route('subjects.create'))}
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="w-5 h-5" />
                        {t('parametres.subjects.new')}
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {statsCards.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={stat.title}
                                className={`${stat.cardClass} rounded-2xl p-6 transition-all hover:shadow-md shadow-sm`}
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
                                    <div className={`w-12 h-12 rounded-full ${stat.iconWrapClass} flex items-center justify-center`}>
                                        <Icon className={`w-6 h-6 ${stat.textColor}`} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Message */}
                {message && (
                    <div className="bg-green-50 text-green-800 px-4 py-3 rounded-lg flex items-center gap-3 shadow-sm">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>{message}</span>
                    </div>
                )}

                {/* Barre de recherche */}
                <div className="rounded-2xl bg-linear-to-br from-slate-50/70 to-white ring-1 ring-slate-200 shadow-sm">
                    <div className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-1 relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 group-focus-within:text-blue-600 transition" />
                                <Input
                                    type="text"
                                    placeholder={t('parametres.subjects.search_ph')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="pl-10 pr-10 bg-gray-50 border-gray-200 focus:border-blue-300 focus:bg-white transition"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={handleClearSearch}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <Button
                                onClick={handleSearch}
                                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shrink-0 transition"
                            >
                                <Search className="w-4 h-4" />
                                {t('parametres.common.search')}
                            </Button>
                        </div>
                        {searchQuery && (
                            <p className="text-sm text-gray-500 mt-3">
                                {t('parametres.subjects.search_results')} <span className="font-semibold text-gray-700">« {searchQuery} »</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Tableau */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow className="border-b border-gray-200">
                                    <TableHead className="font-semibold text-gray-900">{t('parametres.subjects.th_code')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('parametres.subjects.th_name')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('parametres.subjects.th_description')}</TableHead>
                                    <TableHead className="text-center font-semibold text-gray-900 w-24">{t('parametres.common.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subjects.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
                                            className="text-center py-12 text-gray-500"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <BookOpen className="w-12 h-12 text-gray-300" />
                                                <p className="text-lg">{t('parametres.subjects.empty')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    subjects.data.map((subject) => (
                                        <TableRow key={subject.id} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors">
                                            <TableCell className="font-semibold text-gray-900">
                                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                                    {subject.code}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-medium text-gray-900">
                                                {subject.name}
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {subject.description ? (
                                                    <span className="line-clamp-2">{subject.description}</span>
                                                ) : (
                                                    <span className="text-gray-400 italic">{t('parametres.subjects.no_description')}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex gap-2 justify-center">
                                                    <IconButton
                                                        label={t('parametres.common.view')}
                                                        icon={<Eye className="w-4 h-4" />}
                                                        className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                        onClick={() => router.visit(route('subjects.show', subject.id))}
                                                    />
                                                    <IconButton
                                                        label={t('parametres.common.edit')}
                                                        icon={<Pencil className="w-4 h-4" />}
                                                        className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                        onClick={() => router.get(route('subjects.edit', subject.id))}
                                                    />
                                                    <IconButton
                                                        label={t('parametres.common.delete')}
                                                        icon={<Trash2 className="w-4 h-4" />}
                                                        className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                        onClick={() => setDeleteConfirm(subject.id)}
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
                {subjects.last_page > 1 && (
                    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <p className="text-sm text-gray-600">
                                {t('parametres.subjects.page_showing')} <span className="font-semibold">{subjects.from}</span> {t('parametres.subjects.page_to')} <span className="font-semibold">{subjects.to}</span> {t('parametres.subjects.page_of')} <span className="font-semibold">{subjects.total}</span> {t('parametres.subjects.page_unit')}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={subjects.current_page === 1}
                                    onClick={() => router.get(route('subjects.index'), { 
                                        page: subjects.current_page - 1, 
                                        search: filters.search 
                                    }, { preserveScroll: true })}
                                    className="border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    {t('parametres.common.prev')}
                                </Button>
                                <div className="flex gap-1">
                                    {Array.from({ length: Math.min(5, subjects.last_page) }, (_, i) => {
                                        let page = i + 1;
                                        if (subjects.last_page > 5 && subjects.current_page > 3) {
                                            page = subjects.current_page - 2 + i;
                                        }
                                        if (page > subjects.last_page) return null;
                                        return (
                                            <Button
                                                key={page}
                                                variant={page === subjects.current_page ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => router.get(route('subjects.index'), { 
                                                    page, 
                                                    search: filters.search 
                                                }, { preserveScroll: true })}
                                                className={page === subjects.current_page 
                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                                    : 'border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
                                                }
                                            >
                                                {page}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={subjects.current_page === subjects.last_page}
                                    onClick={() => router.get(route('subjects.index'), { 
                                        page: subjects.current_page + 1, 
                                        search: filters.search 
                                    }, { preserveScroll: true })}
                                    className="border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {t('parametres.common.next')}
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                            <p className="text-sm text-gray-600">
                                {t('parametres.subjects.page_label')} <span className="font-semibold">{subjects.current_page}</span> {t('parametres.subjects.page_of')} <span className="font-semibold">{subjects.last_page}</span>
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Dialog de confirmation suppression */}
            <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('parametres.subjects.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('parametres.subjects.delete_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-3 justify-end">
                        <AlertDialogCancel>{t('parametres.common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? t('parametres.subjects.deleting') : t('parametres.common.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
