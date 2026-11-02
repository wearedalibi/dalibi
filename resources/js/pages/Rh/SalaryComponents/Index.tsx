import { Head, router, useForm } from '@inertiajs/react';
import {
    Coins, Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { IconButton } from '@/components/icon-button';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useMoney } from '@/helpers/money';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Component {
    id: string;
    name: string;
    code: string | null;
    type: 'earning' | 'deduction';
    default_amount: number | null;
    is_default: boolean;
    active: boolean;
}

interface Paginated<T> { data: T[]; current_page: number; last_page: number; from: number; to: number; total: number; }

interface Props {
    components: Paginated<Component>;
    perPage: number;
    filters: { search?: string; type?: string };
}

interface FormData {
    name: string; code: string; type: string; default_amount: string; is_default: boolean; active: boolean;
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];
const emptyForm: FormData = { name: '', code: '', type: 'earning', default_amount: '', is_default: false, active: true };

export default function Index({ components, perPage, filters }: Readonly<Props>) {
    const fmt = useMoney();
    const { t } = useTranslation();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const [type, setType] = useState(filters.type ?? '');

    const form = useForm<FormData>({ ...emptyForm });

    const apply = () => router.get(route('salary-components.index'), {
        search: search || undefined, type: type || undefined, per_page: String(perPage),
    }, { preserveState: true, replace: true });
    const clear = () => { setSearch(''); setType(''); router.get(route('salary-components.index'), {}, { preserveState: true, replace: true }); };
    const goToPage = (page: number) => router.get(route('salary-components.index'), { ...filters, per_page: String(perPage), page: String(page) }, { preserveState: true, replace: true });
    const changePerPage = (value: number) => router.get(route('salary-components.index'), { ...filters, per_page: String(value), page: '1' }, { preserveState: true, replace: true });

    const openCreate = () => {
        form.setData({ ...emptyForm });
        form.clearErrors();
        setEditingId(null);
        setModalOpen(true);
    };
    const openEdit = (c: Component) => {
        form.setData({
            name: c.name, code: c.code ?? '', type: c.type,
            default_amount: c.default_amount != null ? String(c.default_amount) : '',
            is_default: c.is_default, active: c.active,
        });
        form.clearErrors();
        setEditingId(c.id);
        setModalOpen(true);
    };

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: () => { setModalOpen(false); form.reset(); } };
        if (editingId) form.put(route('salary-components.update', editingId), opts);
        else form.post(route('salary-components.store'), opts);
    };

    const selectCls = "px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
    const hasFilters = !!(search || type);

    return (
        <AppLayout>
            <Head title={t('rh.salary_components.head')} />
            <div className="space-y-5 w-full">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Coins className="w-7 h-7 text-amber-500" /> {t('rh.salary_components.head')}
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">{t('rh.salary_components.subtitle')}</p>
                    </div>
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={openCreate}>
                        <Plus className="w-4 h-4" /> {t('rh.salary_components.new')}
                    </Button>
                </div>

                {/* Filtres */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && apply()} placeholder={t('rh.salary_components.search_ph')} className="pl-10 border-gray-300" />
                        </div>
                        <select value={type} onChange={e => setType(e.target.value)} className={selectCls}>
                            <option value="">{t('rh.salary_components.all_types')}</option>
                            <option value="earning">{t('rh.salary_components.earnings')}</option>
                            <option value="deduction">{t('rh.salary_components.deductions')}</option>
                        </select>
                        <Button onClick={apply} className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><Search className="w-4 h-4" /> {t('rh.salary_components.search')}</Button>
                        {hasFilters && <Button variant="outline" onClick={clear} className="border-gray-300 text-gray-700">{t('rh.salary_components.reset')}</Button>}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 gap-4 flex-wrap">
                        <p className="text-sm text-gray-600">{t('rh.salary_components.count', { count: components.total })}{hasFilters && <span className="text-blue-500 ml-2">{t('rh.salary_components.filtered')}</span>}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{t('rh.salary_components.per_page')}</span>
                            <select value={perPage} onChange={e => changePerPage(Number(e.target.value))} className="h-8 px-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow className="border-b border-gray-200">
                                    <TableHead className="font-semibold text-gray-900">{t('rh.salary_components.col_component')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('rh.salary_components.col_code')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('rh.salary_components.col_type')}</TableHead>
                                    <TableHead className="text-right font-semibold text-gray-900">{t('rh.salary_components.col_default_amount')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('rh.salary_components.col_application')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('rh.salary_components.col_status')}</TableHead>
                                    <TableHead className="text-center font-semibold text-gray-900 w-24">{t('rh.salary_components.col_actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {components.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Coins className="w-12 h-12 text-gray-300" />
                                                <p className="text-lg">{t('rh.salary_components.empty')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    components.data.map(c => (
                                        <TableRow key={c.id} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors">
                                            <TableCell className="font-semibold text-gray-900">{c.name}</TableCell>
                                            <TableCell className="text-gray-500">{c.code ?? '—'}</TableCell>
                                            <TableCell>
                                                {c.type === 'earning'
                                                    ? <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{t('rh.salary_components.type_earning')}</span>
                                                    : <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">{t('rh.salary_components.type_deduction')}</span>}
                                            </TableCell>
                                            <TableCell className="text-right text-gray-700">{c.default_amount != null ? fmt(c.default_amount) : '—'}</TableCell>
                                            <TableCell>
                                                {c.is_default
                                                    ? <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{t('rh.salary_components.auto')}</span>
                                                    : <span className="text-xs text-gray-400">{t('rh.salary_components.manual')}</span>}
                                            </TableCell>
                                            <TableCell>
                                                {c.active
                                                    ? <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">{t('rh.salary_components.active')}</span>
                                                    : <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">{t('rh.salary_components.inactive')}</span>}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <IconButton label={t('rh.salary_components.edit')} icon={<Pencil className="w-4 h-4" />} onClick={() => openEdit(c)} />
                                                    <IconButton label={t('rh.salary_components.delete')} icon={<Trash2 className="w-4 h-4" />} className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDeletingId(c.id)} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                        {components.total > 0 && <p className="text-xs text-gray-400">{t('rh.salary_components.range', { from: components.from, to: components.to, total: components.total })}</p>}
                        {components.last_page > 1 && (
                            <div className="flex items-center gap-1.5">
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={components.current_page === 1} onClick={() => goToPage(components.current_page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                                <span className="text-xs text-gray-500 px-2">{components.current_page} / {components.last_page}</span>
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={components.current_page === components.last_page} onClick={() => goToPage(components.current_page + 1)}><ChevronRight className="w-4 h-4" /></Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal création / édition */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? t('rh.salary_components.modal_edit') : t('rh.salary_components.modal_new')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-900 mb-1.5">{t('rh.salary_components.name')}</label>
                                <Input value={form.data.name} onChange={e => form.setData('name', e.target.value)} placeholder={t('rh.salary_components.name_ph')} className={form.errors.name ? 'border-red-500' : ''} />
                                {form.errors.name && <p className="text-red-600 text-sm mt-1">{form.errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1.5">{t('rh.salary_components.type')}</label>
                                <Select value={form.data.type} onValueChange={(v) => form.setData('type', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="earning">{t('rh.salary_components.type_earning')}</SelectItem>
                                        <SelectItem value="deduction">{t('rh.salary_components.type_deduction')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1.5">{t('rh.salary_components.code')}</label>
                                <Input value={form.data.code} onChange={e => form.setData('code', e.target.value)} placeholder={t('rh.salary_components.code_ph')} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-900 mb-1.5">{t('rh.salary_components.default_amount')}</label>
                                <Input type="number" min={0} value={form.data.default_amount} onChange={e => form.setData('default_amount', e.target.value)} placeholder={t('rh.salary_components.default_amount_ph')} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <Checkbox checked={form.data.is_default} onCheckedChange={c => form.setData('is_default', c === true)} />
                                {t('rh.salary_components.apply_auto')}
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <Checkbox checked={form.data.active} onCheckedChange={c => form.setData('active', c === true)} />
                                {t('rh.salary_components.active_label')}
                            </label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>{t('rh.salary_components.cancel')}</Button>
                            <Button type="submit" disabled={form.processing} className="bg-blue-600 hover:bg-blue-700">
                                {form.processing ? t('rh.salary_components.saving') : (editingId ? t('rh.salary_components.save') : t('rh.salary_components.add'))}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('rh.salary_components.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('rh.salary_components.delete_desc')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('rh.salary_components.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => {
                            if (deletingId) router.delete(route('salary-components.destroy', deletingId), { preserveScroll: true, onFinish: () => setDeletingId(null) });
                        }}>{t('rh.salary_components.delete')}</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
