import { Head, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface School {
    id: string;
    name: string;
    code: string;
}

interface Student {
    id: string;
    firstname: string;
    lastname: string;
    matricule?: string | null;
}

interface Classroom {
    id: string;
    name: string;
    code: string;
}

interface AcademicYear {
    id: string;
    year: string;
    active: boolean;
}

interface Enrollment {
    id: string;
    school_id: string;
    student_id: string;
    class_id: string;
    academic_year_id: string;
    enrollment_code: string;
    enrollment_date: string;
    status: 'PENDING' | 'ACTIVE' | 'CANCELLED';
}

interface EditProps {
    enrollment: Enrollment;
    schools: School[];
    students: Student[];
    classrooms: Classroom[];
    academicYears: AcademicYear[];
}

const normalizeDate = (value?: string | null): string => {
    if (!value) return '';
    return value.slice(0, 10);
};

export default function Edit({ enrollment, schools, students, classrooms, academicYears }: Readonly<EditProps>) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        school_id: enrollment.school_id,
        student_id: enrollment.student_id,
        class_id: enrollment.class_id,
        academic_year_id: enrollment.academic_year_id,
        enrollment_code: enrollment.enrollment_code,
        enrollment_date: normalizeDate(enrollment.enrollment_date),
        status: enrollment.status,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        router.put(route('enrollments.update', enrollment.id), formData as never, {
            onError: (validationErrors) => {
                setErrors(validationErrors as Record<string, string>);
                setIsSubmitting(false);
            },
            onSuccess: () => setIsSubmitting(false),
        });
    };

    return (
        <AppLayout>
            <Head title={t('enrollments.edit.head')} />

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => router.get(route('enrollments.index'))}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('enrollments.edit.title')}</h1>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="w-full space-y-6">
                    <div className="bg-white dark:bg-card rounded-lg p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="school_id" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('enrollments.form.school')}</label>
                            <select
                                id="school_id"
                                value={formData.school_id}
                                onChange={(event) => setFormData((prev) => ({ ...prev, school_id: event.target.value }))}
                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-card dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.school_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                            >
                                <option value="">{t('enrollments.form.select_school')}</option>
                                {schools.map((school) => (
                                    <option key={school.id} value={school.id}>
                                        {school.name} ({school.code})
                                    </option>
                                ))}
                            </select>
                            {errors.school_id && <p className="text-red-600 text-sm mt-1">{errors.school_id}</p>}
                        </div>

                        <div>
                            <label htmlFor="student_id" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('enrollments.form.student')}</label>
                            <select
                                id="student_id"
                                value={formData.student_id}
                                onChange={(event) => setFormData((prev) => ({ ...prev, student_id: event.target.value }))}
                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-card dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.student_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                            >
                                <option value="">{t('enrollments.form.select_student')}</option>
                                {students.map((student) => (
                                    <option key={student.id} value={student.id}>
                                        {student.firstname} {student.lastname} {student.matricule ? `(${student.matricule})` : ''}
                                    </option>
                                ))}
                            </select>
                            {errors.student_id && <p className="text-red-600 text-sm mt-1">{errors.student_id}</p>}
                        </div>

                        <div>
                            <label htmlFor="class_id" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('enrollments.form.class')}</label>
                            <select
                                id="class_id"
                                value={formData.class_id}
                                onChange={(event) => setFormData((prev) => ({ ...prev, class_id: event.target.value }))}
                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-card dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.class_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                            >
                                <option value="">{t('enrollments.form.select_class')}</option>
                                {classrooms.map((classroom) => (
                                    <option key={classroom.id} value={classroom.id}>
                                        {classroom.name} ({classroom.code})
                                    </option>
                                ))}
                            </select>
                            {errors.class_id && <p className="text-red-600 text-sm mt-1">{errors.class_id}</p>}
                        </div>

                        <div>
                            <label htmlFor="academic_year_id" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('enrollments.form.academic_year')}</label>
                            <select
                                id="academic_year_id"
                                value={formData.academic_year_id}
                                onChange={(event) => setFormData((prev) => ({ ...prev, academic_year_id: event.target.value }))}
                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-card dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.academic_year_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                            >
                                <option value="">{t('enrollments.form.select_year')}</option>
                                {academicYears.map((academicYear) => (
                                    <option key={academicYear.id} value={academicYear.id}>
                                        {academicYear.year}{academicYear.active ? ` (${t('enrollments.form.active_suffix')})` : ''}
                                    </option>
                                ))}
                            </select>
                            {errors.academic_year_id && <p className="text-red-600 text-sm mt-1">{errors.academic_year_id}</p>}
                        </div>

                        <div>
                            <label htmlFor="enrollment_code" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('enrollments.form.code')}</label>
                            <Input
                                id="enrollment_code"
                                value={formData.enrollment_code}
                                onChange={(event) => setFormData((prev) => ({ ...prev, enrollment_code: event.target.value }))}
                                className={errors.enrollment_code ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                            />
                            {errors.enrollment_code && <p className="text-red-600 text-sm mt-1">{errors.enrollment_code}</p>}
                        </div>

                        <div>
                            <label htmlFor="enrollment_date" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('enrollments.form.date')}</label>
                            <Input
                                id="enrollment_date"
                                type="date"
                                value={formData.enrollment_date}
                                onChange={(event) => setFormData((prev) => ({ ...prev, enrollment_date: event.target.value }))}
                                className={errors.enrollment_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                            />
                            {errors.enrollment_date && <p className="text-red-600 text-sm mt-1">{errors.enrollment_date}</p>}
                        </div>

                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('enrollments.form.status')}</label>
                            <select
                                id="status"
                                value={formData.status}
                                onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value as Enrollment['status'] }))}
                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-card dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.status ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                            >
                                <option value="PENDING">{t('enrollments.index.status.pending')}</option>
                                <option value="ACTIVE">{t('enrollments.index.status.active')}</option>
                                <option value="CANCELLED">{t('enrollments.index.status.cancelled')}</option>
                            </select>
                            {errors.status && <p className="text-red-600 text-sm mt-1">{errors.status}</p>}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {isSubmitting ? t('enrollments.form.saving') : t('common.actions.save')}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => router.get(route('enrollments.index'))}>
                            {t('common.actions.cancel')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
