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

interface Classroom {
    id: string;
    name: string;
    code: string;
    capacity: number;
    expected_age?: number | null;
    classroom_type_id?: string | null;
    type?: ClassroomTypeOption | null;
}

interface EditProps {
    classroom: Classroom;
    classroomTypes: ClassroomTypeOption[];
}

export default function Edit({ classroom, classroomTypes }: Readonly<EditProps>) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm<ClassroomFormData>({
        name: classroom.name,
        code: classroom.code,
        capacity: classroom.capacity,
        expected_age: classroom.expected_age ?? null,
        classroom_type_id: classroom.classroom_type_id || classroom.type?.id || '',
    });

    const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        put(route('classrooms.update', classroom.id));
    };

    return (
        <AppLayout>
            <Head title={t('parametres.classrooms.edit_head', { name: classroom.name })} />

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
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900">{t('parametres.classrooms.edit_title')}</h1>
                        <p className="mt-2 text-gray-600">{t('parametres.classrooms.edit_subtitle', { name: classroom.name })}</p>
                    </div>
                </div>

                <ClassroomForm
                    mode="edit"
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