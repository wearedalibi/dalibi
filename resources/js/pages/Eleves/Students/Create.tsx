import { Head, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { StudentFormSteps, type StudentFormPayload } from '@/components/students/student-form-steps';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

const defaultValues: StudentFormPayload = {
    matricule: '',
    firstname: '',
    lastname: '',
    gender: '',
    birth_date: '',
    place_of_birth: '',
    nationality: '',
    address: '',
    city: '',
    region: '',
    prefecture: '',
    phone: '',
    email: '',
    profile_photo: '',
    active: true,
    information: {
        birth_certificate_number: '',
        birth_certificate_issue_date: '',
        birth_certificate_issue_place: '',
        admission_type: 'new',
    },
    parent: {
        father_firstname: '',
        father_lastname: '',
        father_profession: '',
        father_phone: '',
        mother_firstname: '',
        mother_lastname: '',
        mother_profession: '',
        mother_phone: '',
        email: '',
    },
    medical: {
        blood_group: '',
        allergies: '',
        vaccinations: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
    },
};

export default function Create() {
    const { t } = useTranslation();
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (data: StudentFormPayload) => {
        setIsSubmitting(true);
        setErrors({});

        const payload = { ...data };

        router.post(route('students.store'), payload as never, {
            onError: (validationErrors) => {
                setErrors(validationErrors as Record<string, string>);
                setIsSubmitting(false);
            },
            onSuccess: () => {
                setIsSubmitting(false);
            },
        });
    };

    return (
        <AppLayout>
            <Head title={t('students.new')} />

            <div className="space-y-6 w-full">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => router.get(route('students.index'))}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900">{t('students.form.create_title')}</h1>
                        <p className="mt-2 text-gray-600">{t('students.form.create_subtitle')}</p>
                    </div>
                </div>

                <StudentFormSteps
                    mode="create"
                    initialValues={defaultValues}
                    errors={errors}
                    isSubmitting={isSubmitting}
                    onCancel={() => router.get(route('students.index'))}
                    onSubmit={handleSubmit}
                />
            </div>
        </AppLayout>
    );
}
