import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Search, X } from 'lucide-react';
import type { FormEvent} from 'react';
import { useMemo, useState } from 'react';
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

interface ClassSubject {
    id: string;
    class_id: string;
    academic_year_id: string;
}

interface AssignedSubject {
    subject_id: string;
    coefficient: number;
    group?: string;
}

interface EditProps {
    classSubject: ClassSubject;
    classrooms: Classroom[];
    subjects: Subject[];
    academicYears: AcademicYear[];
    assignedSubjects: AssignedSubject[];
}

export default function Edit({
    classSubject,
    classrooms,
    subjects,
    academicYears,
    assignedSubjects,
}: Readonly<EditProps>) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        class_id: classSubject.class_id,
        academic_year_id: classSubject.academic_year_id,
    });
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>(assignedSubjects.map((item) => item.subject_id));
    const [coefficients, setCoefficients] = useState<Record<string, string>>(
        assignedSubjects.reduce((acc, item) => {
            acc[item.subject_id] = String(item.coefficient);
            return acc;
        }, {} as Record<string, string>)
    );
    const [groups, setGroups] = useState<Record<string, string>>(
        assignedSubjects.reduce((acc, item) => {
            acc[item.subject_id] = item.group ?? 'obligatoire';
            return acc;
        }, {} as Record<string, string>)
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredSubjects = useMemo(() => {
        return subjects.filter((subject) =>
            subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            subject.code.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [subjects, searchQuery]);

    const handleSubjectToggle = (subjectId: string) => {
        const isSelected = selectedSubjects.includes(subjectId);

        setSelectedSubjects((prev) =>
            prev.includes(subjectId)
                ? prev.filter((id) => id !== subjectId)
                : [...prev, subjectId]
        );

        setCoefficients((prev) => {
            if (isSelected) {
                const { [subjectId]: _, ...rest } = prev;
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

    const updateGroup = (subjectId: string, value: string) => {
        setGroups((prev) => ({ ...prev, [subjectId]: value }));
    };

    const normalizeCoefficient = (value: string): number => {
        return Number.parseFloat(value.replace(',', '.'));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const newErrors: Record<string, string> = {};

        if (selectedSubjects.length === 0) {
            newErrors.subjects = t('parametres.class_subjects.err_subjects_required');
        }

        selectedSubjects.forEach((subjectId) => {
            const coefficient = normalizeCoefficient(coefficients[subjectId] ?? '');
            if (!Number.isFinite(coefficient) || coefficient <= 0) {
                newErrors[`coefficient_${subjectId}`] = t('parametres.class_subjects.err_coef_invalid');
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
            group: groups[subjectId] ?? 'obligatoire',
        }));

        router.put(
            route('class-subjects.update', classSubject.id),
            {
                ...formData,
                assignments,
            },
            {
                onError: (errors) => {
                    setErrors(errors as Record<string, string>);
                    setIsSubmitting(false);
                },
                onSuccess: () => {
                    setIsSubmitting(false);
                },
            }
        );
    };

    return (
        <AppLayout>
            <Head title={t('parametres.class_subjects.edit_head')} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.get(route('class-subjects.index'))}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {t('parametres.class_subjects.edit_title')}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {t('parametres.class_subjects.edit_subtitle')}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Class and Year Selection */}
                    <div className="bg-white rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            {t('parametres.class_subjects.section_base')}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Classe */}
                            <div>
                                <label htmlFor="class_id" className="block text-sm font-medium text-gray-900 mb-2">
                                    {t('parametres.class_subjects.label_class')} *
                                </label>
                                <Select
                                    value={formData.class_id}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            class_id: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger
                                        className={
                                            errors.class_id ? 'border-red-500' : ''
                                        }
                                    >
                                        <SelectValue placeholder={t('parametres.class_subjects.class_ph')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classrooms.map((classroom) => (
                                            <SelectItem
                                                key={classroom.id}
                                                value={classroom.id}
                                            >
                                                {classroom.name} ({classroom.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.class_id && (
                                    <p className="text-red-600 text-sm mt-1">
                                        {errors.class_id}
                                    </p>
                                )}
                            </div>

                            {/* Année Académique */}
                            <div>
                                <label htmlFor="academic_year_id" className="block text-sm font-medium text-gray-900 mb-2">
                                    {t('parametres.class_subjects.label_year')} *
                                </label>
                                <Select
                                    value={formData.academic_year_id}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            academic_year_id: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger
                                        className={
                                            errors.academic_year_id
                                                ? 'border-red-500'
                                                : ''
                                        }
                                    >
                                        <SelectValue placeholder={t('parametres.class_subjects.year_ph')} />
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
                                    <p className="text-red-600 text-sm mt-1">
                                        {errors.academic_year_id}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Subject Selection with Search */}
                    <div className="bg-white rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            {t('parametres.class_subjects.section_subjects')}
                        </h2>

                        {/* Search Box */}
                        <div className="mb-4">
                            <label htmlFor="search" className="block text-sm font-medium text-gray-900 mb-2">
                                {t('parametres.class_subjects.search_subjects')}
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    id="search"
                                    type="text"
                                    placeholder={t('parametres.class_subjects.search_subjects_ph')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {/* Selected Subjects Badges */}
                        {selectedSubjects.length > 0 && (
                            <div className="mb-4 flex flex-wrap gap-2">
                                {selectedSubjects.map((subjectId) => {
                                    const subject = subjects.find((s) => s.id === subjectId);
                                    return (
                                        <div
                                            key={subjectId}
                                            className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"
                                        >
                                            {subject?.name} · {t('parametres.class_subjects.coef')} {coefficients[subjectId] ?? '1'}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleSubjectToggle(subjectId)
                                                }
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Subjects List */}
                        <div className="space-y-2 rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                            {filteredSubjects.length > 0 ? (
                                filteredSubjects.map((subject) => (
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
                                            <p className="text-sm font-medium text-gray-900">
                                                {subject.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {t('parametres.class_subjects.code')}: {subject.code}
                                            </p>
                                        </button>
                                        {selectedSubjects.includes(subject.id) && (
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={coefficients[subject.id] ?? '1'}
                                                    onChange={(e) => updateCoefficient(subject.id, e.target.value)}
                                                    placeholder={t('parametres.class_subjects.coef_ph')}
                                                    className={`w-20 ${errors[`coefficient_${subject.id}`] ? 'border-red-500' : ''}`}
                                                />
                                                <Select value={groups[subject.id] ?? 'obligatoire'} onValueChange={(v) => updateGroup(subject.id, v)}>
                                                    <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="obligatoire">{t('parametres.class_subjects.group_required')}</SelectItem>
                                                        <SelectItem value="facultatif">{t('parametres.class_subjects.group_optional')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 py-4">
                                    {t('parametres.class_subjects.no_subjects')}
                                </p>
                            )}
                        </div>

                        {errors.subjects && (
                            <p className="text-red-600 text-sm mt-2">
                                {errors.subjects}
                            </p>
                        )}
                        {errors['assignments'] && (
                            <p className="text-red-600 text-sm mt-2">
                                {errors['assignments']}
                            </p>
                        )}
                        {errors['assignments.0.coefficient'] && (
                            <p className="text-red-600 text-sm mt-2">
                                {errors['assignments.0.coefficient']}
                            </p>
                        )}
                        {errors['subject_ids'] && (
                            <p className="text-red-600 text-sm mt-2">
                                {errors['subject_ids']}
                            </p>
                        )}
                    </div>

                    {/* Summary */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-900">
                            {t('parametres.class_subjects.selected_count', { n: selectedSubjects.length })}
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSubmitting ? t('parametres.class_subjects.updating') : t('parametres.class_subjects.submit_update')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.get(route('class-subjects.index'))}
                        >
                            {t('parametres.common.cancel')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
