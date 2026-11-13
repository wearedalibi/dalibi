import { Head, router } from '@inertiajs/react';
import { ArrowLeft, BookOpen, Edit, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface ClassroomType {
    id: string;
    name: string;
}

interface Subject {
    id: string;
    name: string;
    code: string;
}

interface AcademicYear {
    id: string;
    year: string;
    active: boolean;
}

interface SubjectAssignment {
    id: string;
    subject: Subject;
    coefficient: number;
    academic_year: AcademicYear;
}

interface Classroom {
    id: string;
    name: string;
    code: string;
    capacity: number;
    type?: ClassroomType | null;
    created_at: string;
    updated_at: string;
}

interface ShowProps {
    classroom: Classroom;
    academicYears: AcademicYear[];
    subjectAssignments: Record<string, SubjectAssignment[]>;
}

export default function Show({ classroom, academicYears, subjectAssignments }: Readonly<ShowProps>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [selectedYearId, setSelectedYearId] = useState<string>(
        academicYears.find((year) => year.active)?.id || academicYears[0]?.id || ''
    );

    const currentAssignments = selectedYearId ? subjectAssignments[selectedYearId] || [] : [];
    const totalCoefficients = currentAssignments.reduce((sum, assignment) => sum + assignment.coefficient, 0);

    return (
        <AppLayout>
            <Head title={classroom.name} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-300"
                            onClick={() => router.visit(route('classrooms.index'))}
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                                    <GraduationCap className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                                        {classroom.name}
                                    </h1>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {t('parametres.classrooms.show_code')}: <span className="font-semibold">{classroom.code}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                            onClick={() => router.visit(route('classrooms.subject-assignments.create', classroom.id))}
                        >
                            <BookOpen className="w-4 h-4 mr-2" />
                            {t('parametres.classrooms.assign_subjects')}
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => router.visit(route('classrooms.edit', classroom.id))}
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            {t('parametres.common.edit')}
                        </Button>
                    </div>
                </div>

                {/* Informations cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                        <p className="text-sm font-medium text-gray-600">{t('parametres.classrooms.show_capacity')}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                            {classroom.capacity}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{t('parametres.classrooms.show_capacity_hint')}</p>
                    </div>

                    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                        <p className="text-sm font-medium text-gray-600">{t('parametres.classrooms.show_type')}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">
                            {classroom.type?.name || '—'}
                        </p>
                    </div>

                    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                        <p className="text-sm font-medium text-gray-600 mb-3">{t('parametres.classrooms.show_created_on')}</p>
                        <p className="text-sm text-gray-600">
                            {new Date(classroom.created_at).toLocaleDateString(dateLocale, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </p>
                        <p className="text-sm font-medium text-gray-600 mt-4 mb-2">{t('parametres.classrooms.show_updated_on')}</p>
                        <p className="text-sm text-gray-600">
                            {new Date(classroom.updated_at).toLocaleDateString(dateLocale, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </p>
                    </div>
                </div>

                {/* Matières et Coefficients */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {t('parametres.classrooms.subjects_title')}
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    {t('parametres.classrooms.subjects_summary', { n: currentAssignments.length, total: totalCoefficients.toFixed(2) })}
                                </p>
                            </div>
                            {academicYears.length > 0 && (
                                <div className="w-64">
                                    <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                                        <SelectTrigger className="border-gray-200">
                                            <SelectValue placeholder={t('parametres.classrooms.select_year_ph')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {academicYears.map((year) => (
                                                <SelectItem key={year.id} value={year.id}>
                                                    {year.year} {year.active && '✓'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </div>

                    {currentAssignments.length > 0 ? (
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {currentAssignments.map((assignment) => (
                                    <div
                                        key={assignment.id}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                                <BookOpen className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {assignment.subject.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {t('parametres.classrooms.show_code')}: {assignment.subject.code}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-800">
                                            {t('parametres.classrooms.coef')} {assignment.coefficient}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 flex items-center justify-center">
                            <div className="text-center">
                                <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
                                <p className="mt-4 text-lg text-gray-500">
                                    {t('parametres.classrooms.no_assignments')}
                                </p>
                                <Button
                                    className="mt-4 bg-blue-600 hover:bg-blue-700"
                                    onClick={() => router.visit(route('classrooms.subject-assignments.create', classroom.id))}
                                >
                                    {t('parametres.classrooms.assign_subjects')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
