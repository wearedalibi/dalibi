import { Head, router } from '@inertiajs/react';
import { BookOpen, Eye, Pencil, Plus, Search, Trash2, X, Layers, ListChecks } from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/icon-button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Template {
    id: string;
    name: string;
    coefficient: number;
    max_score: number;
    date: string | null;
    evaluations_count: number;
    academic_period: { name: string };
    evaluation_type: { name: string };
}

interface Period { id: string; name: string; }

interface Props {
    templates: { data: Template[]; total: number; current_page: number; last_page: number };
    periods: Period[];
    activeYear: { year: string } | null;
    filters: { search: string; period_id: string };
}

export default function Index({ templates, periods, activeYear, filters }: Readonly<Props>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [search, setSearch]     = useState(filters.search ?? '');
    const [periodId, setPeriodId] = useState(filters.period_id ?? 'all');
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const apply = (overrides: Record<string, string> = {}) => {
        router.get(route('evaluation-templates.index'), {
            search:    overrides.search    !== undefined ? overrides.search    : search,
            period_id: (overrides.period_id ?? periodId) === 'all' ? '' : (overrides.period_id ?? periodId),
        }, { preserveScroll: true, replace: true });
    };

    const onDelete = (id: string) => {
        router.delete(route('evaluation-templates.destroy', id), {
            preserveScroll: true,
            onSuccess: () => setDeleteId(null),
        });
    };

    return (
        <AppLayout>
            <Head title={t('examens.templates.index.head')} />

            <div className="w-full space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><ListChecks className="h-7 w-7 text-blue-600 shrink-0" />{t('examens.templates.index.title')}</h1>
                        <p className="mt-2 text-lg text-gray-600">
                            {activeYear ? t('examens.templates.index.year', { year: activeYear.year }) : t('examens.templates.index.subtitle_default')}
                        </p>
                    </div>
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => router.get(route('evaluation-templates.create'))}>
                        <Plus className="w-5 h-5" /> {t('examens.templates.index.new')}
                    </Button>
                </div>

                {/* Filters */}
                <div className="rounded-2xl bg-slate-50/70 ring-1 ring-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && apply()}
                            placeholder={t('examens.templates.index.search_ph')}
                            className="pl-9"
                        />
                        {search && (
                            <button onClick={() => { setSearch(''); apply({ search: '' }); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <Select value={periodId} onValueChange={v => { setPeriodId(v); apply({ period_id: v }); }}>
                        <SelectTrigger className="w-52">
                            <SelectValue placeholder={t('examens.templates.index.period')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('examens.templates.index.all_periods')}</SelectItem>
                            {periods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={() => apply()} className="bg-blue-600 hover:bg-blue-700">{t('examens.templates.index.filter')}</Button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead>{t('examens.templates.index.col_name')}</TableHead>
                                <TableHead>{t('examens.templates.index.col_type')}</TableHead>
                                <TableHead>{t('examens.templates.index.col_period')}</TableHead>
                                <TableHead className="text-center">{t('examens.templates.index.col_coeff')}</TableHead>
                                <TableHead className="text-center">{t('examens.templates.index.col_scale')}</TableHead>
                                <TableHead>{t('examens.templates.index.col_date')}</TableHead>
                                <TableHead className="text-center">{t('examens.templates.index.col_deployed')}</TableHead>
                                <TableHead className="text-center w-32">{t('examens.templates.index.col_actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {templates.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-16 text-center text-gray-400">
                                        <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        {t('examens.templates.index.empty')}
                                    </TableCell>
                                </TableRow>
                            ) : templates.data.map(tpl => (
                                <TableRow key={tpl.id} className="hover:bg-blue-50/30 transition-colors">
                                    <TableCell className="font-semibold text-gray-900">{tpl.name}</TableCell>
                                    <TableCell className="text-gray-600">{tpl.evaluation_type?.name}</TableCell>
                                    <TableCell className="text-gray-600">{tpl.academic_period?.name}</TableCell>
                                    <TableCell className="text-center font-mono">{Number(tpl.coefficient).toFixed(2)}</TableCell>
                                    <TableCell className="text-center font-mono">/{Number(tpl.max_score).toFixed(0)}</TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {tpl.date ? new Date(tpl.date).toLocaleDateString(dateLocale) : '—'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                            tpl.evaluations_count > 0
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            <Layers className="w-3 h-3" />
                                            {t('examens.templates.index.classes_count', { count: tpl.evaluations_count })}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-center gap-1.5">
                                            <IconButton label={t('common.actions.view')} icon={<Eye className="w-4 h-4" />} onClick={() => router.get(route('evaluation-templates.show', tpl.id))} />
                                            <IconButton label={t('common.actions.edit')} icon={<Pencil className="w-4 h-4" />} onClick={() => router.get(route('evaluation-templates.edit', tpl.id))} />
                                            <IconButton label={t('common.actions.delete')} icon={<Trash2 className="w-4 h-4" />} className="border-red-200 text-red-500 hover:bg-red-50" onClick={() => setDeleteId(tpl.id)} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <p className="text-sm text-gray-400 text-right">{t('examens.templates.index.total', { count: templates.total })}</p>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('examens.templates.index.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('examens.templates.index.delete_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('common.actions.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && onDelete(deleteId)}>
                            {t('common.actions.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
