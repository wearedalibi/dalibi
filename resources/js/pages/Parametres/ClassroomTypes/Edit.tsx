import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import {
    ClassroomTypeForm,
    type ClassroomTypeFormData,
} from '@/components/ClassroomTypes/classroom-type-form';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface ClassroomType {
    id: string;
    name: string;
    description: string | null;
    period_system: 'trimestre' | 'semestre';
    active: boolean;
}

interface EditProps {
    classroomType: ClassroomType;
}

export default function Edit({ classroomType }: Readonly<EditProps>) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm<ClassroomTypeFormData>({
        name: classroomType.name,
        description: classroomType.description || '',
        period_system: classroomType.period_system ?? 'trimestre',
        active: classroomType.active,
    });

    const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        put(route('classroom-types.update', classroomType.id));
    };

    return (
        <AppLayout>
            <Head title={t('parametres.classroom_types.edit_head', { name: classroomType.name })} />

            <div className="w-full space-y-6">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => router.get(route('classroom-types.index'))}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900">{t('parametres.classroom_types.edit_title')}</h1>
                        <p className="mt-2 text-gray-600">{t('parametres.classroom_types.edit_subtitle', { name: classroomType.name })}</p>
                    </div>
                </div>

                <ClassroomTypeForm
                    mode="edit"
                    data={data}
                    errors={errors}
                    processing={processing}
                    onCancel={() => router.get(route('classroom-types.index'))}
                    onSubmit={handleSubmit}
                    setData={setData}
                />
            </div>
        </AppLayout>
    );
}