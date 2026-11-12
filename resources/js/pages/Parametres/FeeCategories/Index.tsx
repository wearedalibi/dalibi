import { Head, router } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Search, Tag, Eye, ChevronLeft, ChevronRight, X, Percent } from 'lucide-react';
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

interface FeeCategorie {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
}

interface PaginatedFeeCategories {
    data: FeeCategorie[];
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
}

interface IndexProps {
    feeCategories: PaginatedFeeCategories;
    message?: string;
    filters: {
        search?: string;
    };
}

export default function Index({ feeCategories, message, filters }: Readonly<IndexProps>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');

    const handleDelete = (categoryId: string) => {
        setIsDeleting(true);
        router.delete(route('fee-categories.destroy', categoryId), {
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
        router.get(route('fee-categories.index'), { search: searchQuery }, { 
            preserveScroll: true,
            replace: true 
        });
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        router.get(route('fee-categories.index'), {}, { 
            preserveScroll: true,
            replace: true 
        });
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <AppLayout>
            <Head title={t('parametres.fee_categories.head')} />

            <div className="space-y-6">
                {/* Header avec titre et bouton */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><Percent className="h-7 w-7 text-blue-600 shrink-0" />
                            {t('parametres.fee_categories.title')}
                        </h1>
                        <p className="mt-2 text-lg text-gray-600">
                            {t('parametres.fee_categories.subtitle')}
                        </p>
                    </div>
                    <Button
                        onClick={() => router.get(route('fee-categories.create'))}
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="w-5 h-5" />
                        {t('parametres.fee_categories.new')}
                    </Button>
                </div>

                {/* Stats Card */}
                <div className="bg-linear-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 ring-1 ring-blue-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">{t('parametres.fee_categories.stat_total')}</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{feeCategories.total}</p>
                        </div>
                        <Tag className="w-12 h-12 text-blue-600 opacity-20" />
                    </div>
                </div>

                {/* Search Bar */}
                <div className="rounded-2xl bg-linear-to-br from-slate-50 to-white p-4 shadow-sm ring-1 ring-slate-100">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <Input
                                placeholder={t('parametres.fee_categories.search_ph')}
                                className="pl-10 border-slate-200 focus:border-blue-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyPress}
                            />
                        </div>
                        <Button 
                            onClick={handleSearch}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Search className="w-4 h-4" />
                        </Button>
                        {searchQuery && (
                            <Button 
                                onClick={handleClearSearch}
                                variant="outline"
                                className="border-slate-200"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Message de succès */}
                {message && (
                    <div className="bg-green-50 border border-green-300 rounded-lg p-4">
                        <p className="text-green-700 font-medium">{message}</p>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50 border-b border-slate-200">
                            <TableRow>
                                <TableHead className="text-gray-700 font-semibold">{t('parametres.fee_categories.th_name')}</TableHead>
                                <TableHead className="text-gray-700 font-semibold">{t('parametres.fee_categories.th_description')}</TableHead>
                                <TableHead className="text-gray-700 font-semibold">{t('parametres.fee_categories.th_created')}</TableHead>
                                <TableHead className="text-gray-700 font-semibold text-right">{t('parametres.common.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {feeCategories.data.length > 0 ? (
                                feeCategories.data.map((category) => (
                                    <TableRow key={category.id} className="border-b border-slate-100 hover:bg-blue-50/30">
                                        <TableCell className="font-semibold text-gray-900">{category.name}</TableCell>
                                        <TableCell className="text-gray-600 max-w-md truncate">
                                            {category.description || '-'}
                                        </TableCell>
                                        <TableCell className="text-gray-600">
                                            {new Date(category.created_at).toLocaleDateString(dateLocale)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <IconButton
                                                    label={t('parametres.common.view')}
                                                    icon={<Eye className="w-4 h-4" />}
                                                    className="border-slate-200 text-gray-700 hover:bg-gray-100"
                                                    onClick={() => router.get(route('fee-categories.show', category.id))}
                                                />
                                                <IconButton
                                                    label={t('parametres.common.edit')}
                                                    icon={<Pencil className="w-4 h-4" />}
                                                    className="border-slate-200 text-gray-700 hover:bg-gray-100"
                                                    onClick={() => router.get(route('fee-categories.edit', category.id))}
                                                />
                                                <IconButton
                                                    label={t('parametres.common.delete')}
                                                    icon={<Trash2 className="w-4 h-4" />}
                                                    className="border-slate-200 text-gray-700 hover:bg-red-50 hover:text-red-600"
                                                    onClick={() => setDeleteConfirm(category.id)}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">
                                        <p className="text-gray-600 font-medium">{t('parametres.fee_categories.empty')}</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {feeCategories.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                            {t('parametres.common.showing', { from: feeCategories.from, to: feeCategories.to, total: feeCategories.total })}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-slate-200"
                                disabled={feeCategories.current_page === 1}
                                onClick={() => router.get(route('fee-categories.index'), 
                                    { search: searchQuery, page: feeCategories.current_page - 1 }, 
                                    { preserveScroll: true }
                                )}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-slate-200"
                                disabled={feeCategories.current_page === feeCategories.last_page}
                                onClick={() => router.get(route('fee-categories.index'), 
                                    { search: searchQuery, page: feeCategories.current_page + 1 }, 
                                    { preserveScroll: true }
                                )}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('parametres.fee_categories.delete_title')}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t('parametres.fee_categories.delete_desc')}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex justify-end gap-3">
                            <AlertDialogCancel className="border-slate-200">{t('parametres.common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                                disabled={isDeleting}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {isDeleting ? t('parametres.fee_categories.deleting') : t('parametres.common.delete')}
                            </AlertDialogAction>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
}
