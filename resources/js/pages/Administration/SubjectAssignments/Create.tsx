import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpen,
    UserCheck,
    School,
    CalendarDays,
    FileText,
    BadgeCheck,
    Save,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Subject {
    id: string;
    name: string;
}

interface Teacher {
    id: string;
    name?: string;
    firstname?: string;
    lastname?: string;
}

interface AcademicYear {
    id: string;
    year: string;
}

interface Classroom {
    id: string;
    name: string;
}

interface CreateProps {
    subjects: Subject[];
    teachers: Teacher[];
    academicYears: AcademicYear[];
    classrooms: Classroom[];
}

export default function Create({ subjects, teachers, academicYears, classrooms }: Readonly<CreateProps>) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        subject_id: '',
        teacher_id: '',
        // Présélectionne l'année active (academicYears ne contient que les années
        // actives, triées de la plus récente à la plus ancienne).
        academic_year_id: academicYears[0]?.id ?? '',
        class_id: '',
        active: true,
        notes: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [teacherSearch, setTeacherSearch] = useState('');
    const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
    const [selectedTeacherLabel, setSelectedTeacherLabel] = useState('');

    const getTeacherLabel = (teacher: Teacher) =>
        teacher.name ?? `${teacher.firstname ?? ''} ${teacher.lastname ?? ''}`.trim();

    const filteredTeachers = teachers.filter((teacher) =>
        getTeacherLabel(teacher).toLowerCase().includes(teacherSearch.toLowerCase()),
    );

    const selectedTeacher = teachers.find((teacher) => teacher.id === formData.teacher_id);
    const displayedSelectedTeacher = selectedTeacher ? getTeacherLabel(selectedTeacher) : selectedTeacherLabel;

    const handleSubmit = async (e: { preventDefault(): void }) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        router.post(route('subject-assignments.store'), formData, {
            onError: (validationErrors) => {
                setErrors(validationErrors as Record<string, string>);
                setIsSubmitting(false);
            },
            onSuccess: () => {
                setIsSubmitting(false);
            },
        });
    };

    const fieldBase = 'w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-900 shadow-sm';
    const fieldNormal = `${fieldBase} border-0 ring-1 ring-gray-200`;
    const fieldError  = `${fieldBase} ring-2 ring-red-400`;

    return (
        <AppLayout>
            <Head title={t('administration.subject_assignments.create.head')} />

            <div className="space-y-6">
                {/* En-tête */}
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => router.get(route('subject-assignments.index'))}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('administration.subject_assignments.create.title')}</h1>
                        <p className="mt-1 text-gray-500 text-sm">{t('administration.subject_assignments.create.subtitle')}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Section Matière + Enseignant */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div className="rounded-xl bg-blue-50 border border-blue-100 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3 bg-blue-100 text-blue-800 rounded-t-xl">
                            <BookOpen className="w-4 h-4" />
                            <span className="font-semibold text-sm">{t('administration.subject_assignments.form.subject')}</span>
                        </div>
                        <div className="p-5">
                            <label htmlFor="subject_id" className="block text-sm font-medium text-gray-700 mb-2">
                                {t('administration.subject_assignments.form.subject_required')} <span className="text-blue-500">*</span>
                            </label>
                            <select
                                id="subject_id"
                                value={formData.subject_id}
                                onChange={(e) => setFormData((prev) => ({ ...prev, subject_id: e.target.value }))}
                                className={errors.subject_id ? fieldError : fieldNormal}
                            >
                                <option value="">{t('administration.subject_assignments.form.select_subject')}</option>
                                {subjects.map((subject) => (
                                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                                ))}
                            </select>
                            {errors.subject_id && <p className="text-red-500 text-sm mt-1">{errors.subject_id}</p>}
                        </div>
                    </div>

                    {/* Section Enseignant */}
                    <div className="rounded-xl bg-violet-50 border border-violet-100 shadow-sm">
                        <div className="flex items-center gap-2 px-5 py-3 bg-violet-100 text-violet-800 rounded-t-xl">
                            <UserCheck className="w-4 h-4" />
                            <span className="font-semibold text-sm">{t('administration.subject_assignments.form.teacher')}</span>
                        </div>
                        <div className="p-5">
                            <label htmlFor="teacher_search" className="block text-sm font-medium text-gray-700 mb-2">
                                {t('administration.subject_assignments.form.teacher')} <span className="text-violet-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    id="teacher_search"
                                    type="text"
                                    value={teacherSearch}
                                    onChange={(e) => {
                                        setTeacherSearch(e.target.value);
                                        setShowTeacherDropdown(true);
                                        if (!e.target.value.trim()) {
                                            setFormData((prev) => ({ ...prev, teacher_id: '' }));
                                            setSelectedTeacherLabel('');
                                        }
                                    }}
                                    onFocus={() => setShowTeacherDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowTeacherDropdown(false), 250)}
                                    placeholder={t('administration.subject_assignments.form.search_teacher_ph')}
                                    className={errors.teacher_id ? fieldError : fieldNormal}
                                />
                                {showTeacherDropdown && filteredTeachers.length > 0 && (
                                    <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg max-h-56 overflow-auto ring-1 ring-gray-100">
                                        {filteredTeachers.map((teacher) => (
                                            <button
                                                type="button"
                                                key={teacher.id}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setFormData((prev) => ({ ...prev, teacher_id: teacher.id }));
                                                    const label = getTeacherLabel(teacher);
                                                    setTeacherSearch(label);
                                                    setSelectedTeacherLabel(label);
                                                    setShowTeacherDropdown(false);
                                                }}
                                                className="w-full text-left px-3 py-2 hover:bg-violet-50 transition text-sm text-gray-900"
                                            >
                                                {getTeacherLabel(teacher)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {showTeacherDropdown && filteredTeachers.length === 0 && teacherSearch.trim() && (
                                    <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500 ring-1 ring-gray-100">
                                        {t('administration.subject_assignments.form.no_user')}
                                    </div>
                                )}
                            </div>
                            {formData.teacher_id && displayedSelectedTeacher && (
                                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                                    <UserCheck className="w-3.5 h-3.5" />
                                    {displayedSelectedTeacher}
                                </div>
                            )}
                            {errors.teacher_id && <p className="text-red-500 text-sm mt-1">{errors.teacher_id}</p>}
                        </div>
                    </div>

                    </div>{/* fin grid Matière + Enseignant */}

                    {/* Section Classe & Année — deux colonnes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="rounded-xl bg-emerald-50 border border-emerald-100 shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2 px-5 py-3 bg-emerald-100 text-emerald-800">
                                <School className="w-4 h-4" />
                                <span className="font-semibold text-sm">{t('administration.subject_assignments.form.class')}</span>
                            </div>
                            <div className="p-5">
                                <label htmlFor="class_id" className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('administration.subject_assignments.form.class')} <span className="text-emerald-500">*</span>
                                </label>
                                <select
                                    id="class_id"
                                    value={formData.class_id}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, class_id: e.target.value }))}
                                    className={errors.class_id ? fieldError : fieldNormal}
                                >
                                    <option value="">{t('administration.subject_assignments.form.select_class')}</option>
                                    {classrooms.map((classroom) => (
                                        <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
                                    ))}
                                </select>
                                {errors.class_id && <p className="text-red-500 text-sm mt-1">{errors.class_id}</p>}
                            </div>
                        </div>

                        <div className="rounded-xl bg-amber-50 border border-amber-100 shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2 px-5 py-3 bg-amber-100 text-amber-800">
                                <CalendarDays className="w-4 h-4" />
                                <span className="font-semibold text-sm">{t('administration.subject_assignments.form.year')}</span>
                            </div>
                            <div className="p-5">
                                <label htmlFor="academic_year_id" className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('administration.subject_assignments.form.year')} <span className="text-amber-500">*</span>
                                </label>
                                <select
                                    id="academic_year_id"
                                    value={formData.academic_year_id}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, academic_year_id: e.target.value }))}
                                    className={errors.academic_year_id ? fieldError : fieldNormal}
                                >
                                    <option value="">{t('administration.subject_assignments.form.select_year')}</option>
                                    {academicYears.map((year) => (
                                        <option key={year.id} value={year.id}>{year.year}</option>
                                    ))}
                                </select>
                                {errors.academic_year_id && <p className="text-red-500 text-sm mt-1">{errors.academic_year_id}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section Notes & Statut */}
                    <div className="rounded-xl bg-slate-50 border border-slate-100 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-700">
                            <FileText className="w-4 h-4" />
                            <span className="font-semibold text-sm">{t('administration.subject_assignments.form.extra_info')}</span>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('administration.subject_assignments.form.notes')}
                                </label>
                                <textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                                    placeholder={t('administration.subject_assignments.form.notes_ph')}
                                    rows={3}
                                    className={errors.notes ? fieldError : fieldNormal}
                                />
                                {errors.notes && <p className="text-red-500 text-sm mt-1">{errors.notes}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="active"
                                    checked={formData.active}
                                    onCheckedChange={(checked) =>
                                        setFormData((prev) => ({ ...prev, active: checked === true }))
                                    }
                                />
                                <label htmlFor="active" className="text-sm font-medium text-gray-700 cursor-pointer inline-flex items-center gap-1.5">
                                    <BadgeCheck className="w-4 h-4 text-emerald-600" />
                                    {t('administration.subject_assignments.form.active')}
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700 gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {isSubmitting ? t('administration.subject_assignments.create.creating') : t('administration.subject_assignments.create.submit')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.get(route('subject-assignments.index'))}
                            className="border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                            {t('administration.subject_assignments.form.cancel')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
