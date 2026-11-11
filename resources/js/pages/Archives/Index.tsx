import { Head, router, useForm } from '@inertiajs/react';
import {
    Archive, Download, Pencil, Plus, RotateCcw, Search, Tag as TagIcon,
    Trash2, Upload, X,
} from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/icon-button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Tag { id: string; name: string; color: string; }
interface Doc {
    id: string; reference: string; title: string; description: string | null;
    category: string; original_name: string | null; mime: string | null; size: number;
    retention_until: string | null; archived_by: string | null; archived_at: string | null;
    link: string | null; tags: Tag[];
}
interface Classroom { id: string; name: string; code: string; }
interface Paginated<T> { data: T[]; current_page: number; last_page: number; total: number; }
interface Props {
    documents: Paginated<Doc>;
    tags: Tag[];
    categories: Record<string, string>;
    classrooms: Classroom[];
    filters: { search: string; category: string; tags: string[]; date_from: string; date_to: string; trashed: boolean };
    stats: { total: number; trashed: number };
}

const ALL = 'all';
const fmtSize = (b: number) => b > 1048576 ? `${(b / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(b / 1024))} Ko`;

export default function Index({ documents, tags, categories, classrooms, filters, stats }: Readonly<Props>) {
    const { t } = useTranslation();
    const [search, setSearch] = useState(filters.search || '');
    const [category, setCategory] = useState(filters.category || ALL);
    const [selectedTags, setSelectedTags] = useState<string[]>(filters.tags || []);
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const apply = (ov: Record<string, unknown> = {}) => {
        router.get(route('archives.index'), {
            search, category: category === ALL ? '' : category,
            tags: selectedTags, date_from: dateFrom, date_to: dateTo,
            trashed: filters.trashed ? 1 : 0,
            ...ov,
        }, { preserveScroll: true, replace: true });
    };

    const toggleTag = (id: string) => {
        const next = selectedTags.includes(id) ? selectedTags.filter(x => x !== id) : [...selectedTags, id];
        setSelectedTags(next);
        apply({ tags: next });
    };

    const resetFilters = () => {
        setSearch(''); setCategory(ALL); setSelectedTags([]); setDateFrom(''); setDateTo('');
        router.get(route('archives.index'), { trashed: filters.trashed ? 1 : 0 }, { preserveScroll: true, replace: true });
    };

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Doc | null>(null);
    const [deleteDoc, setDeleteDoc] = useState<Doc | null>(null);

    const openCreate = () => { setEditing(null); resetForm(); setTagInput(''); setDialogOpen(true); };
    const openEdit = (d: Doc) => {
        setEditing(d);
        setData({
            title: d.title, description: d.description ?? '', category: d.category,
            file: null as File | null, tags: d.tags.map(x => x.name),
            retention_until: d.retention_until ?? '',
            link_type: '', link_classroom_id: '', link_student_matricule: '',
        });
        setTagInput('');
        setDialogOpen(true);
    };

    const { data, setData, post, processing, errors, reset: resetForm } = useForm({
        title: '', description: '', category: 'administratif',
        file: null as File | null, tags: [] as string[],
        retention_until: '', link_type: '', link_classroom_id: '', link_student_matricule: '',
    });

    const [tagInput, setTagInput] = useState('');
    const addTag = (name: string) => {
        const n = name.trim();
        if (n && !data.tags.includes(n)) setData('tags', [...data.tags, n]);
        setTagInput('');
    };
    const removeTag = (name: string) => setData('tags', data.tags.filter(x => x !== name));

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const url = editing ? route('archives.update', editing.id) : route('archives.store');
        post(url, { forceFormData: true, preserveScroll: true, onSuccess: () => { setDialogOpen(false); resetForm(); } });
    };

    const activeFilters = (category !== ALL ? 1 : 0) + (search ? 1 : 0) + selectedTags.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

    return (
        <AppLayout>
            <Head title={t('archives.head')} />
            <div className="w-full space-y-6">

                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                            <Archive className="w-8 h-8 text-blue-600" /> {t('archives.title')}
                        </h1>
                        <p className="mt-2 text-gray-500">{t('archives.subtitle_docs', { count: stats.total })}{stats.trashed > 0 ? t('archives.trashed_suffix', { count: stats.trashed }) : ''}.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => apply({ trashed: filters.trashed ? 0 : 1 })}
                            className={filters.trashed ? 'border-amber-300 text-amber-600' : ''}>
                            <Trash2 className="w-4 h-4 mr-2" /> {filters.trashed ? t('archives.view_active') : t('archives.trash')}
                        </Button>
                        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 gap-2">
                            <Plus className="w-4 h-4" /> {t('archives.archive_doc')}
                        </Button>
                    </div>
                </div>

                {/* Filtres */}
                <div className="rounded-2xl bg-slate-50/70 ring-1 ring-slate-200 p-4 space-y-3">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="relative flex-1 min-w-52">
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('archives.search')}</label>
                            <Search className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
                            <Input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && apply()} placeholder={t('archives.search_ph')} className="pl-9 bg-white" />
                        </div>
                        <div className="min-w-44">
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('archives.category')}</label>
                            <Select value={category} onValueChange={v => { setCategory(v); apply({ category: v === ALL ? '' : v }); }}>
                                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>{t('archives.all_categories')}</SelectItem>
                                    {Object.entries(categories).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="min-w-36">
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('archives.from')}</label>
                            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} onBlur={() => apply()} className="bg-white" />
                        </div>
                        <div className="min-w-36">
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('archives.to')}</label>
                            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} onBlur={() => apply()} className="bg-white" />
                        </div>
                    </div>
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 items-center">
                            <TagIcon className="w-3.5 h-3.5 text-gray-400" />
                            {tags.map(t => {
                                const on = selectedTags.includes(t.id);
                                return (
                                    <button key={t.id} onClick={() => toggleTag(t.id)}
                                        className={`text-xs px-2 py-0.5 rounded-full border transition ${on ? 'text-white' : 'text-gray-600 bg-white'}`}
                                        style={on ? { backgroundColor: t.color, borderColor: t.color } : { borderColor: t.color }}>
                                        {t.name}
                                    </button>
                                );
                            })}
                            {activeFilters > 0 && (
                                <button onClick={resetFilters} className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 ml-2">
                                    <X className="w-3 h-3" /> {t('archives.reset')} ({activeFilters})
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead>{t('archives.th_reference')}</TableHead>
                                <TableHead>{t('archives.th_document')}</TableHead>
                                <TableHead>{t('archives.th_tags')}</TableHead>
                                <TableHead>{t('archives.th_linked')}</TableHead>
                                <TableHead>{t('archives.th_size')}</TableHead>
                                <TableHead>{t('archives.th_archived')}</TableHead>
                                <TableHead className="text-center w-32">{t('archives.th_actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.data.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="py-16 text-center text-gray-400">
                                    <Archive className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    {filters.trashed ? t('archives.empty_trash') : t('archives.empty')}
                                </TableCell></TableRow>
                            ) : documents.data.map(d => (
                                <TableRow key={d.id} className="hover:bg-gray-50">
                                    <TableCell className="font-mono text-xs text-gray-500">{d.reference}</TableCell>
                                    <TableCell>
                                        <p className="font-medium text-gray-900">{d.title}</p>
                                        <p className="text-xs text-gray-400">{categories[d.category]} · {d.original_name}</p>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {d.tags.map(t => (
                                                <span key={t.id} className="text-[11px] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: t.color }}>{t.name}</span>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-gray-500">{d.link ?? '—'}</TableCell>
                                    <TableCell className="text-sm text-gray-600">{fmtSize(d.size)}</TableCell>
                                    <TableCell className="text-xs text-gray-500">{d.archived_at}<br /><span className="text-gray-400">{d.archived_by}</span></TableCell>
                                    <TableCell>
                                        <div className="flex justify-center gap-1.5">
                                            {filters.trashed ? (
                                                <>
                                                    <IconButton label={t('archives.restore')} icon={<RotateCcw className="w-3.5 h-3.5" />} className="gap-1 text-xs" onClick={() => router.post(route('archives.restore', d.id), {}, { preserveScroll: true })} />
                                                    <IconButton label={t('archives.delete_forever')} icon={<Trash2 className="w-3.5 h-3.5" />} className="border-red-200 text-red-500 hover:bg-red-50" onClick={() => setDeleteDoc(d)} />
                                                </>
                                            ) : (
                                                <>
                                                    <a href={route('archives.download', d.id)}>
                                                        <IconButton label={t('archives.download')} icon={<Download className="w-3.5 h-3.5" />} className="text-xs" />
                                                    </a>
                                                    <IconButton label={t('archives.edit')} icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openEdit(d)} />
                                                    <IconButton label={t('archives.delete')} icon={<Trash2 className="w-3.5 h-3.5" />} className="border-red-200 text-red-500 hover:bg-red-50" onClick={() => router.delete(route('archives.destroy', d.id), { preserveScroll: true })} />
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {documents.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        <Button variant="outline" size="sm" disabled={documents.current_page <= 1} onClick={() => apply({ page: documents.current_page - 1 })}>{t('archives.prev')}</Button>
                        <span className="text-sm text-gray-500 self-center">{t('archives.page_of', { current: documents.current_page, last: documents.last_page })}</span>
                        <Button variant="outline" size="sm" disabled={documents.current_page >= documents.last_page} onClick={() => apply({ page: documents.current_page + 1 })}>{t('archives.next')}</Button>
                    </div>
                )}
            </div>

            {/* Dialog création / édition */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? t('archives.edit_title') : t('archives.create_title')}</DialogTitle>
                        <DialogDescription>
                            {editing ? t('archives.edit_desc') : t('archives.create_desc')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4 py-1">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">{t('archives.f_title')} *</label>
                            <Input value={data.title} onChange={e => setData('title', e.target.value)} className={errors.title ? 'border-red-400' : ''} />
                            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">{t('archives.f_category')} *</label>
                                <Select value={data.category} onValueChange={v => setData('category', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{Object.entries(categories).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">{t('archives.retention')}</label>
                                <Input type="date" value={data.retention_until} onChange={e => setData('retention_until', e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">{t('archives.description')}</label>
                            <textarea value={data.description} onChange={e => setData('description', e.target.value)} rows={2}
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        {!editing && (
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">{t('archives.file')} *</label>
                                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp,.zip"
                                    onChange={e => setData('file', e.target.files?.[0] ?? null)}
                                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-blue-700 file:text-sm hover:file:bg-blue-100" />
                                {errors.file && <p className="text-xs text-red-500">{errors.file}</p>}
                            </div>
                        )}
                        {/* Tags */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">{t('archives.tags')}</label>
                            <div className="flex flex-wrap gap-1.5 mb-1">
                                {data.tags.map(tg => (
                                    <span key={tg} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                        {tg}<button type="button" onClick={() => removeTag(tg)}><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                            <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }}
                                placeholder={t('archives.add_tag_ph')} />
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {tags.filter(tg => !data.tags.includes(tg.name)).slice(0, 12).map(tg => (
                                        <button key={tg.id} type="button" onClick={() => addTag(tg.name)} className="text-[11px] px-1.5 py-0.5 rounded-full border text-gray-600" style={{ borderColor: tg.color }}>+ {tg.name}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Liaison */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">{t('archives.linked_to')}</label>
                                <Select value={data.link_type || 'none'} onValueChange={v => setData('link_type', v === 'none' ? '' : v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t('archives.link_none')}</SelectItem>
                                        <SelectItem value="classroom">{t('archives.link_classroom')}</SelectItem>
                                        <SelectItem value="student">{t('archives.link_student')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {data.link_type === 'classroom' && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">{t('archives.classroom')}</label>
                                    <Select value={data.link_classroom_id} onValueChange={v => setData('link_classroom_id', v)}>
                                        <SelectTrigger><SelectValue placeholder={t('archives.choose')} /></SelectTrigger>
                                        <SelectContent>{classrooms.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            )}
                            {data.link_type === 'student' && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">{t('archives.student_matricule')}</label>
                                    <Input value={data.link_student_matricule} onChange={e => setData('link_student_matricule', e.target.value)} className={errors.link_student_matricule ? 'border-red-400' : ''} />
                                    {errors.link_student_matricule && <p className="text-xs text-red-500">{errors.link_student_matricule}</p>}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('archives.cancel')}</Button>
                            <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700 gap-2">
                                <Upload className="w-4 h-4" /> {editing ? t('archives.save') : t('archives.archive')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('archives.delete_forever_q')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('archives.delete_forever_desc', { title: deleteDoc?.title ?? '' })}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('archives.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteDoc && router.delete(route('archives.force-delete', deleteDoc.id), { preserveScroll: true, onSuccess: () => setDeleteDoc(null) })}>
                            {t('archives.delete_forever')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
