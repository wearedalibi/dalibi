import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import {
    EvaluationTypeForm,
    type EvaluationTypeFormData,
} from '@/components/EvaluationTypes/evaluation-type-form';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

const initialValues: EvaluationTypeFormData = {
    name: '',
    category: 'continu',
    description: '',
};

export default function Create() {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm<EvaluationTypeFormData>(initialValues);

    const submit = (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        post(route('evaluation-types.store'));
    };

    return (
        <AppLayout>
            <Head title={t('parametres.evaluation_types.create_head')} />

            <div className="w-full space-y-6">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => router.get(route('evaluation-types.index'))} className="p-2 hover:bg-gray-100 rounded-lg transition">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900">{t('parametres.evaluation_types.create_title')}</h1>
                        <p className="mt-2 text-gray-600">{t('parametres.evaluation_types.create_subtitle')}</p>
                    </div>
                </div>

                <EvaluationTypeForm
                    mode="create"
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
