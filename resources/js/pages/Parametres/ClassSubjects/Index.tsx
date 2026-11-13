import { Head, router } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Search, BookOpen, CheckCircle2, Eye, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/icon-button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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

interface ClassSubjectData {
    id: string;
    class: Classroom;
    subject: Subject;
    academicYear?: AcademicYear;
    coefficient: number;
    created_at: string;
}

interface PaginatedClassSubjects {
    data: ClassSubjectData[];
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
}

interface IndexProps {
    classSubjects: PaginatedClassSubjects;
    message?: string;
    filters: {
        search?: string;
        class_id?: string;
        academic_year_id?: string;
    };
}

export default function Index({ classSubjects, message, filters }: Readonly<IndexProps>) {
    const { t } = useTranslation();
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');

    const handleDelete = (id: string) => {
        setIsDeleting(true);
        router.delete(route('class-subjects.destroy', id), {
            onSuccess: () => {
                setDeleteConfirm(null);
                setIsDeleting(false);
            },
            onError: () => {
                setIsDeleting(false);
            },
        });
    };

    const handleSearch = () => {
        router.get(route('class-subjects.index'), { search: searchQuery }, {
            preserveScroll: true,
            replace: true,
        });
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        router.get(route('class-subjects.index'), {}, {
            preserveScroll: true,
            replace: true,
        });
    };

    // Group class subjects by class_id and academic_year_id
    const groupedData = classSubjects.data.reduce((acc, cs) => {
        // Skip records with missing key data
        if (!cs.class?.id) return acc;
        
        const key = `${cs.class.id}-${cs.academicYear?.id || 'no-year'}`;
        if (!acc[key]) {
            acc[key] = {
                class: cs.class,
                academicYear: cs.academicYear,
                subjects: [],
                firstId: cs.id,
            };
        }
        acc[key].subjects.push({
            id: cs.id,
            name: cs.subject.name,
            coefficient: cs.coefficient,
        });
        return acc;
    }, {} as Record<string, { class: Classroom; academicYear?: AcademicYear; subjects: Array<{ id: string; name: string; coefficient: number }>; firstId: string }>);

    const groupedRows = Object.values(groupedData);

    const statsCards = [
        {
            title: t('parametres.class_subjects.stat_assignments'),
            value: classSubjects.total,
            icon: BookOpen,
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
        },
        {
            title: t('parametres.class_subjects.stat_classes'),
            value: new Set(classSubjects.data.map(cs => cs.class.id)).size,
            icon: CheckCircle2,
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
        },
    ];

    const subjectBadgePalette = [
        'bg-blue-100 text-blue-800',
        'bg-green-100 text-green-800',
        'bg-purple-100 text-purple-800',
        'bg-amber-100 text-amber-800',
        'bg-rose-100 text-rose-800',
        'bg-cyan-100 text-cyan-800',
    ];

    const getSubjectBadgeClass = (subjectName: string) => {
        const hash = Array.from(subjectName).reduce((total, char) => total + char.charCodeAt(0), 0);
        return subjectBadgePalette[hash % subjectBadgePalette.length];
    };

    return (
        <AppLayout>
            <Head title={t('parametres.class_subjects.head')} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><BookOpen className="h-7 w-7 text-blue-600 shrink-0" />
                            {t('parametres.class_subjects.title')}
                        </h1>
                        <p className="mt-2 text-lg text-gray-600">
                            {t('parametres.class_subjects.subtitle')}
                        </p>
                    </div>
                    <Button
                        onClick={() => router.get(route('class-subjects.create'))}
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="w-5 h-5" />
                        {t('parametres.class_subjects.new')}
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {statsCards.map((card) => (
                        <div
                            key={card.title}
                            className={`${card.bgColor} rounded-lg p-6 border border-gray-200`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">
                                        {card.title}
                                    </p>
                                    <p className={`text-3xl font-bold mt-2 ${card.textColor}`}>
                                        {card.value}
                                    </p>
                                </div>
                                <card.icon className={`w-12 h-12 ${card.textColor} opacity-20`} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Success Message */}
                {message && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-3 shadow-sm">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>{message}</span>
                    </div>
                )}

                {/* Barre de recherche */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                    <div className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-1 relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 group-focus-within:text-blue-600 transition" />
                                <Input
                                    type="text"
                                    placeholder={t('parametres.class_subjects.search_ph')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="pl-10 pr-10 bg-gray-50 border-gray-200 focus:border-blue-300 focus:bg-white transition"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={handleClearSearch}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <Button
                                onClick={handleSearch}
                                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shrink-0 transition"
                            >
                                <Search className="w-4 h-4" />
                                {t('parametres.common.search')}
                            </Button>
                        </div>
                        {searchQuery && (
                            <p className="text-sm text-gray-500 mt-3">
                                {t('parametres.class_subjects.search_results')} <span className="font-semibold text-gray-700">« {searchQuery} »</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Tableau */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow className="border-b border-gray-200">
                                    <TableHead className="font-semibold text-gray-900">{t('parametres.class_subjects.th_class')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('parametres.class_subjects.th_subjects')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('parametres.class_subjects.th_year')}</TableHead>
                                    <TableHead className="text-center font-semibold text-gray-900 w-24">{t('parametres.common.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupedRows.length > 0 ? (
                                    groupedRows.map((group) => (
                                        <TableRow key={`${group.class.id}-${group.academicYear?.id}`} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors">
                                            <TableCell className="font-semibold text-gray-900">
                                                <div className="space-y-1">
                                                    <span className="block">{group.class.name}</span>
                                                    <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                                                        {group.class.code}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-2">
                                                    {group.subjects.map((subject) => (
                                                        <span
                                                            key={subject.id}
                                                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSubjectBadgeClass(subject.name)}`}
                                                        >
                                                            {subject.name} · {t('parametres.class_subjects.coef')} {subject.coefficient}
                                                        </span>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-semibold text-gray-900">
                                                {group.academicYear?.year ?? '—'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex gap-2 justify-center">
                                                    <IconButton
                                                        label={t('parametres.common.view')}
                                                        icon={<Eye className="w-4 h-4" />}
                                                        className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                        onClick={() => router.visit(route('class-subjects.show', group.firstId))}
                                                    />
                                                    <IconButton
                                                        label={t('parametres.common.edit')}
                                                        icon={<Pencil className="w-4 h-4" />}
                                                        className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                        onClick={() => router.get(route('class-subjects.edit', group.firstId))}
                                                    />
                                                    <IconButton
                                                        label={t('parametres.common.delete')}
                                                        icon={<Trash2 className="w-4 h-4" />}
                                                        className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                        onClick={() => setDeleteConfirm(group.firstId)}
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
                                            className="text-center py-12 text-gray-500"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <BookOpen className="w-12 h-12 text-gray-300" />
                                                <p className="text-lg">{t('parametres.class_subjects.empty')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Pagination */}
                {classSubjects.last_page > 1 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                                {t('parametres.class_subjects.showing', { from: classSubjects.from, to: classSubjects.to, total: classSubjects.total })}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={classSubjects.current_page === 1}
                                    onClick={() => router.get(route('class-subjects.index'), { 
                                        page: classSubjects.current_page - 1, 
                                        search: filters.search,
                                        class_id: filters.class_id,
                                        academic_year_id: filters.academic_year_id,
                                    }, { preserveScroll: true })}
                                    className="border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    {t('parametres.common.prev')}
                                </Button>
                                <div className="flex gap-1">
                                    {Array.from({ length: Math.min(5, classSubjects.last_page) }, (_, i) => {
                                        let page = i + 1;
                                        if (classSubjects.last_page > 5 && classSubjects.current_page > 3) {
                                            page = classSubjects.current_page - 2 + i;
                                        }
                                        if (page > classSubjects.last_page) return null;
                                        return (
                                            <Button
                                                key={page}
                                                variant={page === classSubjects.current_page ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => router.get(route('class-subjects.index'), { 
                                                    page, 
                                                    search: filters.search,
                                                    class_id: filters.class_id,
                                                    academic_year_id: filters.academic_year_id,
                                                }, { preserveScroll: true })}
                                                className={page === classSubjects.current_page 
                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                                    : 'border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
                                                }
                                            >
                                                {page}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={classSubjects.current_page === classSubjects.last_page}
                                    onClick={() => router.get(route('class-subjects.index'), { 
                                        page: classSubjects.current_page + 1, 
                                        search: filters.search,
                                        class_id: filters.class_id,
                                        academic_year_id: filters.academic_year_id,
                                    }, { preserveScroll: true })}
                                    className="border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {t('parametres.common.next')}
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                            <p className="text-sm text-gray-600">
                                {t('parametres.class_subjects.page_of', { current: classSubjects.current_page, last: classSubjects.last_page })}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('parametres.class_subjects.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('parametres.class_subjects.delete_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-3 justify-end">
                        <AlertDialogCancel>{t('parametres.common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deleteConfirm) {
                                    handleDelete(deleteConfirm);
                                }
                            }}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? t('parametres.class_subjects.deleting') : t('parametres.common.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
