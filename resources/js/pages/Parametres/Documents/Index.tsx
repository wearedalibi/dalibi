import { Head, router, usePage } from '@inertiajs/react';
import { Award, Eye, FileBadge, FileText, GraduationCap, LayoutTemplate, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Template {
    id: string;
    name: string;
    type: string;
    type_label: string;
    is_default: boolean;
    is_active: boolean;
}

interface Props {
    templatesByCategory: Record<string, Template[]>;
    categories: Record<string, string>;
}

const CATEGORY_META: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
    certificat:  { icon: GraduationCap, color: 'text-blue-600',   bg: 'bg-blue-50 ring-blue-100' },
    attestation: { icon: Award,         color: 'text-emerald-600', bg: 'bg-emerald-50 ring-emerald-100' },
    bulletin:    { icon: FileText,      color: 'text-violet-600',  bg: 'bg-violet-50 ring-violet-100' },
};

export default function Index({ templatesByCategory, categories }: Readonly<Props>) {
    const { t } = useTranslation();
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const canHeader = (usePage().props.auth?.permissions ?? []).includes('view_document_headers');

    const onDelete = (id: string) => {
        router.delete(route('document-templates.destroy', id), {
            preserveScroll: true,
            onSuccess: () => setDeleteId(null),
        });
    };

    return (
        <AppLayout>
            <Head title={t('parametres.documents.head')} />
            <div className="w-full space-y-6">

                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><FileBadge className="h-7 w-7 text-blue-600 shrink-0" />{t('parametres.documents.title')}</h1>
                        <p className="mt-2 text-gray-500">{t('parametres.documents.subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {canHeader && (
                            <Button variant="outline" className="gap-2" onClick={() => router.get(route('document-header.edit'))}>
                                <LayoutTemplate className="w-4 h-4" /> {t('parametres.documents.btn_header')}
                            </Button>
                        )}
                        <Button variant="outline" className="gap-2" onClick={() => router.get(route('document-templates.registry'))}>
                            <FileText className="w-4 h-4" /> {t('parametres.documents.btn_registry')}
                        </Button>
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => router.get(route('document-templates.create'))}>
                            <Plus className="w-4 h-4" /> {t('parametres.documents.btn_new')}
                        </Button>
                    </div>
                </div>

                {Object.entries(categories).map(([key, label]) => {
                    const meta = CATEGORY_META[key] ?? CATEGORY_META.certificat;
                    const Icon = meta.icon;
                    const templates = templatesByCategory[key] ?? [];

                    return (
                        <div key={key} className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ring-1 ${meta.bg}`}>
                                    <Icon className={`w-4 h-4 ${meta.color}`} />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
                                <span className="text-sm text-gray-400">({templates.length})</span>
                            </div>

                            {templates.length === 0 ? (
                                <div className="rounded-2xl ring-1 ring-dashed ring-gray-200 p-8 text-center text-gray-400 text-sm">
                                    <FileBadge className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    {t('parametres.documents.cat_empty')}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {templates.map(tpl => (
                                        <div key={tpl.id} className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5 flex flex-col">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{tpl.name}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{tpl.type_label}</p>
                                                </div>
                                                {tpl.is_default && (
                                                    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 shrink-0">
                                                        <Star className="w-3 h-3" /> {t('parametres.documents.badge_default')}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-2">
                                                {tpl.is_active
                                                    ? <span className="text-xs text-emerald-600 font-medium">{t('parametres.documents.status_active')}</span>
                                                    : <span className="text-xs text-gray-400 font-medium">{t('parametres.documents.status_inactive')}</span>}
                                            </div>

                                            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                                                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => router.get(route('document-templates.show', tpl.id))}>
                                                    <Eye className="w-3.5 h-3.5" /> {t('parametres.common.view')}
                                                </Button>
                                                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => router.get(route('document-templates.edit', tpl.id))}>
                                                    <Pencil className="w-3.5 h-3.5" /> {t('parametres.common.edit')}
                                                </Button>
                                                <Button variant="outline" size="sm" className="border-red-200 text-red-500 hover:bg-red-50" onClick={() => setDeleteId(tpl.id)}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('parametres.documents.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('parametres.documents.delete_desc')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('parametres.common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && onDelete(deleteId)}>{t('parametres.common.delete')}</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
