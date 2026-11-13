import { Head, router } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Pencil, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Template {
    id: string;
    name: string;
    description: string | null;
    category: string;
    type: string;
    type_label: string;
    orientation: 'portrait' | 'landscape';
    header_enabled: boolean;
    show_signature: boolean;
    signatory_title: string | null;
    is_default: boolean;
    is_active: boolean;
}

interface Props {
    template: Template;
    html: string;
}

export default function Show({ template, html }: Readonly<Props>) {
    const { t } = useTranslation();
    const categoryLabels: Record<string, string> = {
        certificat: t('parametres.documents.cat_certificat'),
        attestation: t('parametres.documents.cat_attestation'),
        bulletin: t('parametres.documents.cat_bulletin'),
    };
    return (
        <AppLayout>
            <Head title={template.name} />
            <div className="w-full space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={() => router.get(route('document-templates.index'))} className="p-2 hover:bg-gray-100 rounded-lg">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">{categoryLabels[template.category] ?? template.category}</p>
                            <h1 className="text-3xl font-bold text-gray-900">{template.name}</h1>
                            {template.description && <p className="text-gray-500 mt-1">{template.description}</p>}
                        </div>
                    </div>
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => router.get(route('document-templates.edit', template.id))}>
                        <Pencil className="w-4 h-4" /> {t('parametres.common.edit')}
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Métadonnées */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5 space-y-3">
                            <h3 className="text-sm font-semibold text-gray-900">{t('parametres.documents.show_features')}</h3>

                            <Meta label={t('parametres.documents.show_type')} value={template.type_label} />
                            <Meta label={t('parametres.documents.show_orientation')} value={template.orientation === 'portrait' ? t('parametres.documents.orientation_portrait') : t('parametres.documents.orientation_landscape')} />
                            <Meta label={t('parametres.documents.show_signatory')} value={template.signatory_title ?? '—'} />

                            <div className="space-y-2 pt-1">
                                <Flag on={template.header_enabled} label={t('parametres.documents.flag_header')} />
                                <Flag on={template.show_signature} label={t('parametres.documents.flag_signature')} />
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                                {template.is_default && (
                                    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                                        <Star className="w-3 h-3" /> {t('parametres.documents.show_default')}
                                    </span>
                                )}
                                <span className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 ${template.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {template.is_active ? t('parametres.documents.show_active') : t('parametres.documents.show_inactive')}
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-gray-400 px-1">
                            {t('parametres.documents.show_sample_note')}
                        </p>
                    </div>

                    {/* Aperçu rendu */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('parametres.documents.show_preview')}</h3>
                            <iframe title={t('parametres.documents.show_preview')} srcDoc={html} className="w-full h-[700px] rounded-lg ring-1 ring-gray-200 bg-white" />
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function Meta({ label, value }: Readonly<{ label: string; value: string }>) {
    return (
        <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
        </div>
    );
}

function Flag({ on, label }: Readonly<{ on: boolean; label: string }>) {
    return (
        <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className={`w-4 h-4 ${on ? 'text-emerald-500' : 'text-gray-300'}`} />
            <span className={on ? 'text-gray-700' : 'text-gray-400 line-through'}>{label}</span>
        </div>
    );
}
