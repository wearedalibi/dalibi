import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import {
    SubjectForm,
    type SubjectFormData,
} from '@/components/Subjects/subject-form';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Subject {
    id: string;
    name: string;
    code: string;
    description: string | null;
    parent_id: string | null;
}

interface ParentSubject { id: string; name: string }

interface EditProps {
    subject: Subject;
    parents?: ParentSubject[];
}

export default function Edit({ subject, parents = [] }: Readonly<EditProps>) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm<SubjectFormData>({
        name: subject.name,
        code: subject.code,
        description: subject.description || '',
        parent_id: subject.parent_id || '',
    });

    const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        put(route('subjects.update', subject.id));
    };

    return (
        <AppLayout>
            <Head title={t('parametres.subjects.edit_head', { name: subject.name })} />

            <div className="w-full space-y-6">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => router.get(route('subjects.index'))}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900">{t('parametres.subjects.edit_title')}</h1>
                        <p className="mt-2 text-gray-600">{t('parametres.subjects.edit_subtitle', { name: subject.name })}</p>
                    </div>
                </div>

                <SubjectForm
                    mode="edit"
                    data={data}
                    errors={errors}
                    processing={processing}
                    parents={parents}
                    onCancel={() => router.get(route('subjects.index'))}
                    onSubmit={handleSubmit}
                    setData={setData}
                />
            </div>
        </AppLayout>
    );
}
