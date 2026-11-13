import { Head, router } from '@inertiajs/react';
import { useMoney } from '@/helpers/money';
import { Plus, Pencil, Trash2, Search, DollarSign, Eye, ChevronLeft, ChevronRight, X, Layers, School, TrendingUp, Copy } from 'lucide-react';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface AcademicYear {
    id: string;
    year: string;
    active?: boolean;
}

interface FeeCategory {
    id: string;
    name: string;
}

interface Classroom {
    id: string;
    name: string;
    code: string;
}

interface FeeStructure {
    id: string;
    amount: number;
    created_at: string;
    academic_year: AcademicYear;
    fee_category: FeeCategory;
    classroom: Classroom;
}

interface PaginatedFeeStructures {
    data: FeeStructure[];
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
}

interface IndexProps {
    feeStructures: PaginatedFeeStructures;
    academicYears: AcademicYear[];
    feeCategories: FeeCategory[];
    classrooms: Classroom[];
    stats: {
        count: number;
        amount_total: number;
        amount_avg: number;
        amount_min: number;
        amount_max: number;
        amount_range: number;
        classes_covered: number;
        categories_covered: number;
    };
    message?: string;
    filters: {
        search?: string;
        academic_year_id?: string;
        fee_category_id?: string;
        class_id?: string;
        min_amount?: string;
        max_amount?: string;
    };
}

export default function Index({ feeStructures, academicYears, feeCategories, classrooms, stats, message, filters }: Readonly<IndexProps>) {
    const { t } = useTranslation();
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [academicYearId, setAcademicYearId] = useState(filters.academic_year_id || 'all');
    const [feeCategoryId, setFeeCategoryId] = useState(filters.fee_category_id || 'all');
    const [classId, setClassId] = useState(filters.class_id || 'all');
    const [minAmount, setMinAmount] = useState(filters.min_amount || '');
    const [maxAmount, setMaxAmount] = useState(filters.max_amount || '');

    const activeYear = academicYears.find((y) => y.active) ?? null;
    const [replicateOpen, setReplicateOpen] = useState(false);
    const [sourceYearId, setSourceYearId] = useState('');
    const [replicating, setReplicating] = useState(false);

    const handleReplicate = () => {
        if (!sourceYearId) return;
        setReplicating(true);
        router.post(route('fee-structures.replicate'), { source_year_id: sourceYearId }, {
            preserveScroll: true,
            onSuccess: () => { setReplicateOpen(false); setSourceYearId(''); },
            onFinish: () => setReplicating(false),
        });
    };

    const formatMoney = useMoney();

    const getCategoryColor = (categoryName: string): string => {
        const colorMap: Record<string, string> = {
            'Inscription': 'bg-red-50 text-red-700',
            'Écolage': 'bg-blue-50 text-blue-700',
            'Tenue scolaire': 'bg-purple-50 text-purple-700',
            'Transport': 'bg-amber-50 text-amber-700',
            'Cantine': 'bg-green-50 text-green-700',
            'Activité': 'bg-pink-50 text-pink-700',
        };
        return colorMap[categoryName] || 'bg-gray-50 text-gray-700';
    };

    const handleDelete = (feeStructureId: string) => {
        setIsDeleting(true);
        router.delete(route('fee-structures.destroy', feeStructureId), {
            onSuccess: () => {
                setDeleteConfirm(null);
                setIsDeleting(false);
            },
            onError: () => {
                setIsDeleting(false);
            },
        });
    };

    const buildFilters = () => ({
        search: searchQuery || '',
        academic_year_id: academicYearId === 'all' ? '' : academicYearId,
        fee_category_id: feeCategoryId === 'all' ? '' : feeCategoryId,
        class_id: classId === 'all' ? '' : classId,
        min_amount: minAmount || '',
        max_amount: maxAmount || '',
    });

    const handleSearch = () => {
        router.get(route('fee-structures.index'), buildFilters(), {
            preserveScroll: true,
            replace: true
        });
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setAcademicYearId('all');
        setFeeCategoryId('all');
        setClassId('all');
        setMinAmount('');
        setMaxAmount('');
        router.get(route('fee-structures.index'), {}, {
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
            <Head title={t('parametres.fee_structures.head')} />

            <div className="space-y-6">
                {/* Header avec titre et bouton */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><DollarSign className="h-7 w-7 text-blue-600 shrink-0" />
                            {t('parametres.fee_structures.title')}
                        </h1>
                        <p className="mt-3 text-base text-gray-600">
                            {t('parametres.fee_structures.subtitle')}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setReplicateOpen(true)}
                            className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                        >
                            <Copy className="h-4 w-4 mr-2" />
                            {t('parametres.fee_structures.replicate_year')}
                        </Button>
                        <Button
                            onClick={() => router.visit(route('fee-structures.create'))}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            {t('parametres.fee_structures.new')}
                        </Button>
                    </div>
                </div>

                {/* Message de succès */}
                {message && (
                    <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                        {message}
                    </div>
                )}

                {/* Statistiques */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                    <div className="rounded-2xl bg-linear-to-br from-blue-50 to-white p-6 ring-1 ring-blue-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                                <DollarSign className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">{t('parametres.fee_structures.stat_total')}</p>
                                <p className="text-2xl font-bold text-blue-700">{formatMoney(stats.amount_total)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl bg-linear-to-br from-emerald-50 to-white p-6 ring-1 ring-emerald-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                                <TrendingUp className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">{t('parametres.fee_structures.stat_average')}</p>
                                <p className="text-2xl font-bold text-emerald-700">{formatMoney(stats.amount_avg)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl bg-linear-to-br from-amber-50 to-white p-6 ring-1 ring-amber-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                                <School className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">{t('parametres.fee_structures.stat_classes')}</p>
                                <p className="text-2xl font-bold text-amber-700">{stats.classes_covered}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl bg-linear-to-br from-violet-50 to-white p-6 ring-1 ring-violet-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
                                <Layers className="h-6 w-6 text-violet-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">{t('parametres.fee_structures.stat_categories')}</p>
                                <p className="text-2xl font-bold text-violet-700">{stats.categories_covered}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl bg-linear-to-br from-rose-50 to-white p-6 ring-1 ring-rose-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                                <TrendingUp className="h-6 w-6 text-rose-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">{t('parametres.fee_structures.stat_gap')}</p>
                                <p className="text-2xl font-bold text-rose-700">{formatMoney(stats.amount_range)}</p>
                                <p className="text-xs text-gray-500">{t('parametres.fee_structures.stat_gap_detail', { min: formatMoney(stats.amount_min), max: formatMoney(stats.amount_max) })}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filtres */}
                <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        <div className="relative xl:col-span-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                                type="text"
                                placeholder={t('parametres.fee_structures.search_ph')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="pl-10 border-slate-200"
                            />
                        </div>
                        <Select value={academicYearId} onValueChange={setAcademicYearId}>
                            <SelectTrigger className="border-slate-200">
                                <SelectValue placeholder={t('parametres.fee_structures.filter_year')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('parametres.fee_structures.filter_all_years')}</SelectItem>
                                {academicYears.map((year) => (
                                    <SelectItem key={year.id} value={year.id}>{year.year}{year.active ? t('parametres.fee_structures.active_suffix') : ''}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={feeCategoryId} onValueChange={setFeeCategoryId}>
                            <SelectTrigger className="border-slate-200">
                                <SelectValue placeholder={t('parametres.fee_structures.filter_category')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('parametres.fee_structures.filter_all_categories')}</SelectItem>
                                {feeCategories.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={classId} onValueChange={setClassId}>
                            <SelectTrigger className="border-slate-200">
                                <SelectValue placeholder={t('parametres.fee_structures.filter_class')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('parametres.fee_structures.filter_all_classes')}</SelectItem>
                                {classrooms.map((classroom) => (
                                    <SelectItem key={classroom.id} value={classroom.id}>{classroom.name} ({classroom.code})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            type="number"
                            min="0"
                            placeholder={t('parametres.fee_structures.filter_amount_min')}
                            value={minAmount}
                            onChange={(e) => setMinAmount(e.target.value)}
                            className="border-slate-200"
                        />
                        <Input
                            type="number"
                            min="0"
                            placeholder={t('parametres.fee_structures.filter_amount_max')}
                            value={maxAmount}
                            onChange={(e) => setMaxAmount(e.target.value)}
                            className="border-slate-200"
                        />
                    </div>
                    <div className="flex flex-wrap gap-3 mt-3">
                        <Button 
                            onClick={handleSearch}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Search className="h-4 w-4 mr-2" />
                            {t('parametres.fee_structures.search')}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleClearSearch}
                            className="border-slate-200"
                        >
                            <X className="h-4 w-4 mr-2" />
                            {t('parametres.fee_structures.reset')}
                        </Button>
                        <div className="text-sm text-gray-600 self-center">
                            {t('parametres.fee_structures.filtered_count', { count: stats.count, max: formatMoney(stats.amount_max) })}
                        </div>
                    </div>
                </div>

                {/* Tableau */}
                <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow className="border-b border-gray-200">
                                <TableHead className="font-semibold text-gray-900">{t('parametres.fee_structures.col_year')}</TableHead>
                                <TableHead className="font-semibold text-gray-900">{t('parametres.fee_structures.col_category')}</TableHead>
                                <TableHead className="font-semibold text-gray-900">{t('parametres.fee_structures.col_class')}</TableHead>
                                <TableHead className="font-semibold text-gray-900">{t('parametres.fee_structures.col_amount')}</TableHead>
                                <TableHead className="font-semibold text-gray-900 text-center">{t('parametres.fee_structures.col_actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {feeStructures.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <DollarSign className="w-12 h-12 text-gray-300" />
                                            <p className="text-lg">{t('parametres.fee_structures.empty')}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                feeStructures.data.map((feeStructure) => (
                                    <TableRow key={feeStructure.id} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors">
                                        <TableCell className="font-semibold text-gray-900">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                                    <DollarSign className="h-5 w-5 text-blue-600" />
                                                </div>
                                                <span>{feeStructure.academic_year.year}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(feeStructure.fee_category.name)}`}>
                                                <DollarSign className="h-3 w-3" />
                                                {feeStructure.fee_category.name}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-gray-600">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{feeStructure.classroom.name}</span>
                                                <span className="text-xs text-gray-500">{feeStructure.classroom.code}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-semibold text-green-600">
                                            {formatMoney(feeStructure.amount)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex gap-2 justify-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => router.visit(route('fee-structures.show', feeStructure.id))}
                                                    className="border-slate-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => router.visit(route('fee-structures.edit', feeStructure.id))}
                                                    className="border-slate-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setDeleteConfirm(feeStructure.id)}
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
                    {feeStructures.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-gray-100 bg-white px-6 py-4">
                            <div className="text-sm text-gray-600">
                                {t('parametres.fee_structures.pagination', { from: feeStructures.from, to: feeStructures.to, total: feeStructures.total })}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={feeStructures.current_page === 1}
                                    onClick={() => router.get(route('fee-structures.index', { 
                                        page: feeStructures.current_page - 1,
                                        ...buildFilters()
                                    }))}
                                    className="border-slate-200 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={feeStructures.current_page === feeStructures.last_page}
                                    onClick={() => router.get(route('fee-structures.index', { 
                                        page: feeStructures.current_page + 1,
                                        ...buildFilters()
                                    }))}
                                    className="border-slate-200 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Dialog de confirmation de suppression */}
            <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('parametres.fee_structures.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('parametres.fee_structures.delete_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-3">
                        <AlertDialogCancel disabled={isDeleting}>{t('parametres.fee_structures.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? t('parametres.fee_structures.deleting') : t('parametres.fee_structures.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de réplication d'une année vers l'année active */}
            <Dialog open={replicateOpen} onOpenChange={setReplicateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('parametres.fee_structures.replicate_title')}</DialogTitle>
                        <DialogDescription>
                            {t('parametres.fee_structures.replicate_desc')}
                        </DialogDescription>
                    </DialogHeader>

                    {activeYear ? (
                        <div className="space-y-4 py-2">
                            <div className="rounded-lg bg-indigo-50 ring-1 ring-indigo-100 p-3 text-sm">
                                <span className="text-gray-600">{t('parametres.fee_structures.replicate_target')}</span>
                                <span className="font-semibold text-indigo-700 ml-2">{activeYear.year}</span>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">{t('parametres.fee_structures.replicate_source')}</label>
                                <Select value={sourceYearId} onValueChange={setSourceYearId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('parametres.fee_structures.replicate_source_ph')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {academicYears.filter((y) => y.id !== activeYear.id).map((y) => (
                                            <SelectItem key={y.id} value={y.id}>{y.year}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={() => setReplicateOpen(false)}>{t('parametres.fee_structures.cancel')}</Button>
                                <Button
                                    onClick={handleReplicate}
                                    disabled={!sourceYearId || replicating}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    {replicating ? t('parametres.fee_structures.replicating') : t('parametres.fee_structures.replicate')}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-red-600 py-4">
                            {t('parametres.fee_structures.replicate_no_active')}
                        </p>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
