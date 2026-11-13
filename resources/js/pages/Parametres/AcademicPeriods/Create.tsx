import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    CalendarRange,
    FileText,
    GraduationCap,
    Hash,
    ListOrdered,
    Plus,
    Star,
    X,
} from 'lucide-react';
import { useState } from 'react';
import type { SyntheticEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface AcademicYear {
    id: string;
    year: string;
}

interface ClassroomType { id: string; name: string; period_system: string; }

interface CreateProps {
    academicYears: AcademicYear[];
    classroomTypes?: ClassroomType[];
}

export default function Create({ academicYears, classroomTypes = [] }: Readonly<CreateProps>) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        type: 'trimestre' as 'trimestre' | 'semestre',
        order: '',
        weight: '1',
        is_current: false,
        academic_year_id: '',
        class_type_id: 'all',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const payload = { ...formData, class_type_id: formData.class_type_id === 'all' ? '' : formData.class_type_id };
        router.post(route('academic-periods.store'), payload, {
            onError: (validationErrors) => {
                setErrors(validationErrors as Record<string, string>);
                setIsSubmitting(false);
            },
            onSuccess: () => {
                setIsSubmitting(false);
            },
        });
    };

    return (
        <AppLayout>
            <Head title={t('parametres.academic_periods.create_head')} />

            <div className="space-y-6">
                {/* En-tête */}
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => router.get(route('academic-periods.index'))}
                        className="p-2 hover:bg-indigo-50 rounded-xl transition text-indigo-600 border border-indigo-100"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                            {t('parametres.academic_periods.create_title')}
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">{t('parametres.academic_periods.create_subtitle')}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Section 1 — Identification */}
                    <div className="rounded-2xl p-6 bg-linear-to-br from-indigo-50 to-blue-50 border border-indigo-100 shadow-sm">
                        <h2 className="text-base font-semibold text-indigo-800 mb-5 flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-indigo-500" />
                            {t('parametres.academic_periods.section_identification')}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Nom */}
                            <div className="space-y-1.5">
                                <label htmlFor="name" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                    <FileText className="w-4 h-4 text-indigo-400" />
                                    {t('parametres.academic_periods.label_name')} <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder={t('parametres.academic_periods.name_ph')}
                                    className={errors.name ? 'border-red-400 bg-red-50/40 ring-1 ring-red-300' : 'border-indigo-200 bg-white focus-visible:ring-indigo-400'}
                                />
                                {errors.name && <p className="text-red-600 text-xs flex items-center gap-1"><X className="w-3 h-3" />{errors.name}</p>}
                            </div>

                            {/* Année académique */}
                            <div className="space-y-1.5">
                                <label htmlFor="academic_year_id" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                    <GraduationCap className="w-4 h-4 text-indigo-400" />
                                    {t('parametres.academic_periods.label_year')} <span className="text-red-500">*</span>
                                </label>
                                <Select
                                    value={formData.academic_year_id}
                                    onValueChange={(value) => setFormData((prev) => ({ ...prev, academic_year_id: value }))}
                                >
                                    <SelectTrigger
                                        id="academic_year_id"
                                        className={`bg-white ${errors.academic_year_id ? 'border-red-400 ring-1 ring-red-300' : 'border-indigo-200'}`}
                                    >
                                        <SelectValue placeholder={t('parametres.academic_periods.year_ph')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {academicYears.map((year) => (
                                            <SelectItem key={year.id} value={year.id}>{year.year}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.academic_year_id && <p className="text-red-600 text-xs flex items-center gap-1"><X className="w-3 h-3" />{errors.academic_year_id}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section 2 — Classification */}
                    <div className="rounded-2xl p-6 bg-linear-to-br from-violet-50 to-purple-50 border border-violet-100 shadow-sm">
                        <h2 className="text-base font-semibold text-violet-800 mb-5 flex items-center gap-2">
                            <Hash className="w-5 h-5 text-violet-500" />
                            {t('parametres.academic_periods.section_classification')}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Type */}
                            <div className="space-y-1.5">
                                <label htmlFor="type" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                    <Hash className="w-4 h-4 text-violet-400" />
                                    {t('parametres.academic_periods.label_type')} <span className="text-red-500">*</span>
                                </label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as 'trimestre' | 'semestre' }))}
                                >
                                    <SelectTrigger
                                        id="type"
                                        className={`bg-white ${errors.type ? 'border-red-400 ring-1 ring-red-300' : 'border-violet-200'}`}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="trimestre">{t('parametres.academic_periods.type_trimester')}</SelectItem>
                                        <SelectItem value="semestre">{t('parametres.academic_periods.type_semester')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.type && <p className="text-red-600 text-xs flex items-center gap-1"><X className="w-3 h-3" />{errors.type}</p>}
                            </div>

                            {/* Ordre */}
                            <div className="space-y-1.5">
                                <label htmlFor="order" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                    <ListOrdered className="w-4 h-4 text-violet-400" />
                                    {t('parametres.academic_periods.label_order')}
                                </label>
                                <Input
                                    id="order"
                                    type="number"
                                    min="1"
                                    value={formData.order}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, order: e.target.value }))}
                                    placeholder={t('parametres.academic_periods.order_ph')}
                                    className={errors.order ? 'border-red-400 bg-red-50/40 ring-1 ring-red-300' : 'border-violet-200 bg-white focus-visible:ring-violet-400'}
                                />
                                {errors.order && <p className="text-red-600 text-xs flex items-center gap-1"><X className="w-3 h-3" />{errors.order}</p>}
                            </div>

                            {/* Type de classe */}
                            <div className="space-y-1.5">
                                <label htmlFor="class_type_id" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                    <GraduationCap className="w-4 h-4 text-violet-400" />
                                    {t('parametres.academic_periods.label_class_type')}
                                </label>
                                <Select
                                    value={formData.class_type_id}
                                    onValueChange={(value) => setFormData((prev) => ({ ...prev, class_type_id: value }))}
                                >
                                    <SelectTrigger id="class_type_id" className="bg-white border-violet-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('parametres.academic_periods.class_type_all')}</SelectItem>
                                        {classroomTypes.map((ct) => (
                                            <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-400">{t('parametres.academic_periods.class_type_hint')}</p>
                            </div>

                            {/* Poids (moyenne annuelle) */}
                            <div className="space-y-1.5">
                                <label htmlFor="weight" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                    <Hash className="w-4 h-4 text-violet-400" />
                                    {t('parametres.academic_periods.label_weight')}
                                </label>
                                <Input
                                    id="weight"
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={formData.weight}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, weight: e.target.value }))}
                                    className={errors.weight ? 'border-red-400 bg-red-50/40 ring-1 ring-red-300' : 'border-violet-200 bg-white focus-visible:ring-violet-400'}
                                />
                                {errors.weight && <p className="text-red-600 text-xs flex items-center gap-1"><X className="w-3 h-3" />{errors.weight}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section 3 — Calendrier */}
                    <div className="rounded-2xl p-6 bg-linear-to-br from-teal-50 to-emerald-50 border border-teal-100 shadow-sm">
                        <h2 className="text-base font-semibold text-teal-800 mb-5 flex items-center gap-2">
                            <CalendarRange className="w-5 h-5 text-teal-500" />
                            {t('parametres.academic_periods.section_calendar')}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Date de début */}
                            <div className="space-y-1.5">
                                <label htmlFor="start_date" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                    <CalendarDays className="w-4 h-4 text-teal-400" />
                                    {t('parametres.academic_periods.label_start')} <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                                    className={errors.start_date ? 'border-red-400 bg-red-50/40 ring-1 ring-red-300' : 'border-teal-200 bg-white focus-visible:ring-teal-400'}
                                />
                                {errors.start_date && <p className="text-red-600 text-xs flex items-center gap-1"><X className="w-3 h-3" />{errors.start_date}</p>}
                            </div>

                            {/* Date de fin */}
                            <div className="space-y-1.5">
                                <label htmlFor="end_date" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                    <CalendarDays className="w-4 h-4 text-teal-400" />
                                    {t('parametres.academic_periods.label_end')} <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="end_date"
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                                    className={errors.end_date ? 'border-red-400 bg-red-50/40 ring-1 ring-red-300' : 'border-teal-200 bg-white focus-visible:ring-teal-400'}
                                />
                                {errors.end_date && <p className="text-red-600 text-xs flex items-center gap-1"><X className="w-3 h-3" />{errors.end_date}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section 4 — Détails & Statut */}
                    <div className="rounded-2xl p-6 bg-linear-to-br from-amber-50 to-orange-50 border border-amber-100 shadow-sm">
                        <h2 className="text-base font-semibold text-amber-800 mb-5 flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-500" />
                            {t('parametres.academic_periods.section_details')}
                        </h2>
                        <div className="space-y-5">
                            {/* Description */}
                            <div className="space-y-1.5">
                                <label htmlFor="description" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                    <FileText className="w-4 h-4 text-amber-400" />
                                    {t('parametres.academic_periods.label_description')}
                                </label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                    placeholder={t('parametres.academic_periods.description_ph')}
                                    rows={3}
                                    className={errors.description ? 'border-red-400 bg-red-50/40 ring-1 ring-red-300 resize-none' : 'border-amber-200 bg-white focus-visible:ring-amber-400 resize-none'}
                                />
                                {errors.description && <p className="text-red-600 text-xs flex items-center gap-1"><X className="w-3 h-3" />{errors.description}</p>}
                            </div>

                            {/* Période active */}
                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-amber-200 bg-white hover:bg-amber-50/60 transition w-fit">
                                <Checkbox
                                    id="is_current"
                                    checked={formData.is_current}
                                    onCheckedChange={(checked) =>
                                        setFormData((prev) => ({ ...prev, is_current: checked === true }))
                                    }
                                />
                                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                    <Star className="w-4 h-4 text-amber-400" />
                                    {t('parametres.academic_periods.active_label')}
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pb-6">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm min-w-40"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {isSubmitting ? t('parametres.common.creating') : t('parametres.academic_periods.submit_create')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="border-gray-200 text-gray-600 hover:bg-gray-50"
                            onClick={() => router.get(route('academic-periods.index'))}
                        >
                            <X className="w-4 h-4 mr-1.5" />
                            {t('parametres.common.cancel')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
