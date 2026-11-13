import { Head, router } from '@inertiajs/react';
import { ArrowLeft, CalendarDays, ToggleLeft } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface AcademicYear {
    id: string;
    year: string;
    start_date: string;
    end_date: string;
    active: boolean;
}

interface EditProps {
    academicYear: AcademicYear;
}

export default function Edit({ academicYear }: Readonly<EditProps>) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        year: academicYear.year,
        start_date: academicYear.start_date,
        end_date: academicYear.end_date,
        active: academicYear.active,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        router.put(route('academic-years.update', academicYear.id), formData, {
            onError: (errors) => {
                setErrors(errors);
                setIsSubmitting(false);
            },
            onSuccess: () => {
                setIsSubmitting(false);
            },
        });
    };

    return (
        <AppLayout>
            <Head title={t('parametres.academic_years.edit_head', { year: academicYear.year })} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.get(route('academic-years.index'))}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {t('parametres.academic_years.edit_title', { year: academicYear.year })}
                        </h1>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="rounded-2xl bg-linear-to-br from-indigo-50 to-white ring-1 ring-indigo-100 p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 text-indigo-700">
                                <CalendarDays className="h-4 w-4" />
                                <p className="text-sm font-semibold">{t('parametres.academic_years.section_period')}</p>
                            </div>
                            <div>
                                <label htmlFor="year" className="block text-sm font-medium text-gray-900 mb-2">
                                    {t('parametres.academic_years.label_year')} *
                                </label>
                                <Input
                                    id="year"
                                    type="text"
                                    value={formData.year}
                                    onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                                    placeholder={t('parametres.academic_years.year_ph')}
                                    className={errors.year ? 'border-red-500 bg-white/90' : 'border-slate-200 bg-white/90'}
                                />
                                {errors.year && (
                                    <p className="text-red-600 text-sm mt-1">{errors.year}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="start_date" className="block text-sm font-medium text-gray-900 mb-2">
                                    {t('parametres.academic_years.label_start')} *
                                </label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                                    className={errors.start_date ? 'border-red-500 bg-white/90' : 'border-slate-200 bg-white/90'}
                                />
                                {errors.start_date && (
                                    <p className="text-red-600 text-sm mt-1">{errors.start_date}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="end_date" className="block text-sm font-medium text-gray-900 mb-2">
                                    {t('parametres.academic_years.label_end')} *
                                </label>
                                <Input
                                    id="end_date"
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                                    className={errors.end_date ? 'border-red-500 bg-white/90' : 'border-slate-200 bg-white/90'}
                                />
                                {errors.end_date && (
                                    <p className="text-red-600 text-sm mt-1">{errors.end_date}</p>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl bg-linear-to-br from-emerald-50 to-white ring-1 ring-emerald-100 p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 text-emerald-700">
                                <ToggleLeft className="h-4 w-4" />
                                <p className="text-sm font-semibold">{t('parametres.academic_years.section_activation')}</p>
                            </div>
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.active}
                                        onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-900">
                                        {t('parametres.academic_years.active_label')}
                                    </span>
                                </label>
                                <p className="text-sm text-gray-500 mt-3">
                                    {t('parametres.academic_years.active_hint')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Boutons */}
                    <div className="flex gap-3">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSubmitting ? t('parametres.common.updating') : t('parametres.common.update')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="border-slate-200"
                            onClick={() => router.get(route('academic-years.index'))}
                        >
                            {t('parametres.common.cancel')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
