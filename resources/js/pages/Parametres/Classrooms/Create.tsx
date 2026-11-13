import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import {
    ClassroomForm,
    type ClassroomFormData,
    type ClassroomTypeOption,
} from '@/components/Classrooms/classroom-form';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface CreateProps {
    classroomTypes: ClassroomTypeOption[];
}

const initialValues: ClassroomFormData = {
    name: '',
    code: '',
    capacity: 40,
    expected_age: null,
    classroom_type_id: '',
};

export default function Create({ classroomTypes }: Readonly<CreateProps>) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm<ClassroomFormData>(initialValues);

    const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        post(route('classrooms.store'));
    };

    return (
        <AppLayout>
            <Head title={t('parametres.classrooms.create_head')} />

            <div className="max-w-4xl space-y-6">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => router.get(route('classrooms.index'))}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900">{t('parametres.classrooms.create_title')}</h1>
                        <p className="mt-2 text-gray-600">{t('parametres.classrooms.create_subtitle')}</p>
                    </div>
                </div>

                <ClassroomForm
                    mode="create"
                    data={data}
                    errors={errors}
                    processing={processing}
                    classroomTypes={classroomTypes}
                    onCancel={() => router.get(route('classrooms.index'))}
                    onSubmit={handleSubmit}
                    setData={setData}
                />
            </div>
        </AppLayout>
    );
}