import { Head, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Eye, Globe, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/icon-button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Country {
    id: string;
    name: string;
    code: string;
    created_at: string;
}

interface PaginatedCountries {
    data: Country[];
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
}

interface IndexProps {
    countries: PaginatedCountries;
    filters: { search?: string };
}

export default function Index({ countries, filters }: Readonly<IndexProps>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [search, setSearch] = useState(filters.search || '');
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const doSearch = () => router.get(route('countries.index'), { search }, { preserveScroll: true, replace: true });
    const clearSearch = () => { setSearch(''); router.get(route('countries.index'), {}, { preserveScroll: true, replace: true }); };

    const goToPage = (page: number) =>
        router.get(route('countries.index'), { search, page }, { preserveScroll: true, replace: true });

    // Fenêtre glissante de numéros de page : 1 … (courant-1, courant, courant+1) … dernier.
    const pageNumbers = (() => {
        const { current_page: cur, last_page: last } = countries;
        const pages = new Set<number>([1, last, cur, cur - 1, cur + 1]);
        const sorted = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
        const out: (number | '…')[] = [];
        let prev = 0;
        for (const p of sorted) {
            if (p - prev > 1) out.push('…');
            out.push(p);
            prev = p;
        }
        return out;
    })();

    return (
        <AppLayout>
            <Head title={t('parametres.countries.head')} />

            <div className="w-full space-y-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                            <Globe className="h-7 w-7 text-blue-600 shrink-0" /> {t('parametres.countries.title')}
                        </h1>
                        <p className="mt-2 text-lg text-gray-600">{t('parametres.countries.subtitle')}</p>
                    </div>
                    <Button onClick={() => router.get(route('countries.create'))} className="gap-2 bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-5 h-5" /> {t('parametres.countries.new')}
                    </Button>
                </div>

                <div className="rounded-2xl bg-linear-to-br from-slate-50 to-white p-4 shadow-sm ring-1 ring-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                                placeholder={t('parametres.countries.search_ph')}
                                className="pl-10 pr-10"
                            />
                            {search && (
                                <button onClick={clearSearch} aria-label={t('parametres.common.clear')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        <Button onClick={doSearch} className="bg-blue-600 hover:bg-blue-700">{t('parametres.common.search')}</Button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50 border-b border-slate-200">
                            <TableRow>
                                <TableHead className="text-gray-700 font-semibold">{t('parametres.countries.th_name')}</TableHead>
                                <TableHead className="text-gray-700 font-semibold">{t('parametres.countries.th_code')}</TableHead>
                                <TableHead className="text-gray-700 font-semibold">{t('parametres.common.created_at')}</TableHead>
                                <TableHead className="text-gray-700 font-semibold text-right">{t('parametres.common.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {countries.data.length > 0 ? (
                                countries.data.map((country) => (
                                    <TableRow key={country.id} className="border-b border-slate-100 hover:bg-blue-50/30">
                                        <TableCell className="font-semibold text-gray-900">{country.name}</TableCell>
                                        <TableCell className="text-gray-600">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">{country.code}</span>
                                        </TableCell>
                                        <TableCell className="text-gray-600">{new Date(country.created_at).toLocaleDateString(dateLocale)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <IconButton label={t('parametres.common.view')} icon={<Eye className="w-4 h-4" />} className="border-slate-200 text-gray-700 hover:bg-gray-100" onClick={() => router.get(route('countries.show', country.id))} />
                                                <IconButton label={t('parametres.common.edit')} icon={<Pencil className="w-4 h-4" />} className="border-slate-200 text-gray-700 hover:bg-gray-100" onClick={() => router.get(route('countries.edit', country.id))} />
                                                <IconButton label={t('parametres.common.delete')} icon={<Trash2 className="w-4 h-4" />} className="border-slate-200 text-gray-700 hover:bg-red-50 hover:text-red-600" onClick={() => setDeleteId(country.id)} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">
                                        <p className="text-gray-600 font-medium">{t('parametres.countries.empty')}</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {countries.last_page > 1 && (
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <p className="text-sm text-gray-600">{t('parametres.common.showing', { from: countries.from, to: countries.to, total: countries.total })}</p>
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" className="border-slate-200 gap-1" disabled={countries.current_page === 1} onClick={() => goToPage(countries.current_page - 1)}>
                                <ChevronLeft className="w-4 h-4" /> {t('parametres.common.prev')}
                            </Button>

                            {pageNumbers.map((p, i) =>
                                p === '…' ? (
                                    <span key={`gap-${i}`} className="px-2 text-gray-400">…</span>
                                ) : (
                                    <Button
                                        key={p}
                                        variant={p === countries.current_page ? 'default' : 'outline'}
                                        size="sm"
                                        className={p === countries.current_page ? 'bg-blue-600 hover:bg-blue-700 w-9' : 'border-slate-200 w-9'}
                                        onClick={() => goToPage(p as number)}
                                    >
                                        {p}
                                    </Button>
                                ),
                            )}

                            <Button variant="outline" size="sm" className="border-slate-200 gap-1" disabled={countries.current_page === countries.last_page} onClick={() => goToPage(countries.current_page + 1)}>
                                {t('parametres.common.next')} <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('parametres.countries.delete_q')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('parametres.common.irreversible')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('parametres.common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && router.delete(route('countries.destroy', deleteId), { preserveScroll: true, onSuccess: () => setDeleteId(null) })}>
                            {t('parametres.common.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
