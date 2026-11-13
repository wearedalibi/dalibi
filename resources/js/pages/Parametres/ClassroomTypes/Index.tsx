import { Head, router } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Search, Tag, CheckCircle2, Eye } from 'lucide-react';
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

interface ClassroomType {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
}

interface PaginatedClassroomTypes {
    data: ClassroomType[];
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
}

interface IndexProps {
    classroomTypes: PaginatedClassroomTypes;
    activeCount: number;
    message?: string;
}

export default function Index({ classroomTypes, activeCount, message }: Readonly<IndexProps>) {
    const { t } = useTranslation();
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleDelete = (typeId: string) => {
        setIsDeleting(true);
        router.delete(route('classroom-types.destroy', typeId), {
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
        router.get(route('classroom-types.index'), { search: searchQuery }, { preserveState: true });
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        router.get(route('classroom-types.index'), { search: '' }, { preserveState: true });
    };

    const statsCards = [
        {
            title: t('parametres.classroom_types.stat_total'),
            value: classroomTypes.total,
            icon: Tag,
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
            borderColor: 'border-blue-200',
        },
        {
            title: t('parametres.classroom_types.stat_active'),
            value: activeCount,
            icon: CheckCircle2,
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
            borderColor: 'border-green-200',
        },
        {
            title: t('parametres.classroom_types.stat_page'),
            value: `${classroomTypes.current_page}/${classroomTypes.last_page}`,
            icon: Plus,
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-600',
            borderColor: 'border-purple-200',
        },
    ];

    return (
        <AppLayout>
            <Head title={t('parametres.classroom_types.head')} />

                    <div className="space-y-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><Tag className="h-7 w-7 text-blue-600 shrink-0" />
                                    {t('parametres.classroom_types.title')}
                                </h1>
                                <p className="mt-2 text-lg text-gray-600">
                                    {t('parametres.classroom_types.subtitle')}
                                </p>
                            </div>
                            <Button
                                onClick={() => router.visit(route('classroom-types.create'))}
                                className="gap-2 bg-blue-600 hover:bg-blue-700"
                            >
                                <Plus className="w-5 h-5" />
                                {t('parametres.classroom_types.new')}
                            </Button>
                        </div>

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
                                            <Icon className={`w-12 h-12 ${stat.textColor} opacity-20`} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {message && (
                            <div className="bg-green-50 text-green-800 px-4 py-3 rounded-lg flex items-center gap-3 shadow-sm">
                                <CheckCircle2 className="w-5 h-5 shrink-0" />
                                <span>{message}</span>
                            </div>
                        )}

                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <div className="flex gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <Input
                                        type="text"
                                        placeholder={t('parametres.classroom_types.search_ph')}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 bg-gray-50 border-gray-300"
                                    />
                                </div>
                                <Button
                                    onClick={handleSearch}
                                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                                >
                                    <Search className="w-4 h-4" />
                                    {t('parametres.common.search')}
                                </Button>
                                {searchQuery && (
                                    <Button
                                        variant="outline"
                                        onClick={handleClearSearch}
                                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                    >
                                        {t('parametres.classroom_types.reset')}
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-gray-50">
                                        <TableRow className="border-b border-gray-200">
                                            <TableHead className="font-semibold text-gray-900">{t('parametres.classroom_types.th_name')}</TableHead>
                                            <TableHead className="font-semibold text-gray-900">{t('parametres.classroom_types.th_description')}</TableHead>
                                            <TableHead className="font-semibold text-gray-900">{t('parametres.classroom_types.th_status')}</TableHead>
                                            <TableHead className="text-center font-semibold text-gray-900 w-28">{t('parametres.common.actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {classroomTypes.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={4}
                                                    className="text-center py-12 text-gray-500"
                                                >
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Tag className="w-12 h-12 text-gray-300" />
                                                        <p className="text-lg">{t('parametres.classroom_types.empty')}</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            classroomTypes.data.map((type) => (
                                                <TableRow key={type.id} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors">
                                                    <TableCell className="font-semibold text-gray-900">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                                                <Tag className="h-5 w-5 text-blue-600" />
                                                            </div>
                                                            <span>{type.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-gray-600">
                                                        {type.description ? (
                                                            <span className="line-clamp-2">{type.description}</span>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-gray-600">
                                                        <span
                                                            className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                                                                type.active
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-gray-100 text-gray-800'
                                                            }`}
                                                        >
                                                            {type.active ? t('parametres.classroom_types.active') : t('parametres.classroom_types.inactive')}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex gap-2 justify-center">
                                                            <IconButton
                                                                label={t('parametres.common.view')}
                                                                icon={<Eye className="w-4 h-4" />}
                                                                className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                                onClick={() => router.visit(route('classroom-types.show', type.id))}
                                                            />
                                                            <IconButton
                                                                label={t('parametres.common.edit')}
                                                                icon={<Pencil className="w-4 h-4" />}
                                                                className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                                onClick={() => router.visit(route('classroom-types.edit', type.id))}
                                                            />
                                                            <IconButton
                                                                label={t('parametres.common.delete')}
                                                                icon={<Trash2 className="w-4 h-4" />}
                                                                className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                onClick={() => setDeleteConfirm(type.id)}
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

                        {classroomTypes.last_page > 1 && (
                            <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm">
                                <div className="text-sm text-gray-600">
                                    {t('parametres.classroom_types.page_showing_before')} <span className="font-semibold">{classroomTypes.from}</span> {t('parametres.classroom_types.page_showing_to')}{' '}
                                    <span className="font-semibold">{classroomTypes.to}</span> {t('parametres.classroom_types.page_showing_on')}{' '}
                                    <span className="font-semibold">{classroomTypes.total}</span> {t('parametres.classroom_types.page_unit')}
                                </div>
                                <div className="flex gap-2">
                                    {classroomTypes.current_page > 1 && (
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                router.get(
                                                    route('classroom-types.index'),
                                                    { page: classroomTypes.current_page - 1 },
                                                    { preserveState: true }
                                                )
                                            }
                                        >
                                            ← {t('parametres.common.prev')}
                                        </Button>
                                    )}
                                    <span className="flex items-center px-4 text-sm font-medium text-gray-700">
                                        {t('parametres.classroom_types.page_label')} {classroomTypes.current_page} {t('parametres.classroom_types.page_of')} {classroomTypes.last_page}
                                    </span>
                                    {classroomTypes.current_page < classroomTypes.last_page && (
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                router.get(
                                                    route('classroom-types.index'),
                                                    { page: classroomTypes.current_page + 1 },
                                                    { preserveState: true }
                                                )
                                            }
                                        >
                                            {t('parametres.common.next')} →
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

            <AlertDialog
                open={deleteConfirm !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteConfirm(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('parametres.classroom_types.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('parametres.classroom_types.delete_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-3 justify-end">
                        <AlertDialogCancel disabled={isDeleting}>
                            {t('parametres.common.cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? t('parametres.classroom_types.deleting') : t('parametres.common.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
