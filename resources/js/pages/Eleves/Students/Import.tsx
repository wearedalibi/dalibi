import { Head, router } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface RowError { line: number; name: string; errors: string[]; }
interface ImportResult { total: number; imported: number; failed: number; errors: RowError[]; }

interface Props {
    result: ImportResult | null;
}

export default function Import({ result }: Readonly<Props>) {
    const { t } = useTranslation();
    const fileRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);

    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFileName(f.name);
        setUploading(true);
        router.post(route('students.import.store'), { file: f }, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => { setUploading(false); if (fileRef.current) fileRef.current.value = ''; },
        });
    };

    return (
        <AppLayout>
            <Head title={t('students.import_page.title')} />
            <div className="w-full space-y-6">

                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => router.get(route('students.index'))} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900">{t('students.import_page.title')}</h1>
                        <p className="mt-2 text-gray-500">{t('students.import_page.subtitle')}</p>
                    </div>
                </div>

                {/* Étapes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 1. Modèle */}
                    <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">1</div>
                            <h2 className="text-lg font-semibold text-gray-900">{t('students.import_page.step1')}</h2>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            {t('students.import_page.tmpl_intro')} <code className="bg-gray-100 px-1 rounded text-xs">prenom, nom, sexe, date_naissance, lieu_naissance, nationalite, telephone, email, matricule</code>.
                            {' '}{t('students.import_page.tmpl_required_prefix')} <strong>{t('students.import_page.tmpl_required_cols')}</strong> {t('students.import_page.tmpl_required_suffix')}
                        </p>
                        <Button variant="outline" className="gap-2" onClick={() => window.open(route('students.import.template'), '_blank')}>
                            <Download className="w-4 h-4" /> {t('students.import_page.download_template')}
                        </Button>
                    </div>

                    {/* 2. Upload */}
                    <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">2</div>
                            <h2 className="text-lg font-semibold text-gray-900">{t('students.import_page.step2')}</h2>
                        </div>
                        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="w-full rounded-xl ring-2 ring-dashed ring-gray-200 hover:ring-blue-300 hover:bg-blue-50/40 transition p-8 text-center"
                        >
                            <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm font-medium text-gray-700">{uploading ? t('students.import_page.importing') : t('students.import_page.choose_file')}</p>
                            {fileName && !uploading && <p className="text-xs text-gray-400 mt-1">{fileName}</p>}
                        </button>
                    </div>
                </div>

                {/* Résultat */}
                {result && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-gray-50 ring-1 ring-gray-100 rounded-2xl p-5">
                                <p className="text-xs font-medium text-gray-500">{t('students.import_page.rows_read')}</p>
                                <p className="text-3xl font-bold text-gray-700 mt-1">{result.total}</p>
                            </div>
                            <div className="bg-emerald-50 ring-1 ring-emerald-100 rounded-2xl p-5">
                                <p className="text-xs font-medium text-emerald-600">{t('students.import_page.imported')}</p>
                                <p className="text-3xl font-bold text-emerald-600 mt-1 inline-flex items-center gap-2"><CheckCircle2 className="w-6 h-6" />{result.imported}</p>
                            </div>
                            <div className="bg-amber-50 ring-1 ring-amber-100 rounded-2xl p-5">
                                <p className="text-xs font-medium text-amber-600">{t('students.import_page.rows_error')}</p>
                                <p className="text-3xl font-bold text-amber-600 mt-1">{result.failed}</p>
                            </div>
                        </div>

                        {result.imported > 0 && (
                            <div className="flex items-center gap-3 bg-emerald-50 ring-1 ring-emerald-100 rounded-2xl px-5 py-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                <p className="text-sm text-emerald-800 font-medium">{t('students.import_page.success', { count: result.imported })}</p>
                                <Button size="sm" variant="outline" className="ml-auto" onClick={() => router.get(route('students.index'))}>{t('students.import_page.view_list')}</Button>
                            </div>
                        )}

                        {result.errors.length > 0 && (
                            <div className="bg-white rounded-2xl ring-1 ring-amber-100 shadow-sm overflow-hidden">
                                <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    <span className="text-sm font-semibold text-amber-800">{t('students.import_page.not_imported')}</span>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {result.errors.map((e) => (
                                        <div key={e.line} className="flex items-start gap-3 px-5 py-3">
                                            <span className="text-xs font-mono bg-gray-100 text-gray-500 rounded px-2 py-0.5 shrink-0">L.{e.line}</span>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{e.name || t('students.import_page.no_name')}</p>
                                                <p className="text-xs text-red-500">{e.errors.join(' · ')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
