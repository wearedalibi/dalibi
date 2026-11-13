import { Head, router, useForm } from '@inertiajs/react';
import { SchoolForm, type SchoolFormData, type CurrencyOption } from '@/components/Schools/school-form';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface School {
    id: string;
    name: string;
    code: string;
    logo: string | null;
    logo_url: string | null;
    devise: string | null;
    currency: string | null;
    terme: string | null;
    ministry: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    region: string | null;
    city: string | null;
    po_box: string | null;
    active: boolean;
    portal_enabled: boolean;
}

interface ClassroomTypeOption { id: string; name: string; period_system: string; }

interface EditProps {
    school: School;
    classroomTypes?: ClassroomTypeOption[];
    selectedClassTypes?: string[];
    currencies?: CurrencyOption[];
}

export default function Edit({ school, classroomTypes = [], selectedClassTypes = [], currencies = [] }: Readonly<EditProps>) {
    const { t } = useTranslation();
    const currentLogoUrl = school.logo_url ?? null;

    const { data, setData, post, transform, processing, errors } = useForm<SchoolFormData>({
        name: school.name,
        code: school.code,
        logo: null,
        devise: school.devise || '',
        currency: school.currency || 'XOF',
        terme: school.terme || 'République Togolaise',
        ministry: school.ministry || 'Ministère des Enseignements Primaire, Secondaire et Technique',
        email: school.email || '',
        phone: school.phone || '',
        address: school.address || '',
        region: school.region || '',
        city: school.city || '',
        po_box: school.po_box || '',
        active: school.active,
        portal_enabled: school.portal_enabled ?? true,
        class_type_ids: selectedClassTypes,
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // POST + _method=put : un PUT multipart n'est pas parsé par PHP, on passe par le spoofing.
        transform((d) => ({ ...d, _method: 'put' }));
        post(route('schools.update', school.id), { forceFormData: true });
    };

    return (
        <AppLayout>
            <Head title={t('parametres.schools.edit_head', { name: school.name })} />

            <div className="w-full space-y-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900">{t('parametres.schools.edit_title')}</h1>
                    <p className="mt-2 text-gray-600">{t('parametres.schools.edit_subtitle', { name: school.name })}</p>
                </div>

                <SchoolForm
                    mode="edit"
                    data={data}
                    errors={errors}
                    processing={processing}
                    currentLogoUrl={currentLogoUrl}
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
