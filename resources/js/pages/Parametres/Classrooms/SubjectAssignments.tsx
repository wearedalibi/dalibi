import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { type SyntheticEvent, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Classroom {
    id: string;
    name: string;
    code: string;
}

interface Subject {
    id: string;
    name: string;
    code: string;
}

interface AcademicYear {
    id: string;
    year: string;
    start_date: string;
    end_date: string;
}

interface ExistingAssignment {
    subject_id: string;
    coefficient: number;
}

interface SubjectAssignmentsProps {
    classroom: Classroom;
    subjects: Subject[];
    academicYears: AcademicYear[];
    existingAssignmentsByYear: Record<string, ExistingAssignment[]>;
}

export default function SubjectAssignments({
    classroom,
    subjects,
    academicYears,
    existingAssignmentsByYear,
}: Readonly<SubjectAssignmentsProps>) {
    const { t } = useTranslation();
    const [academicYearId, setAcademicYearId] = useState('');
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [coefficients, setCoefficients] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredSubjects = useMemo(() => {
        return subjects.filter((subject) =>
            subject.name.toLowerCase().includes(searchQuery.toLowerCase())
            || subject.code.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [subjects, searchQuery]);

    const handleAcademicYearChange = (yearId: string) => {
        setAcademicYearId(yearId);

        if (!yearId) {
            setSelectedSubjects([]);
            setCoefficients({});
            return;
        }

        const existing = existingAssignmentsByYear[yearId] ?? [];
        setSelectedSubjects(existing.map((item) => item.subject_id));
        setCoefficients(
            existing.reduce((acc, item) => {
                acc[item.subject_id] = String(item.coefficient);
                return acc;
            }, {} as Record<string, string>)
        );
    };

    const handleSubjectToggle = (subjectId: string) => {
        const isSelected = selectedSubjects.includes(subjectId);

        setSelectedSubjects((prev) => (
            isSelected ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
        ));

        setCoefficients((prev) => {
            if (isSelected) {
                const rest = { ...prev };
                delete rest[subjectId];
                return rest;
            }

            return {
                ...prev,
                [subjectId]: prev[subjectId] ?? '1',
            };
        });
    };

    const updateCoefficient = (subjectId: string, value: string) => {
        setCoefficients((prev) => ({
            ...prev,
            [subjectId]: value,
        }));
    };

    const normalizeCoefficient = (value: string): number => {
        return Number.parseFloat(value.replace(',', '.'));
    };

    const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const newErrors: Record<string, string> = {};

        if (!academicYearId) {
            newErrors.academic_year_id = t('parametres.classrooms.err_year_required');
        }

        if (selectedSubjects.length === 0) {
            newErrors.subjects = t('parametres.classrooms.err_subjects_required');
        }

        selectedSubjects.forEach((subjectId) => {
            const coefficient = normalizeCoefficient(coefficients[subjectId] ?? '');
            if (!Number.isFinite(coefficient) || coefficient <= 0) {
                newErrors[`coefficient_${subjectId}`] = t('parametres.classrooms.err_coef_invalid');
            }
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setIsSubmitting(false);
            return;
        }

        const assignments = selectedSubjects.map((subjectId) => ({
            subject_id: subjectId,
            coefficient: normalizeCoefficient(coefficients[subjectId] ?? '0'),
        }));

        router.post(route('classrooms.subject-assignments.store', classroom.id), {
            class_id: classroom.id,
            academic_year_id: academicYearId,
            assignments,
        }, {
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
            <Head title={t('parametres.classrooms.assign_head', { name: classroom.name })} />

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.get(route('classrooms.index'))}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {t('parametres.classrooms.assign_title')}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {t('parametres.classrooms.assign_class_before')} <span className="font-semibold text-gray-900">{classroom.name} ({classroom.code})</span>
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white rounded-lg p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('parametres.classrooms.assign_year_section')}</h2>
                        <div className="max-w-md">
                            <Select
                                value={academicYearId}
                                onValueChange={handleAcademicYearChange}
                            >
                                <SelectTrigger className={errors.academic_year_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('parametres.classrooms.assign_year_ph')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {academicYears.map((year) => (
                                        <SelectItem key={year.id} value={year.id}>
                                            {year.year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.academic_year_id && (
                                <p className="text-red-600 text-sm mt-1">{errors.academic_year_id}</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('parametres.classrooms.assign_subjects_section')}</h2>

                        <div className="mb-4 relative max-w-xl">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder={t('parametres.classrooms.assign_search_ph')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-10"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="space-y-2 rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                            {filteredSubjects.map((subject) => (
                                <div
                                    key={subject.id}
                                    className="flex items-center gap-3 p-2 hover:bg-white rounded transition"
                                >
                                    <Checkbox
                                        checked={selectedSubjects.includes(subject.id)}
                                        onCheckedChange={() => handleSubjectToggle(subject.id)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleSubjectToggle(subject.id)}
                                        className="flex-1 text-left"
                                    >
                                        <p className="text-sm font-medium text-gray-900">{subject.name}</p>
                                        <p className="text-xs text-gray-500">{t('parametres.classrooms.show_code')}: {subject.code}</p>
                                    </button>
                                    {selectedSubjects.includes(subject.id) && (
                                        <div className="w-32">
                                            <Input
                                                type="text"
                                                inputMode="decimal"
                                                value={coefficients[subject.id] ?? '1'}
                                                onChange={(e) => updateCoefficient(subject.id, e.target.value)}
                                                placeholder={t('parametres.classrooms.assign_coef_ph')}
                                                className={errors[`coefficient_${subject.id}`] ? 'border-red-500' : ''}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {errors.subjects && <p className="text-red-600 text-sm mt-2">{errors.subjects}</p>}
                        {errors.assignments && <p className="text-red-600 text-sm mt-2">{errors.assignments}</p>}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-900">
                            {t('parametres.classrooms.assign_selected_count', { n: selectedSubjects.length })}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSubmitting ? t('parametres.classrooms.assign_saving') : t('parametres.classrooms.assign_submit')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.get(route('classrooms.index'))}
                        >
                            {t('parametres.common.cancel')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
