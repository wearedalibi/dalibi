import { Head, router } from '@inertiajs/react';
import { ArrowLeft, BookOpen, CheckCircle2, Clock, Info, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Subject {
    id: string;
    name: string;
}

interface Teacher {
    id: string;
    firstname?: string;
    lastname?: string;
    name?: string;
}

interface AcademicYear {
    id: string;
    year: string;
}

interface ClassroomType {
    id: string;
    name: string;
}

interface Classroom {
    id: string;
    name: string;
    type?: ClassroomType | null;
}

interface SubjectAssignment {
    id: string;
    subject: Subject;
    teacher: Teacher;
    academic_year: AcademicYear;
    classroom: Classroom;
    active: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

interface ShowProps {
    assignment: SubjectAssignment;
}

export default function Show({ assignment }: Readonly<ShowProps>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const teacherName = assignment.teacher.name
        ?? [assignment.teacher.firstname, assignment.teacher.lastname].filter(Boolean).join(' ')
        ?? '—';

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString(dateLocale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <AppLayout>
            <Head title={t('administration.subject_assignments.show.head', { subject: assignment.subject.name })} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.get(route('subject-assignments.index'))}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{t('administration.subject_assignments.show.title')}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-gray-600">{assignment.subject.name}</span>
                                {assignment.active && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        <CheckCircle2 className="w-3 h-3" />
                                        {t('administration.subject_assignments.active')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <Button
                        onClick={() => router.get(route('subject-assignments.edit', assignment.id))}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {t('administration.subject_assignments.show.edit')}
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Informations principales */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-blue-600" />
                                {t('administration.subject_assignments.show.info')}
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">{t('administration.subject_assignments.show.subject')}</p>
                                    <p className="font-medium text-gray-900 mt-1">{assignment.subject.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t('administration.subject_assignments.show.teacher')}</p>
                                    <p className="font-medium text-gray-900 mt-1 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-gray-500" />
                                        {teacherName}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t('administration.subject_assignments.show.class')}</p>
                                    <p className="font-medium text-gray-900 mt-1">{assignment.classroom.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t('administration.subject_assignments.show.class_type')}</p>
                                    <p className="font-medium text-gray-900 mt-1">
                                        {assignment.classroom.type?.name || '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t('administration.subject_assignments.show.year')}</p>
                                    <p className="font-medium text-gray-900 mt-1">{assignment.academic_year.year}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t('administration.subject_assignments.show.status')}</p>
                                    <p className="font-medium text-gray-900 mt-1">
                                        {assignment.active ? t('administration.subject_assignments.active') : t('administration.subject_assignments.inactive')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {assignment.notes && (
                            <div className="bg-white rounded-lg border p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Info className="w-5 h-5 text-blue-600" />
                                    {t('administration.subject_assignments.show.notes')}
                                </h2>
                                <p className="text-gray-700 leading-relaxed">{assignment.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-600" />
                                {t('administration.subject_assignments.show.system_info')}
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600">{t('administration.subject_assignments.show.created_at')}</p>
                                    <p className="text-sm text-gray-900 mt-1">{formatDate(assignment.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t('administration.subject_assignments.show.updated_at')}</p>
                                    <p className="text-sm text-gray-900 mt-1">{formatDate(assignment.updated_at)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t('administration.subject_assignments.show.id')}</p>
                                    <p className="text-xs text-gray-500 mt-1 font-mono break-all">
                                        {assignment.id}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                {t('administration.subject_assignments.show.about')}
                            </h3>
                            <p className="text-sm text-blue-700">
                                {t('administration.subject_assignments.show.about_desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
