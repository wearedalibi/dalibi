import { Head, router, useForm } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Plus, Search, Tag as TagIcon, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/icon-button';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Tag { id: string; name: string; color: string; documents_count: number; }
interface PaginatedTags {
    data: Tag[];
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
}
interface Props {
    tags: PaginatedTags;
    filters: { search?: string };
}

const COLORS = ['#64748b', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function Tags({ tags, filters }: Readonly<Props>) {
    const { t } = useTranslation();
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');

    const { data, setData, post, processing, errors, reset } = useForm({ name: '', color: COLORS[0] });

    const create = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('archives.tags.store'), {
            preserveScroll: true,
            onSuccess: () => { reset(); setCreateOpen(false); },
        });
    };

    const openCreate = () => { reset(); setCreateOpen(true); };

    const updateColor = (tag: Tag, color: string) => {
        router.put(route('archives.tags.update', tag.id), { name: tag.name, color }, { preserveScroll: true });
    };

    const handleSearch = () => {
        router.get(route('archives.tags.index'), { search: searchQuery }, { preserveScroll: true, replace: true });
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        router.get(route('archives.tags.index'), {}, { preserveScroll: true, replace: true });
    };

    const goToPage = (page: number) => {
        router.get(route('archives.tags.index'), { search: searchQuery, page }, { preserveScroll: true });
    };

    return (
        <AppLayout>
            <Head title={t('archives.tags_page.head')} />
            <div className="space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                            <TagIcon className="h-7 w-7 text-blue-600 shrink-0" /> {t('archives.tags_page.title')}
                        </h1>
                        <p className="mt-2 text-lg text-gray-600">{t('archives.tags_page.subtitle')}</p>
                    </div>
                    <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-5 h-5" /> {t('archives.tags_page.new_tag')}
                    </Button>
                </div>

                {/* Stats */}
                <div className="bg-linear-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 ring-1 ring-blue-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">{t('archives.tags_page.total')}</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{tags.total}</p>
                        </div>
                        <TagIcon className="w-12 h-12 text-blue-600 opacity-20" />
                    </div>
                </div>

                {/* Search */}
                <div className="rounded-2xl bg-linear-to-br from-slate-50 to-white p-4 shadow-sm ring-1 ring-slate-100">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <Input
                                placeholder={t('archives.tags_page.search_ph')}
                                className="pl-10 border-slate-200 focus:border-blue-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
                            <Search className="w-4 h-4" />
                        </Button>
                        {searchQuery && (
                            <Button onClick={handleClearSearch} variant="outline" className="border-slate-200">
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50 border-b border-slate-200">
                            <TableRow>
                                <TableHead className="text-gray-700 font-semibold">{t('archives.tags_page.th_tag')}</TableHead>
                                <TableHead className="text-gray-700 font-semibold">{t('archives.tags_page.th_documents')}</TableHead>
                                <TableHead className="text-gray-700 font-semibold">{t('archives.tags_page.th_color')}</TableHead>
                                <TableHead className="text-gray-700 font-semibold text-right">{t('archives.tags_page.th_actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tags.data.length > 0 ? (
                                tags.data.map((tg) => (
                                    <TableRow key={tg.id} className="border-b border-slate-100 hover:bg-blue-50/30">
                                        <TableCell>
                                            <span className="text-xs font-medium px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: tg.color }}>{tg.name}</span>
                                        </TableCell>
                                        <TableCell className="text-gray-600">{t('archives.tags_page.documents_count', { count: tg.documents_count })}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-1" title={t('archives.tags_page.change_color')}>
                                                {COLORS.map((c) => (
                                                    <button key={c} onClick={() => updateColor(tg, c)}
                                                        className={`w-4 h-4 rounded-full transition ${tg.color === c ? 'ring-2 ring-offset-1 ring-gray-300' : 'opacity-60 hover:opacity-100'}`}
                                                        style={{ backgroundColor: c }} aria-label={t('archives.tags_page.color_aria', { color: c })} />
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <IconButton
                                                    label={t('archives.tags_page.delete')}
                                                    icon={<Trash2 className="w-4 h-4" />}
                                                    className="border-slate-200 text-gray-700 hover:bg-red-50 hover:text-red-600"
                                                    onClick={() => setDeleteId(tg.id)}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10">
                                        <TagIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                        <p className="text-gray-600 font-medium">{t('archives.tags_page.empty')}</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {tags.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                            {t('archives.tags_page.showing', { from: tags.from, to: tags.to, total: tags.total })}
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="border-slate-200"
                                disabled={tags.current_page === 1}
                                onClick={() => goToPage(tags.current_page - 1)}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="border-slate-200"
                                disabled={tags.current_page === tags.last_page}
                                onClick={() => goToPage(tags.current_page + 1)}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de création */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('archives.tags_page.new_tag')}</DialogTitle>
                        <DialogDescription>{t('archives.tags_page.new_tag_desc')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={create} className="space-y-4 py-1">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">{t('archives.tags_page.name')} *</label>
                            <Input autoFocus value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder={t('archives.tags_page.name_ph')} className={errors.name ? 'border-red-400' : ''} />
                            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">{t('archives.tags_page.color')}</label>
                            <div className="flex flex-wrap gap-2">
                                {COLORS.map((c) => (
                                    <button type="button" key={c} onClick={() => setData('color', c)}
                                        className={`w-7 h-7 rounded-full transition ${data.color === c ? 'ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                                        style={{ backgroundColor: c }} aria-label={t('archives.tags_page.color_aria', { color: c })} />
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                            <span className="text-xs text-gray-400">{t('archives.tags_page.preview')}</span>
                            <span className="text-xs font-medium px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: data.color }}>
                                {data.name || t('archives.tags_page.default_name')}
                            </span>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t('archives.tags_page.cancel')}</Button>
                            <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700 gap-2">
                                <Plus className="w-4 h-4" /> {t('archives.tags_page.create')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('archives.tags_page.delete_q')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('archives.tags_page.delete_desc')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('archives.tags_page.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && router.delete(route('archives.tags.destroy', deleteId), { preserveScroll: true, onSuccess: () => setDeleteId(null) })}>
                            {t('archives.tags_page.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
