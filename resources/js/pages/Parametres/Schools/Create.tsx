import { Head, router, useForm } from '@inertiajs/react';
import { SchoolForm, type SchoolFormData, type CurrencyOption } from '@/components/Schools/school-form';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

const initialValues: SchoolFormData = {
    name: '',
    code: '',
    logo: null,
    devise: '',
    currency: 'XOF',
    terme: 'République Togolaise',
    ministry: 'Ministère des Enseignements Primaire, Secondaire et Technique',
    email: '',
    phone: '',
    address: '',
    region: '',
    city: '',
    po_box: '',
    active: true,
    portal_enabled: true,
    class_type_ids: [],
};

interface ClassroomTypeOption { id: string; name: string; period_system: string; }

export default function Create({ classroomTypes = [], currencies = [] }: Readonly<{ classroomTypes?: ClassroomTypeOption[]; currencies?: CurrencyOption[] }>) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm<SchoolFormData>(initialValues);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post(route('schools.store'), { forceFormData: true });
    };

    return (
        <AppLayout>
            <Head title={t('parametres.schools.create_head')} />

            <div className="w-full space-y-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900">{t('parametres.schools.create_title')}</h1>
                    <p className="mt-2 text-gray-600">{t('parametres.schools.create_subtitle')}</p>
                </div>

                <SchoolForm
                    mode="create"
                    data={data}
                    errors={errors}
                    processing={processing}
                    classroomTypes={classroomTypes}
                    currencies={currencies}
                    onCancel={() => router.get(route('dashboard'))}
                    onSubmit={handleSubmit}
                    setData={setData}
                />
            </div>
        </AppLayout>
    );
}
