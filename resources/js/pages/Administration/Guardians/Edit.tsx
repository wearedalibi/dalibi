import { Head, router, useForm } from '@inertiajs/react';
import { Users } from 'lucide-react';
import { GuardianForm, type GuardianFormData } from '@/components/Guardians/guardian-form';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Props {
    guardian: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        phone: string | null;
        children: { matricule: string; name: string }[];
    };
}

export default function Edit({ guardian }: Readonly<Props>) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm<GuardianFormData>({
        first_name: guardian.first_name,
        last_name: guardian.last_name,
        email: guardian.email,
        phone: guardian.phone ?? '',
        student_matricules: guardian.children.map((c) => c.matricule),
        send_invitation: false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('guardians.update', guardian.id));
    };

    return (
        <AppLayout>
            <Head title={t('administration.guardians.edit.head')} />
            <div className="w-full space-y-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <Users className="h-7 w-7 text-blue-600 shrink-0" /> {t('administration.guardians.edit.title')}
                    </h1>
                    <p className="mt-2 text-gray-500">{guardian.first_name} {guardian.last_name}</p>
                </div>

                <GuardianForm
                    mode="edit"
                    data={data}
                    setData={setData}
                    errors={errors}
                    processing={processing}
                    initialChildren={guardian.children}
                    onSubmit={submit}
                    onCancel={() => router.get(route('guardians.index'))}
                />
            </div>
        </AppLayout>
    );
}
