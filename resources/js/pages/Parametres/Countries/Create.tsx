import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { CountryForm, type CountryFormData } from '@/components/Countries/country-form';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

export default function Create() {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm<CountryFormData>({ name: '', code: '' });

    const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        post(route('countries.store'));
    };

    return (
        <AppLayout>
            <Head title={t('parametres.countries.create_head')} />

            <div className="w-full space-y-6">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => router.get(route('countries.index'))} className="p-2 hover:bg-gray-100 rounded-lg transition">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900">{t('parametres.countries.create_title')}</h1>
                        <p className="mt-2 text-gray-600">{t('parametres.countries.create_subtitle')}</p>
                    </div>
                </div>

                <CountryForm
                    mode="create"
                    data={data}
                    errors={errors}
                    processing={processing}
                    onCancel={() => router.get(route('countries.index'))}
                    onSubmit={handleSubmit}
                    setData={setData}
                />
            </div>
        </AppLayout>
    );
}
