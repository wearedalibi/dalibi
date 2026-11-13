import { Head, router } from '@inertiajs/react';
import { ArrowLeft, FileText, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Issuance {
    id: string;
    reference_number: string;
    template_name: string | null;
    student_name: string;
    student_matricule: string | null;
    issued_by: string | null;
    issued_at: string | null;
}

interface Props {
    issuances: {
        data: Issuance[];
        total: number;
        current_page: number;
        last_page: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    filters: { search: string };
}

export default function Registry({ issuances, filters }: Readonly<Props>) {
    const { t } = useTranslation();
    const [search, setSearch] = useState(filters.search ?? '');

    const apply = (value = search) => {
        router.get(route('document-templates.registry'), { search: value }, { preserveScroll: true, replace: true });
    };

    return (
        <AppLayout>
            <Head title={t('parametres.documents.registry_head')} />
            <div className="w-full space-y-6">

                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => router.get(route('document-templates.index'))} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900">{t('parametres.documents.registry_title')}</h1>
                        <p className="mt-2 text-gray-500">{t('parametres.documents.registry_subtitle', { n: issuances.total })}</p>
                    </div>
                </div>

                {/* Recherche */}
                <div className="rounded-2xl bg-slate-50/70 ring-1 ring-slate-200 shadow-sm p-4 flex gap-3 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && apply()}
                            placeholder={t('parametres.documents.registry_search_ph')}
                            className="pl-9"
                        />
                        {search && (
                            <button onClick={() => { setSearch(''); apply(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <Button onClick={() => apply()} className="bg-blue-600 hover:bg-blue-700">{t('parametres.common.search')}</Button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead>{t('parametres.documents.registry_th_ref')}</TableHead>
                                <TableHead>{t('parametres.documents.registry_th_doc')}</TableHead>
                                <TableHead>{t('parametres.documents.registry_th_student')}</TableHead>
                                <TableHead>{t('parametres.documents.registry_th_issuer')}</TableHead>
                                <TableHead className="text-right">{t('parametres.documents.registry_th_date')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {issuances.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-16 text-center text-gray-400">
                                        <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                        {t('parametres.documents.registry_empty')}
                                    </TableCell>
                                </TableRow>
                            ) : issuances.data.map(i => (
                                <TableRow key={i.id} className="hover:bg-gray-50">
                                    <TableCell className="font-mono text-xs text-gray-600">{i.reference_number}</TableCell>
                                    <TableCell className="text-sm text-gray-900">{i.template_name ?? '—'}</TableCell>
                                    <TableCell className="text-sm">
                                        <div className="font-medium text-gray-900">{i.student_name}</div>
                                        {i.student_matricule && <div className="text-xs text-gray-400 font-mono">{i.student_matricule}</div>}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-500">{i.issued_by ?? '—'}</TableCell>
                                    <TableCell className="text-right text-sm text-gray-500">{i.issued_at}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {issuances.last_page > 1 && (
                    <div className="flex flex-wrap gap-1 justify-center">
                        {issuances.links.map((link, idx) => (
                            <button
                                key={idx}
                                disabled={!link.url}
                                onClick={() => link.url && router.visit(link.url, { preserveScroll: true })}
                                className={`px-3 py-1.5 rounded-lg text-sm ${link.active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'} disabled:opacity-40`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
