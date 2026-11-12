import { Head, router } from '@inertiajs/react';
import { ArrowLeft, CalendarDays, FileText, Pencil, Tag, Trash2 } from 'lucide-react';
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
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface FeeCategorie {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

interface ShowProps {
    feeCategorie: FeeCategorie;
}

export default function Show({ feeCategorie }: Readonly<ShowProps>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        setIsDeleting(true);
        router.delete(route('fee-categories.destroy', feeCategorie.id), {
            onSuccess: () => {
                setDeleteConfirm(false);
                setIsDeleting(false);
            },
            onError: () => {
                setIsDeleting(false);
            },
        });
    };

    return (
        <AppLayout>
            <Head title={t('parametres.fee_categories.show_head', { name: feeCategorie.name })} />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => router.get(route('fee-categories.index'))}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{t('parametres.fee_categories.show_title')}</h1>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={() => router.get(route('fee-categories.edit', feeCategorie.id))}
                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                            <Pencil className="w-4 h-4" />
                            {t('parametres.common.edit')}
                        </Button>
                        <Button
                            onClick={() => setDeleteConfirm(true)}
                            variant="outline"
                            className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
                        >
                            <Trash2 className="w-4 h-4" />
                            {t('parametres.common.delete')}
                        </Button>
                    </div>
                </div>

                <div className="rounded-2xl bg-linear-to-br from-amber-50 to-white shadow-sm ring-1 ring-amber-100 p-6 space-y-6">
                    {/* Informations principales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="rounded-xl bg-white/80 ring-1 ring-amber-100 p-4">
                            <div className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-2"><Tag className="h-4 w-4" />{t('parametres.fee_categories.name')}</div>
                            <p className="text-lg font-semibold text-gray-900">{feeCategorie.name}</p>
                        </div>
                        <div className="rounded-xl bg-white/80 ring-1 ring-amber-100 p-4">
                            <div className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-2"><CalendarDays className="h-4 w-4" />{t('parametres.fee_categories.created_on')}</div>
                            <p className="text-lg font-semibold text-gray-900">
                                {new Date(feeCategorie.created_at).toLocaleDateString(dateLocale, {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="rounded-xl bg-white/80 ring-1 ring-cyan-100 p-4">
                        <div className="text-sm font-medium text-cyan-700 mb-2 flex items-center gap-2"><FileText className="h-4 w-4" />{t('parametres.fee_categories.description')}</div>
                        <p className="text-gray-900 whitespace-pre-wrap bg-white rounded p-4 border border-slate-200">
                            {feeCategorie.description || t('parametres.fee_categories.show_no_description')}
                        </p>
                    </div>

                    {/* Métadonnées */}
                    <div className="pt-4 border-t border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <div className="block text-sm font-medium text-gray-600 mb-2">{t('parametres.fee_categories.updated_on')}</div>
                                <p className="text-sm text-gray-900">
                                    {new Date(feeCategorie.updated_at).toLocaleDateString(dateLocale, {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>
                            <div>
                                <div className="block text-sm font-medium text-gray-600 mb-2">{t('parametres.fee_categories.id')}</div>
                                <p className="text-sm text-gray-600 font-mono">{feeCategorie.id}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('parametres.fee_categories.delete_title')}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t('parametres.fee_categories.delete_desc_show')}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex justify-end gap-3">
                            <AlertDialogCancel className="border-slate-200">{t('parametres.common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {isDeleting ? t('parametres.fee_categories.deleting') : t('parametres.common.delete')}
                            </AlertDialogAction>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
}
