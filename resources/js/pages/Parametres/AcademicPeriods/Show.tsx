import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Calendar, CheckCircle2, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface AcademicYear {
    id: string;
    year: string;
}

interface AcademicPeriod {
    id: string;
    name: string;
    description: string | null;
    start_date: string;
    end_date: string;
    type: 'trimestre' | 'semestre';
    order: number | null;
    is_current: boolean;
    academic_year_id: string;
    academic_year: AcademicYear;
    created_at: string;
    updated_at: string;
}

interface ShowProps {
    academicPeriod: AcademicPeriod;
}

export default function Show({ academicPeriod }: Readonly<ShowProps>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString(dateLocale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatDateShort = (date: string) => {
        return new Date(date).toLocaleDateString(dateLocale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getTypeLabel = (type: string) => {
        return type === 'trimestre' ? t('parametres.academic_periods.type_trimester') : t('parametres.academic_periods.type_semester');
    };

    return (
        <AppLayout>
            <Head title={academicPeriod.name} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.get(route('academic-periods.index'))}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{academicPeriod.name}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                    academicPeriod.type === 'trimestre' 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : 'bg-purple-100 text-purple-700'
                                }`}>
                                    {getTypeLabel(academicPeriod.type)}
                                </span>
                                {academicPeriod.is_current && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        <CheckCircle2 className="w-3 h-3" />
                                        {t('parametres.academic_periods.status_active')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <Button
                        onClick={() => router.get(route('academic-periods.edit', academicPeriod.id))}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {t('parametres.common.edit')}
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Informations principales */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                {t('parametres.academic_periods.info_title')}
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">{t('parametres.academic_periods.th_name')}</p>
                                    <p className="font-medium text-gray-900 mt-1">{academicPeriod.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t('parametres.academic_periods.th_type')}</p>
                                    <p className="font-medium text-gray-900 mt-1">{getTypeLabel(academicPeriod.type)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t('parametres.academic_periods.label_year')}</p>
                                    <p className="font-medium text-gray-900 mt-1">{academicPeriod.academic_year.year}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t('parametres.academic_periods.th_order')}</p>
                                    <p className="font-medium text-gray-900 mt-1">{academicPeriod.order || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t('parametres.academic_periods.label_start')}</p>
                                    <p className="font-medium text-gray-900 mt-1">
                                        {formatDateShort(academicPeriod.start_date)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t('parametres.academic_periods.label_end')}</p>
                                    <p className="font-medium text-gray-900 mt-1">
                                        {formatDateShort(academicPeriod.end_date)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {academicPeriod.description && (
                            <div className="bg-white rounded-lg border p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Info className="w-5 h-5 text-blue-600" />
                                    {t('parametres.academic_periods.label_description')}
                                </h2>
                                <p className="text-gray-700 leading-relaxed">{academicPeriod.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-600" />
                                {t('parametres.academic_periods.system_title')}
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600">{t('parametres.common.created_at')}</p>
                                    <p className="text-sm text-gray-900 mt-1">{formatDate(academicPeriod.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t('parametres.common.updated_on')}</p>
                                    <p className="text-sm text-gray-900 mt-1">{formatDate(academicPeriod.updated_at)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t('parametres.academic_periods.label_id')}</p>
                                    <p className="text-xs text-gray-500 mt-1 font-mono break-all">
                                        {academicPeriod.id}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                {t('parametres.academic_periods.about_title')}
                            </h3>
                            <p className="text-sm text-blue-700">
                                {t('parametres.academic_periods.about_desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
