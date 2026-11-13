import { Head, router, useForm } from '@inertiajs/react';
import { useCurrencySymbol } from '@/helpers/money';
import { ArrowLeft, Banknote, CalendarDays, Layers, School, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface AcademicYear {
    id: string;
    year: string;
}

interface FeeCategory {
    id: string;
    name: string;
}

interface Classroom {
    id: string;
    name: string;
    code: string;
}

interface FeeStructure {
    id: string;
    academic_year_id: string;
    fee_category_id: string;
    class_id: string;
    amount: number;
}

interface EditProps {
    feeStructure: FeeStructure;
    academicYears: AcademicYear[];
    feeCategories: FeeCategory[];
    classrooms: Classroom[];
}

export default function Edit({ feeStructure, academicYears, feeCategories, classrooms }: Readonly<EditProps>) {
    const { t } = useTranslation();
    const currency = useCurrencySymbol();
    const { data, setData, put, processing, errors } = useForm({
        academic_year_id: feeStructure.academic_year_id,
        fee_category_id: feeStructure.fee_category_id,
        class_id: feeStructure.class_id,
        amount: feeStructure.amount.toString(),
    });

    const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        put(route('fee-structures.update', feeStructure.id));
    };

    return (
        <AppLayout>
            <Head title={t('parametres.fee_structures.edit_head')} />

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.visit(route('fee-structures.index'))}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t('parametres.fee_structures.back')}
                    </Button>
                </div>

                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><DollarSign className="h-7 w-7 text-blue-600 shrink-0" />
                        {t('parametres.fee_structures.edit_title')}
                    </h1>
                    <p className="mt-3 text-base text-gray-600">
                        {t('parametres.fee_structures.edit_subtitle')}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-2xl bg-linear-to-br from-indigo-50 to-white ring-1 ring-indigo-100 p-6 space-y-4">
                        <div className="flex items-center gap-2 text-indigo-700">
                            <CalendarDays className="h-4 w-4" />
                            <p className="text-sm font-semibold">{t('parametres.fee_structures.section_academic')}</p>
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="academic_year_id">
                            {t('parametres.fee_structures.field_year')} <span className="text-red-600">*</span>
                        </Label>
                        <Select
                            value={data.academic_year_id}
                            onValueChange={(value) => setData('academic_year_id', value)}
                        >
                            <SelectTrigger id="academic_year_id" className="border-slate-200 bg-white/90">
                                <SelectValue placeholder={t('parametres.fee_structures.field_year_ph')} />
                            </SelectTrigger>
                            <SelectContent>
                                {academicYears.map((year) => (
                                    <SelectItem key={year.id} value={year.id}>
                                        {year.year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.academic_year_id && (
                            <p className="text-sm text-red-600">{errors.academic_year_id}</p>
                        )}
                        </div>
                    </div>

                    <div className="rounded-2xl bg-linear-to-br from-amber-50 to-white ring-1 ring-amber-100 p-6 space-y-4">
                        <div className="flex items-center gap-2 text-amber-700">
                            <Layers className="h-4 w-4" />
                            <p className="text-sm font-semibold">{t('parametres.fee_structures.field_category')}</p>
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="fee_category_id">
                            {t('parametres.fee_structures.field_category')} <span className="text-red-600">*</span>
                        </Label>
                        <Select
                            value={data.fee_category_id}
                            onValueChange={(value) => setData('fee_category_id', value)}
                        >
                            <SelectTrigger id="fee_category_id" className="border-slate-200 bg-white/90">
                                <SelectValue placeholder={t('parametres.fee_structures.field_category_ph')} />
                            </SelectTrigger>
                            <SelectContent>
                                {feeCategories.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.fee_category_id && (
                            <p className="text-sm text-red-600">{errors.fee_category_id}</p>
                        )}
                        </div>
                    </div>

                    <div className="rounded-2xl bg-linear-to-br from-sky-50 to-white ring-1 ring-sky-100 p-6 space-y-4">
                        <div className="flex items-center gap-2 text-sky-700">
                            <School className="h-4 w-4" />
                            <p className="text-sm font-semibold">{t('parametres.fee_structures.field_class_section')}</p>
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="class_id">
                            {t('parametres.fee_structures.field_class')} <span className="text-red-600">*</span>
                        </Label>
                        <Select
                            value={data.class_id}
                            onValueChange={(value) => setData('class_id', value)}
                        >
                            <SelectTrigger id="class_id" className="border-slate-200 bg-white/90">
                                <SelectValue placeholder={t('parametres.fee_structures.field_class_ph')} />
                            </SelectTrigger>
                            <SelectContent>
                                {classrooms.map((classroom) => (
                                    <SelectItem key={classroom.id} value={classroom.id}>
                                        {classroom.name} ({classroom.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.class_id && (
                            <p className="text-sm text-red-600">{errors.class_id}</p>
                        )}
                        </div>
                    </div>

                    <div className="rounded-2xl bg-linear-to-br from-emerald-50 to-white ring-1 ring-emerald-100 p-6 space-y-4">
                        <div className="flex items-center gap-2 text-emerald-700">
                            <Banknote className="h-4 w-4" />
                            <p className="text-sm font-semibold">{t('parametres.fee_structures.field_amount')}</p>
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="amount">
                            {t('parametres.fee_structures.field_amount_currency', { currency })} <span className="text-red-600">*</span>
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={t('parametres.fee_structures.field_amount_ph')}
                            value={data.amount}
                            onChange={(e) => setData('amount', e.target.value)}
                            className="border-slate-200 bg-white/90"
                        />
                        {errors.amount && (
                            <p className="text-sm text-red-600">{errors.amount}</p>
                        )}
                        </div>
                    </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.visit(route('fee-structures.index'))}
                            disabled={processing}
                            className="border-slate-200"
                        >
                            {t('parametres.fee_structures.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {processing ? t('parametres.fee_structures.updating') : t('parametres.fee_structures.update')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
