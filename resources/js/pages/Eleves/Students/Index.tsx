import { Head, router } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Search, Users, UserCheck, Eye, Mars, Venus, CircleHelp, Phone, History, Upload, X, ArrowUpDown, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
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

interface Student {
    id: string;
    matricule?: string | null;
    firstname: string;
    lastname: string;
    gender?: 'male' | 'female' | '' | null;
    nationality?: string | null;
    phone?: string | null;
    email?: string | null;
    profile_photo?: string | null;
    active: boolean;
    user?: {
        id: string;
        firstname?: string | null;
        lastname?: string | null;
        name?: string | null;
        email?: string | null;
    } | null;
    parent_info?: {
        father_phone?: string | null;
        mother_phone?: string | null;
    } | null;
}

interface PaginatedStudents {
    data: Student[];
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

/** Style commun des listes déroulantes de filtre. */
const FILTER_CLS =
    'h-10 rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500';

interface IndexProps {
    students: PaginatedStudents;
    perPage: number;
    stats: {
        total: number;
        active: number;
        inactive: number;
        male: number;
        female: number;
        other: number;
    };
    filters?: Filters;
    options: {
        classrooms: { id: string; name: string }[];
        academicYears: { id: string; year: string }[];
        academicStatuses: Record<string, string>;
        regions: string[];
        prefectures: string[];
    };
}

interface Filters {
    search?: string;
    gender?: string;
    nationality?: string;
    status?: string;
    per_page?: string;
    class_id?: string;
    academic_year_id?: string;
    academic_status?: string;
    region?: string;
    prefecture?: string;
    sort?: string;
    direction?: string;
}

const SORT_VALUES = ['created_at', 'lastname', 'firstname', 'matricule', 'birth_date'] as const;

export default function Index({ students, perPage, stats, filters, options }: Readonly<IndexProps>) {
    const { t } = useTranslation();

    const renderGenderBadge = (gender?: 'male' | 'female' | '' | null) => {
        if (gender === 'male') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    <Mars className="w-3.5 h-3.5" />
                    {t('students.gender.male')}
                </span>
            );
        }

        if (gender === 'female') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-pink-100 text-pink-700">
                    <Venus className="w-3.5 h-3.5" />
                    {t('students.gender.female')}
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                <CircleHelp className="w-3.5 h-3.5" />
                {t('students.gender.unknown')}
            </span>
        );
    };

    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [bulkAction, setBulkAction] = useState('');

    // L'URL fait foi : seuls les champs texte ont un état local (frappe au clavier),
    // resynchronisé quand l'URL change (retour/avance navigateur, lien partagé).
    const [searchQuery, setSearchQuery] = useState(filters?.search ?? '');
    const [nationalityFilter, setNationalityFilter] = useState(filters?.nationality ?? '');
    useEffect(() => setSearchQuery(filters?.search ?? ''), [filters?.search]);
    useEffect(() => setNationalityFilter(filters?.nationality ?? ''), [filters?.nationality]);

    /**
     * Navigue en fusionnant les filtres courants (issus de l'URL) avec les
     * modifications. Les valeurs vides sont retirées de l'URL, et la page est
     * remise à 1 dès qu'un filtre change.
     */
    const go = (overrides: Filters & { page?: number | string }, keepPage = false) => {
        const merged: Record<string, unknown> = {
            ...filters,
            ...(keepPage ? {} : { page: undefined }),
            ...overrides,
        };
        const params: Record<string, string> = {};
        Object.entries(merged).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') params[key] = String(value);
        });
        // Valeurs par défaut : inutile de les traîner dans l'URL.
        if (params.sort === 'created_at' && params.direction === 'desc') {
            delete params.sort;
            delete params.direction;
        }
        if (params.per_page === '25') delete params.per_page;

        router.get(route('students.index'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onSuccess: () => setSelectedStudentIds([]),
        });
    };

    const goToPage = (page: number) => go({ page }, true);
    const changePerPage = (value: number) => go({ per_page: String(value) });

    // Filtres repliés derrière le bouton « Filtres ».
    const advancedFilterCount = [
        filters?.gender, filters?.status, filters?.class_id, filters?.academic_year_id,
        filters?.academic_status, filters?.region, filters?.prefecture,
    ].filter((v) => v !== undefined && v !== '').length;

    const activeFilterCount = advancedFilterCount
        + [filters?.search, filters?.nationality].filter((v) => v !== undefined && v !== '').length;

    // Ouvert d'office si des filtres avancés sont déjà appliqués (sinon ils seraient invisibles).
    const [showFilters, setShowFilters] = useState(advancedFilterCount > 0);
    useEffect(() => {
        if (advancedFilterCount > 0) setShowFilters(true);
    }, [advancedFilterCount]);

    const windowedPages = () => {
        const total = students.last_page;
        const cur = students.current_page;
        const window = 5;
        const start = Math.max(1, Math.min(cur - Math.floor(window / 2), total - window + 1));
        const end = Math.min(total, start + window - 1);
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    };

    const allVisibleSelected = students.data.length > 0 && students.data.every((student) => selectedStudentIds.includes(student.id));

    const handleDelete = (studentId: string) => {
        setIsDeleting(true);
        router.delete(route('students.destroy', studentId), {
            onSuccess: () => {
                setDeleteConfirm(null);
                setIsDeleting(false);
            },
            onError: () => setIsDeleting(false),
        });
    };

    const handleSearch = () => go({ search: searchQuery, nationality: nationalityFilter });

    const handleClearSearch = () => {
        setSearchQuery('');
        setNationalityFilter('');
        router.get(route('students.index'), perPage !== 25 ? { per_page: String(perPage) } : {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onSuccess: () => setSelectedStudentIds([]),
        });
    };

    const toggleSelectStudent = (studentId: string, checked: boolean) => {
        setSelectedStudentIds((prev) => {
            if (checked) {
                return prev.includes(studentId) ? prev : [...prev, studentId];
            }

            return prev.filter((id) => id !== studentId);
        });
    };

    const toggleSelectAllVisible = (checked: boolean) => {
        if (checked) {
            setSelectedStudentIds(students.data.map((student) => student.id));
            return;
        }

        setSelectedStudentIds([]);
    };

    const handleBulkAction = () => {
        if (selectedStudentIds.length === 0 || !bulkAction) {
            return;
        }

        router.post(route('students.bulk-status'), {
            student_ids: selectedStudentIds,
            action: bulkAction,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedStudentIds([]);
                setBulkAction('');
            },
        });
    };

    const statsCards = [
        {
            title: t('students.stats.total'),
            value: stats.total,
            icon: Users,
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
        },
        {
            title: t('students.stats.active'),
            value: stats.active,
            icon: UserCheck,
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
        },
        {
            title: t('students.stats.male'),
            value: stats.male,
            icon: Mars,
            bgColor: 'bg-sky-50',
            textColor: 'text-sky-600',
        },
        {
            title: t('students.stats.female'),
            value: stats.female,
            icon: Venus,
            bgColor: 'bg-pink-50',
            textColor: 'text-pink-600',
        },
    ];

    return (
        <AppLayout>
            <Head title={t('students.title')} />

            <div className="space-y-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><Users className="h-7 w-7 text-blue-600 shrink-0" />{t('students.title')}</h1>
                        <p className="mt-2 text-lg text-gray-600">{t('students.subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => router.get(route('students.import'))}
                            className="gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            {t('students.import')}
                        </Button>
                        <Button
                            onClick={() => router.get(route('students.create'))}
                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                            <Plus className="w-5 h-5" />
                            {t('students.new')}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {statsCards.map((stat) => {
                        const Icon = stat.icon;

                        return (
                            <div key={stat.title} className={`${stat.bgColor} rounded-lg p-6 transition-all hover:shadow-md shadow-sm`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                                        <p className={`text-3xl font-bold ${stat.textColor} mt-2`}>{stat.value}</p>
                                    </div>
                                    <Icon className={`w-12 h-12 ${stat.textColor} opacity-20`} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {selectedStudentIds.length > 0 && (
                    <div className="bg-blue-50 text-blue-800 px-4 py-3 rounded-xl flex items-center justify-between gap-4 shadow-sm ring-1 ring-blue-100">
                        <span className="text-sm font-medium">{t('students.bulk.selected', { count: selectedStudentIds.length })}</span>
                        <div className="flex items-center gap-2">
                            <select
                                value={bulkAction}
                                onChange={(event) => setBulkAction(event.target.value)}
                                className="h-10 rounded-md border border-blue-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">{t('students.bulk.choose')}</option>
                                <option value="activate">{t('students.bulk.activate')}</option>
                                <option value="deactivate">{t('students.bulk.deactivate')}</option>
                            </select>
                            <Button onClick={handleBulkAction} disabled={!bulkAction} className="bg-blue-600 hover:bg-blue-700 text-white">
                                {t('students.bulk.apply')}
                            </Button>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-lg p-4 shadow-sm space-y-3">
                    {/* Recherche libre */}
                    <div className="flex gap-3 flex-wrap">
                        <div className="flex-1 min-w-56 relative">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <Input
                                type="text"
                                placeholder={t('students.search.placeholder')}
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                                className="pl-10 bg-gray-50 border-gray-300"
                            />
                        </div>
                        <Input
                            type="text"
                            placeholder={t('students.search.nationality')}
                            value={nationalityFilter}
                            onChange={(event) => setNationalityFilter(event.target.value)}
                            onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                            className="w-44 bg-gray-50 border-gray-300"
                        />
                        <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                            <Search className="w-4 h-4" />
                            {t('common.actions.search')}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setShowFilters((v) => !v)}
                            aria-expanded={showFilters}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 gap-2"
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            {t('students.search.filters')}
                            {advancedFilterCount > 0 && (
                                <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
                                    {advancedFilterCount}
                                </span>
                            )}
                            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </Button>
                        {activeFilterCount > 0 && (
                            <Button
                                variant="outline"
                                onClick={handleClearSearch}
                                className="border-gray-300 text-gray-700 hover:bg-gray-50 gap-2"
                            >
                                <X className="w-4 h-4" />
                                {t('students.search.reset_count', { count: activeFilterCount })}
                            </Button>
                        )}
                    </div>

                    {/* Filtres avancés (repliables) */}
                    {showFilters && (
                    <div className="flex gap-3 flex-wrap border-t border-gray-100 pt-3">
                        <select
                            value={filters?.class_id ?? ''}
                            onChange={(e) => go({ class_id: e.target.value })}
                            className={FILTER_CLS}
                        >
                            <option value="">{t('students.filter.all_classes')}</option>
                            {options.classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select
                            value={filters?.academic_year_id ?? ''}
                            onChange={(e) => go({ academic_year_id: e.target.value })}
                            className={FILTER_CLS}
                        >
                            <option value="">{t('students.filter.all_years')}</option>
                            {options.academicYears.map((y) => <option key={y.id} value={y.id}>{y.year}</option>)}
                        </select>
                        <select
                            value={filters?.academic_status ?? ''}
                            onChange={(e) => go({ academic_status: e.target.value })}
                            className={FILTER_CLS}
                        >
                            <option value="">{t('students.filter.schooling_all')}</option>
                            {Object.entries(options.academicStatuses).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <select value={filters?.gender ?? ''} onChange={(e) => go({ gender: e.target.value })} className={FILTER_CLS}>
                            <option value="">{t('students.filter.gender')}</option>
                            <option value="male">{t('students.gender.male')}</option>
                            <option value="female">{t('students.gender.female')}</option>
                        </select>
                        <select value={filters?.status ?? ''} onChange={(e) => go({ status: e.target.value })} className={FILTER_CLS}>
                            <option value="">{t('students.filter.status')}</option>
                            <option value="active">{t('students.filter.active')}</option>
                            <option value="inactive">{t('students.filter.inactive')}</option>
                        </select>
                        {options.regions.length > 0 && (
                            <select value={filters?.region ?? ''} onChange={(e) => go({ region: e.target.value })} className={FILTER_CLS}>
                                <option value="">{t('students.filter.region')}</option>
                                {options.regions.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                        )}
                        {options.prefectures.length > 0 && (
                            <select value={filters?.prefecture ?? ''} onChange={(e) => go({ prefecture: e.target.value })} className={FILTER_CLS}>
                                <option value="">{t('students.filter.prefecture')}</option>
                                {options.prefectures.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                        )}

                        {/* Tri */}
                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-sm text-gray-500">{t('students.sort.label')}</span>
                            <select value={filters?.sort ?? 'created_at'} onChange={(e) => go({ sort: e.target.value })} className={FILTER_CLS}>
                                {SORT_VALUES.map((v) => <option key={v} value={v}>{t(`students.sort.${v}`)}</option>)}
                            </select>
                            <Button
                                variant="outline"
                                className="h-10 border-gray-300 gap-1.5"
                                onClick={() => go({ direction: filters?.direction === 'asc' ? 'desc' : 'asc' })}
                                title={filters?.direction === 'asc' ? t('students.sort.asc') : t('students.sort.desc')}
                            >
                                <ArrowUpDown className="w-4 h-4" />
                                {filters?.direction === 'asc' ? t('students.sort.asc') : t('students.sort.desc')}
                            </Button>
                        </div>
                    </div>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {/* Table header: count + per-page selector */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <p className="text-sm text-gray-600">
                            <span className="font-semibold">{students.total}</span> {t('students.table.unit')}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{t('students.table.per_page')}</span>
                            <select
                                value={perPage}
                                onChange={(e) => changePerPage(Number(e.target.value))}
                                className="h-8 px-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {PER_PAGE_OPTIONS.map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow className="border-b border-gray-200">
                                    <TableHead className="w-10">
                                        <Checkbox
                                            checked={allVisibleSelected}
                                            onCheckedChange={(checked) => toggleSelectAllVisible(checked === true)}
                                            aria-label={t('students.table.select_all')}
                                        />
                                    </TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('students.table.student')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('students.table.matricule')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('students.table.gender')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('students.table.nationality')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('students.table.contact')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('students.table.status')}</TableHead>
                                    <TableHead className="text-center font-semibold text-gray-900 w-28">{t('students.table.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Users className="w-12 h-12 text-gray-300" />
                                                <p className="text-lg">{t('students.table.empty')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    students.data.map((student) => (
                                        <TableRow key={student.id} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors">
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedStudentIds.includes(student.id)}
                                                    onCheckedChange={(checked) => toggleSelectStudent(student.id, checked === true)}
                                                    aria-label={t('students.table.select_one', { name: `${student.firstname} ${student.lastname}` })}
                                                />
                                            </TableCell>
                                            <TableCell className="font-semibold text-gray-900">
                                                <div className="flex items-center gap-3">
                                                    {student.profile_photo ? (
                                                        <img
                                                            src={route('students.photo.view', student.id)}
                                                            alt={`${student.firstname} ${student.lastname}`}
                                                            className="h-10 w-10 rounded-full object-cover ring-1 ring-gray-200"
                                                        />
                                                    ) : (
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                                            <Users className="h-5 w-5 text-blue-600" />
                                                        </div>
                                                    )}
                                                    <span>{student.firstname} {student.lastname}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {student.matricule ? (
                                                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-medium">
                                                        {student.matricule}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{renderGenderBadge(student.gender)}</TableCell>
                                            <TableCell className="text-gray-600">
                                                {student.nationality || <span className="text-gray-400">—</span>}
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Phone className="w-3.5 h-3.5 text-violet-500" />
                                                    {student.phone ?? student.parent_info?.father_phone ?? student.parent_info?.mother_phone ?? '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded text-sm font-medium ${student.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {student.active ? t('common.status.active') : t('common.status.inactive')}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex gap-2 justify-center">
                                                    <IconButton
                                                        label={t('students.table.view')}
                                                        icon={<Eye className="w-4 h-4" />}
                                                        className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                        onClick={() => router.visit(route('students.show', student.id))}
                                                    />
                                                    <IconButton
                                                        label={t('common.actions.edit')}
                                                        icon={<Pencil className="w-4 h-4" />}
                                                        className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                        onClick={() => router.visit(route('students.edit', student.id))}
                                                    />
                                                    <IconButton
                                                        label={t('students.table.history')}
                                                        icon={<History className="w-4 h-4" />}
                                                        className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                                                        onClick={() => router.visit(route('students.history', student.id))}
                                                    />
                                                    <IconButton
                                                        label={t('common.actions.delete')}
                                                        icon={<Trash2 className="w-4 h-4" />}
                                                        className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                        onClick={() => setDeleteConfirm(student.id)}
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {students.last_page > 1 && (
                    <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm">
                        <p className="text-sm text-gray-600">
                            {t('students.table.range', { from: students.from, to: students.to, total: students.total })}
                        </p>
                        <div className="flex items-center gap-1">
                            {/* First + Prev */}
                            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 px-2"
                                disabled={students.current_page === 1}
                                onClick={() => goToPage(1)}>⟪</Button>
                            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 px-2"
                                disabled={students.current_page === 1}
                                onClick={() => goToPage(students.current_page - 1)}>‹</Button>

                            {/* Windowed pages */}
                            {windowedPages().map((page) => (
                                <Button
                                    key={page}
                                    variant={page === students.current_page ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => goToPage(page)}
                                    className={page === students.current_page
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-700'}
                                >
                                    {page}
                                </Button>
                            ))}

                            {/* Next + Last */}
                            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 px-2"
                                disabled={students.current_page === students.last_page}
                                onClick={() => goToPage(students.current_page + 1)}>›</Button>
                            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 px-2"
                                disabled={students.current_page === students.last_page}
                                onClick={() => goToPage(students.last_page)}>⟫</Button>
                        </div>
                    </div>
                )}
            </div>

            <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('students.delete.title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('students.delete.confirm')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-3 justify-end">
                        <AlertDialogCancel disabled={isDeleting}>{t('common.actions.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isDeleting || !deleteConfirm}
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? t('students.delete.deleting') : t('common.actions.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
