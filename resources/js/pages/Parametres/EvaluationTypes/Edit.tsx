import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import {
    EvaluationTypeForm,
    type EvaluationTypeFormData,
} from '@/components/EvaluationTypes/evaluation-type-form';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface EvaluationType {
    id: string;
    name: string;
    category: string | null;
    description: string | null;
}

interface EditProps {
    evaluationType: EvaluationType;
}

export default function Edit({ evaluationType }: Readonly<EditProps>) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm<EvaluationTypeFormData>({
        name: evaluationType.name,
        category: evaluationType.category || 'continu',
        description: evaluationType.description || '',
    });

    const submit = (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        put(route('evaluation-types.update', evaluationType.id));
    };

    return (
        <AppLayout>
            <Head title={t('parametres.evaluation_types.edit_head')} />

            <div className="w-full space-y-6">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => router.get(route('evaluation-types.index'))} className="p-2 hover:bg-gray-100 rounded-lg transition">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900">{t('parametres.evaluation_types.edit_title')}</h1>
                        <p className="mt-2 text-gray-600">{t('parametres.evaluation_types.edit_subtitle', { name: evaluationType.name })}</p>
                    </div>
                </div>

                <EvaluationTypeForm
                    mode="edit"
                    data={data}
                    errors={errors}
                    processing={processing}
                    onCancel={() => router.get(route('evaluation-types.index'))}
                    onSubmit={submit}
                    setData={setData}
                />
            </div>
        </AppLayout>
    );
}
