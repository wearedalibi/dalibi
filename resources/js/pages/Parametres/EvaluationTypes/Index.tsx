import { Head, router } from '@inertiajs/react';
import { Eye, Pencil, Plus, Search, Tag, Trash2, X } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface EvaluationType {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
}

interface PaginatedEvaluationTypes {
    data: EvaluationType[];
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
}

interface IndexProps {
    evaluationTypes: PaginatedEvaluationTypes;
    filters: {
        search?: string;
    };
}

export default function Index({ evaluationTypes, filters }: Readonly<IndexProps>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [search, setSearch] = useState(filters.search || '');
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const onSearch = () => {
        router.get(route('evaluation-types.index'), { search }, { preserveScroll: true, replace: true });
    };

    const clearSearch = () => {
        setSearch('');
        router.get(route('evaluation-types.index'), {}, { preserveScroll: true, replace: true });
    };

    const onDelete = (id: string) => {
        router.delete(route('evaluation-types.destroy', id), {
            preserveScroll: true,
            onSuccess: () => setDeleteId(null),
        });
    };

    const statsCards = [
        {
            title: t('parametres.evaluation_types.stat_total'),
            value: evaluationTypes.total,
            icon: Tag,
            cardClass: 'bg-linear-to-br from-blue-50/70 to-white ring-1 ring-blue-100',
            iconWrapClass: 'bg-blue-100',
            textColor: 'text-blue-600',
        },
        {
            title: t('parametres.evaluation_types.stat_shown'),
            value: evaluationTypes.data.length,
            icon: Eye,
            cardClass: 'bg-linear-to-br from-emerald-50/70 to-white ring-1 ring-emerald-100',
            iconWrapClass: 'bg-emerald-100',
            textColor: 'text-emerald-600',
        },
        {
            title: t('parametres.evaluation_types.stat_page'),
            value: `${evaluationTypes.current_page}/${evaluationTypes.last_page}`,
            icon: Plus,
            cardClass: 'bg-linear-to-br from-violet-50/70 to-white ring-1 ring-violet-100',
            iconWrapClass: 'bg-violet-100',
            textColor: 'text-violet-600',
        },
    ];

    return (
        <AppLayout>
            <Head title={t('parametres.evaluation_types.head')} />

            <div className="w-full space-y-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><Tag className="h-7 w-7 text-blue-600 shrink-0" />{t('parametres.evaluation_types.title')}</h1>
                        <p className="mt-2 text-lg text-gray-600">{t('parametres.evaluation_types.subtitle')}</p>
                    </div>
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => router.get(route('evaluation-types.create'))}>
                        <Plus className="w-5 h-5" />
                        {t('parametres.evaluation_types.new')}
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {statsCards.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div key={stat.title} className={`${stat.cardClass} rounded-2xl p-6 transition-all hover:shadow-md shadow-sm`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                                        <p className={`text-3xl font-bold mt-2 ${stat.textColor}`}>{stat.value}</p>
                                    </div>
                                    <div className={`w-12 h-12 rounded-full ${stat.iconWrapClass} flex items-center justify-center`}>
                                        <Icon className={`w-6 h-6 ${stat.textColor}`} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="rounded-2xl bg-linear-to-br from-slate-50/70 to-white ring-1 ring-slate-200 shadow-sm p-4">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                                placeholder={t('parametres.evaluation_types.search_ph')}
                                className="pl-10 pr-10"
                            />
                            {search && (
                                <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        <Button onClick={onSearch} className="bg-blue-600 hover:bg-blue-700">{t('parametres.common.search')}</Button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow className="border-b border-gray-200">
                                <TableHead>{t('parametres.evaluation_types.th_name')}</TableHead>
                                <TableHead>{t('parametres.evaluation_types.th_description')}</TableHead>
                                <TableHead>{t('parametres.evaluation_types.th_created')}</TableHead>
                                <TableHead className="text-center w-28">{t('parametres.common.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {evaluationTypes.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Tag className="w-12 h-12 text-gray-300" />
                                            <p className="text-lg">{t('parametres.evaluation_types.empty')}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                evaluationTypes.data.map((item) => (
                                    <TableRow key={item.id} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors">
                                        <TableCell className="font-medium text-gray-900">{item.name}</TableCell>
                                        <TableCell className="text-gray-600">{item.description || '—'}</TableCell>
                                        <TableCell className="text-gray-600">
                                            {new Date(item.created_at).toLocaleDateString(dateLocale)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-center gap-2">
                                                <IconButton label={t('parametres.common.view')} icon={<Eye className="w-4 h-4" />} className="border-gray-300" onClick={() => router.get(route('evaluation-types.show', item.id))} />
                                                <IconButton label={t('parametres.common.edit')} icon={<Pencil className="w-4 h-4" />} className="border-gray-300" onClick={() => router.get(route('evaluation-types.edit', item.id))} />
                                                <IconButton label={t('parametres.common.delete')} icon={<Trash2 className="w-4 h-4" />} className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => setDeleteId(item.id)} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('parametres.evaluation_types.delete_q')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('parametres.common.irreversible')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('parametres.common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && onDelete(deleteId)}>
                            {t('parametres.common.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
