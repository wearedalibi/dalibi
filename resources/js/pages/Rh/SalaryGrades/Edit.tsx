import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { SalaryGradeForm, type SalaryGradeFormData } from '@/components/SalaryGrades/salary-grade-form';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Grade {
    id: string;
    name: string;
    category: string | null;
    echelon: number | null;
    base_amount: number;
    sort_order: number | null;
    active: boolean;
}

export default function Edit({ grade }: Readonly<{ grade: Grade }>) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm<SalaryGradeFormData>({
        name: grade.name,
        category: grade.category ?? '',
        echelon: grade.echelon != null ? String(grade.echelon) : '',
        base_amount: String(grade.base_amount ?? ''),
        sort_order: grade.sort_order != null ? String(grade.sort_order) : '0',
        active: grade.active,
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        put(route('salary-grades.update', grade.id));
    };

    return (
        <AppLayout>
            <Head title={t('rh.salary_grades.edit.head', { name: grade.name })} />
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => router.get(route('salary-grades.index'))} className="p-2 hover:bg-gray-100 rounded-lg transition">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">{t('rh.salary_grades.edit.title')}</h1>
                </div>

                <SalaryGradeForm
                    mode="edit"
                    data={data}
                    errors={errors}
                    processing={processing}
                    onSubmit={handleSubmit}
                    onCancel={() => router.get(route('salary-grades.index'))}
                    setData={setData}
                />
            </div>
        </AppLayout>
    );
}
