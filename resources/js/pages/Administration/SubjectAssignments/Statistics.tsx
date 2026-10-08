import { Head, router } from '@inertiajs/react';
import { ArrowLeft, BarChart3, BookOpen, CheckCircle2, Users, GraduationCap, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { route } from '@/helpers/route';
import AppLayout from '@/layouts/app-layout';

interface Teacher {
    id: string;
    firstname: string;
    lastname: string;
}

interface AcademicYear {
    id: string;
    year: string;
}

interface Assignment {
    id: string;
    subject: string;
    classroom: string;
    classroom_code?: string | null;
    active: boolean;
    notes: string | null;
}

interface Summary {
    total: number;
    active: number;
    subjects: number;
    classes: number;
}

interface StatisticsProps {
    teachers: Teacher[];
    academicYears: AcademicYear[];
    filters: {
        academic_year_id?: string;
        teacher_id?: string;
    };
    teacher: { id: string; name: string } | null;
    assignments: Assignment[];
    summary: Summary;
}

export default function Statistics({ teachers, academicYears, filters, teacher, assignments, summary }: Readonly<StatisticsProps>) {
    const yearId = filters.academic_year_id ?? '';
    const teacherId = filters.teacher_id ?? '';

    const apply = (overrides: Record<string, string>) => {
        router.get(route('subject-assignments.statistics'), {
            academic_year_id: yearId,
            teacher_id: teacherId,
            ...overrides,
        }, { preserveScroll: true, replace: true });
    };

    const exportUrl = teacherId
        ? `${route('subject-assignments.statistics.export')}?teacher_id=${teacherId}&academic_year_id=${yearId}`
        : '';

    const statsCards = [
        { title: 'Affectations', value: summary.total, icon: BookOpen, bg: 'bg-blue-50', text: 'text-blue-600' },
        { title: 'Actives', value: summary.active, icon: CheckCircle2, bg: 'bg-green-50', text: 'text-green-600' },
        { title: 'Matières', value: summary.subjects, icon: GraduationCap, bg: 'bg-purple-50', text: 'text-purple-600' },
        { title: 'Classes', value: summary.classes, icon: Users, bg: 'bg-orange-50', text: 'text-orange-600' },
    ];

    return (
        <AppLayout>
            <Head title="Statistiques des affectations" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.get(route('subject-assignments.index'))}
                            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                                <BarChart3 className="h-7 w-7 text-blue-600 shrink-0" />
                                Statistiques des affectations
                            </h1>
                            <p className="mt-1 text-gray-600">Affectations d'un enseignant pour une année académique</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => exportUrl && window.open(exportUrl, '_blank')}
                        disabled={!teacherId || assignments.length === 0}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 shrink-0 disabled:opacity-40"
                    >
                        <Download className="w-4 h-4" />
                        Exporter (PDF)
                    </Button>
                </div>

                {/* Filtres */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex flex-wrap gap-3 items-center">
                        <div>
                            <label htmlFor="stat_year" className="block text-xs font-medium text-gray-500 mb-1">Année académique</label>
                            <select
                                id="stat_year"
                                value={yearId}
                                onChange={(e) => apply({ academic_year_id: e.target.value })}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                                {academicYears.map((y) => (
                                    <option key={y.id} value={y.id}>{y.year}</option>
                                ))}
                            </select>
                        </div>
                        <div className="min-w-[260px]">
                            <label htmlFor="stat_teacher" className="block text-xs font-medium text-gray-500 mb-1">Enseignant</label>
                            <select
                                id="stat_teacher"
                                value={teacherId}
                                onChange={(e) => apply({ teacher_id: e.target.value })}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                                <option value="">— Sélectionner un enseignant —</option>
                                {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>{t.firstname} {t.lastname}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {!teacherId ? (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">Sélectionnez un enseignant pour voir ses affectations.</p>
                    </div>
                ) : (
                    <>
                        {/* KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {statsCards.map((s) => {
                                const Icon = s.icon;
                                return (
                                    <div key={s.title} className={`${s.bg} rounded-lg p-6 shadow-sm`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">{s.title}</p>
                                                <p className={`text-3xl font-bold ${s.text} mt-2`}>{s.value}</p>
                                            </div>
                                            <Icon className={`w-10 h-10 ${s.text}`} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* En-tête enseignant */}
                        {teacher && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                                    {teacher.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                                </div>
                                <p className="font-semibold text-gray-900">{teacher.name}</p>
                            </div>
                        )}

                        {/* Table */}
                        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-gray-50">
                                        <TableRow className="border-b border-gray-200">
                                            <TableHead className="font-semibold text-gray-900">Matière</TableHead>
                                            <TableHead className="font-semibold text-gray-900">Classe</TableHead>
                                            <TableHead className="font-semibold text-gray-900">Statut</TableHead>
                                            <TableHead className="font-semibold text-gray-900">Notes</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {assignments.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-12">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <BookOpen className="w-12 h-12 text-gray-300" />
                                                        <p className="text-gray-500 font-medium">Aucune affectation pour cet enseignant sur cette année.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            assignments.map((a) => (
                                                <TableRow key={a.id} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors">
                                                    <TableCell className="font-medium text-gray-900">{a.subject}</TableCell>
                                                    <TableCell className="text-gray-600">{a.classroom}</TableCell>
                                                    <TableCell>
                                                        {a.active ? (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-gray-600">{a.notes || '—'}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
