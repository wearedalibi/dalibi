import { Head, router, useForm } from '@inertiajs/react';
import { useCurrencySymbol } from '@/helpers/money';
import { ArrowLeft, Save, User, Award, Calendar, FileText, Search, ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Student {
    id: string;
    matricule: string;
    firstname: string;
    lastname: string;
}

interface Scholarship {
    id: string;
    name: string;
    value: number;
}

interface AcademicYear {
    id: string;
    year: string;
}

interface CreateProps {
    students: Student[];
    scholarships: Scholarship[];
    academicYears: AcademicYear[];
}

// Composant SearchSelect personnalisé pour les élèves
interface SearchSelectProps {
    students: Student[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: string;
}

function StudentSearchSelect({ students, value, onChange, placeholder, error }: SearchSelectProps) {
    const { t } = useTranslation();
    const ph = placeholder ?? t('scholarships.form.select_student');
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filtrer les élèves
    const filteredStudents = students.filter((student) =>
        search === '' ||
        `${student.firstname} ${student.lastname} ${student.matricule}`
            .toLowerCase()
            .includes(search.toLowerCase())
    ).slice(0, 50); // Limiter à 50 résultats pour les performances

    // Trouver l'élève sélectionné
    const selectedStudent = students.find(s => s.id === value);

    // Fermer la liste quand on clique en dehors
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Gérer les touches du clavier
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                setIsOpen(true);
                setHighlightedIndex(0);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < filteredStudents.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && filteredStudents[highlightedIndex]) {
                    onChange(filteredStudents[highlightedIndex].id);
                    setIsOpen(false);
                    setSearch('');
                    setHighlightedIndex(-1);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    const handleSelect = (student: Student) => {
        onChange(student.id);
        setIsOpen(false);
        setSearch('');
        setHighlightedIndex(-1);
        inputRef.current?.blur();
    };

    return (
        <div className="relative" ref={containerRef}>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                    ref={inputRef}
                    type="text"
                    placeholder={selectedStudent ? `${selectedStudent.firstname} ${selectedStudent.lastname} (${selectedStudent.matricule})` : ph}
                    value={isOpen ? search : (selectedStudent ? `${selectedStudent.firstname} ${selectedStudent.lastname} (${selectedStudent.matricule})` : '')}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setIsOpen(true);
                        setHighlightedIndex(-1);
                    }}
                    onFocus={() => {
                        setIsOpen(true);
                        setSearch('');
                    }}
                    onKeyDown={handleKeyDown}
                    className={`pl-10 pr-10 bg-white ${error ? 'border-red-500' : ''}`}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <ChevronDown
                        className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredStudents.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                            {t('scholarships.form.no_student')}
                        </div>
                    ) : (
                        filteredStudents.map((student, index) => (
                            <div
                                key={student.id}
                                className={`px-3 py-2 cursor-pointer text-sm hover:bg-blue-50 flex items-center justify-between ${
                                    index === highlightedIndex ? 'bg-blue-50' : ''
                                } ${student.id === value ? 'bg-blue-100' : ''}`}
                                onClick={() => handleSelect(student)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                            >
                                <span>
                                    {student.firstname} {student.lastname} ({student.matricule})
                                </span>
                                {student.id === value && (
                                    <Check className="h-4 w-4 text-blue-600" />
                                )}
                            </div>
                        ))
                    )}
                    {students.length > 50 && filteredStudents.length === 50 && (
                        <div className="px-3 py-2 text-xs text-gray-500 border-t">
                            {t('scholarships.form.more_students', { count: students.length - 50 })}
                        </div>
                    )}
                </div>
            )}

            {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
        </div>
    );
}

export default function Create({ students, scholarships, academicYears }: Readonly<CreateProps>) {
    const { t } = useTranslation();
    const currency = useCurrencySymbol();
    const { data, setData, post, processing, errors } = useForm({
        student_id: '',
        scholarship_id: '',
        academic_year_id: '',
        number_of_year: '',
        start_date: '',
        end_date: '',
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('student-scholarships.store'));
    };

    return (
        <AppLayout>
            <Head title={t('scholarships.form.create_head')} />

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.visit(route('student-scholarships.index'))}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('common.actions.back')}
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('scholarships.form.create_title')}</h1>
                        <p className="text-sm text-gray-600">
                            {t('scholarships.form.create_subtitle')}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Informations de l'attribution */}
                    <Card className="bg-blue-50 border-blue-200">
                        <CardHeader className="bg-blue-100">
                            <CardTitle className="flex items-center gap-2 text-blue-900">
                                <Award className="h-5 w-5" />
                                {t('scholarships.form.section_award')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                {/* Student Selection */}
                                <div className="space-y-2">
                                    <Label htmlFor="student_id" className="flex items-center gap-2 text-blue-800">
                                        <User className="h-4 w-4" />
                                        {t('scholarships.form.student')}
                                    </Label>
                                    <StudentSearchSelect
                                        students={students}
                                        value={data.student_id}
                                        onChange={(value) => setData('student_id', value)}
                                        placeholder={t('scholarships.form.student_search_ph')}
                                        error={errors.student_id}
                                    />
                                </div>

                                {/* Scholarship Selection */}
                                <div className="space-y-2">
                                    <Label htmlFor="scholarship_id" className="flex items-center gap-2 text-blue-800">
                                        <Award className="h-4 w-4" />
                                        {t('scholarships.form.scholarship')}
                                    </Label>
                                    <Select
                                        value={data.scholarship_id}
                                        onValueChange={(value) => setData('scholarship_id', value)}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder={t('scholarships.form.select_scholarship')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {scholarships.map((scholarship) => (
                                                <SelectItem key={scholarship.id} value={scholarship.id}>
                                                    {scholarship.name} ({scholarship.value.toLocaleString()} {currency})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.scholarship_id && (
                                        <p className="text-sm text-red-600">{errors.scholarship_id}</p>
                                    )}
                                </div>

                                {/* Academic Year Selection */}
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="academic_year_id" className="flex items-center gap-2 text-blue-800">
                                        <Calendar className="h-4 w-4" />
                                        {t('scholarships.form.academic_year')}
                                    </Label>
                                    <Select
                                        value={data.academic_year_id}
                                        onValueChange={(value) => setData('academic_year_id', value)}
                                    >
                                        <SelectTrigger className="bg-white md:w-1/2">
                                            <SelectValue placeholder={t('scholarships.form.select_year')} />
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
                                        <p className="text-sm text-red-600">{errors.academic_year_id}</p>
                                    )}
                                </div>

                                {/* Scholarship Duration */}
                                <div className="space-y-2">
                                    <Label htmlFor="number_of_year" className="flex items-center gap-2 text-blue-800">
                                        {t('scholarships.form.number_of_year')}
                                    </Label>
                                    <Input
                                        type="number"
                                        id="number_of_year"
                                        value={data.number_of_year}
                                        onChange={(e) => setData('number_of_year', e.target.value)}
                                        placeholder={t('scholarships.form.number_of_year_ph')}
                                        className="bg-white"
                                        min="1"
                                    />
                                    {errors.number_of_year && (
                                        <p className="text-sm text-red-600">{errors.number_of_year}</p>
                                    )}
                                </div>

                                {/* Scholarship Start Date */}
                                <div className="space-y-2">
                                    <Label htmlFor="start_date" className="flex items-center gap-2 text-blue-800">
                                        <Calendar className="h-4 w-4" />
                                        {t('scholarships.form.start_date')}
                                    </Label>
                                    <Input
                                        type="date"
                                        id="start_date"
                                        value={data.start_date}
                                        onChange={(e) => setData('start_date', e.target.value)}
                                        className="bg-white"
                                    />
                                    {errors.start_date && (
                                        <p className="text-sm text-red-600">{errors.start_date}</p>
                                    )}
                                </div>

                                {/* Scholarship End Date */}
                                <div className="space-y-2">
                                    <Label htmlFor="end_date" className="flex items-center gap-2 text-blue-800">
                                        <Calendar className="h-4 w-4" />
                                        {t('scholarships.form.end_date')}
                                    </Label>
                                    <Input
                                        type="date"
                                        id="end_date"
                                        value={data.end_date}
                                        onChange={(e) => setData('end_date', e.target.value)}
                                        className="bg-white"
                                    />
                                    {errors.end_date && (
                                        <p className="text-sm text-red-600">{errors.end_date}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notes complémentaires */}
                    <Card className="bg-green-50 border-green-200">
                        <CardHeader className="bg-green-100">
                            <CardTitle className="flex items-center gap-2 text-green-900">
                                <FileText className="h-5 w-5" />
                                {t('scholarships.form.extra_info')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-2">
                                <Label htmlFor="notes" className="flex items-center gap-2 text-green-800">
                                    <FileText className="h-4 w-4" />
                                    {t('scholarships.form.notes')}
                                </Label>
                                <Textarea
                                    id="notes"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    placeholder={t('scholarships.form.notes_ph')}
                                    rows={3}
                                    className="bg-white"
                                />
                                {errors.notes && (
                                    <p className="text-sm text-red-600">{errors.notes}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.visit(route('student-scholarships.index'))}
                        >
                            {t('common.actions.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {processing ? t('scholarships.form.saving') : t('common.actions.save')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}