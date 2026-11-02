import { Head, router } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Search, Users, CheckCircle2, User as UserIcon, Eye, X } from 'lucide-react';
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

interface Role {
    id: string;
    name: string;
}

interface User {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    natricule: string | null;
    telephone: string | null;
    gender: string;
    roles: Role[];
    created_at: string;
}

interface PaginatedUsers {
    data: User[];
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

interface IndexProps {
    users: PaginatedUsers;
    perPage: number;
    roles: Role[];
    message?: string;
    filters: {
        search?: string;
        role?: string;
        gender?: string;
        per_page?: string;
    };
}

export default function Index({ users, perPage, roles, message, filters }: Readonly<IndexProps>) {
    const { t } = useTranslation();
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedRole, setSelectedRole] = useState(filters.role || '');
    const [selectedGender, setSelectedGender] = useState(filters.gender || '');

    const currentFilters = {
        search: searchQuery || undefined,
        role: selectedRole || undefined,
        gender: selectedGender || undefined,
        per_page: perPage !== 25 ? String(perPage) : undefined,
    };

    const goToPage = (page: number) => {
        router.get(route('users.index'), { ...currentFilters, page }, { preserveScroll: true, replace: true });
    };

    const changePerPage = (value: number) => {
        router.get(route('users.index'), { ...currentFilters, per_page: String(value), page: 1 }, { preserveScroll: true, replace: true });
    };

    const windowedPages = () => {
        const total = users.last_page;
        const cur = users.current_page;
        const win = 5;
        const start = Math.max(1, Math.min(cur - Math.floor(win / 2), total - win + 1));
        const end = Math.min(total, start + win - 1);
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    };

    const formatGenderLabel = (gender: string) => {
        if (gender === 'male' || gender === 'female' || gender === 'other') {
            return t('administration.users.gender.' + gender);
        }
        return gender;
    };

    const handleDelete = (userId: string) => {
        setIsDeleting(true);
        router.delete(route('users.destroy', userId), {
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
        router.get(route('users.index'), { ...currentFilters, page: 1 }, {
            preserveScroll: true,
            replace: true
        });
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setSelectedRole('');
        setSelectedGender('');

        router.get(route('users.index'), { per_page: perPage !== 25 ? String(perPage) : undefined }, {
            preserveScroll: true,
            replace: true
        });
    };

    // Stat Cards
    const statsCards = [
        {
            title: t('administration.users.index.stat_total'),
            value: users.total,
            icon: Users,
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
        },
        {
            title: t('administration.users.index.stat_active'),
            value: users.total,
            icon: CheckCircle2,
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
        },
        {
            title: t('administration.users.index.stat_page'),
            value: `${users.current_page}/${users.last_page}`,
            icon: UserIcon,
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-600',
        },
    ];

    return (
        <AppLayout>
            <Head title={t('administration.users.index.head')} />

            <div className="space-y-6">
                {/* Header avec titre et bouton */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><Users className="h-7 w-7 text-blue-600 shrink-0" />
                            {t('administration.users.index.head')}
                        </h1>
                        <p className="mt-2 text-lg text-gray-600">
                            {t('administration.users.index.subtitle')}
                        </p>
                    </div>
                    <Button
                        onClick={() => router.get(route('users.create'))}
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="w-5 h-5" />
                        {t('administration.users.index.new')}
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {statsCards.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={stat.title}
                                className={`${stat.bgColor} rounded-lg p-6 transition-all hover:shadow-md shadow-sm`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">
                                            {stat.title}
                                        </p>
                                        <p className={`text-3xl font-bold ${stat.textColor} mt-2`}>
                                            {stat.value}
                                        </p>
                                    </div>
                                    <Icon className={`w-12 h-12 ${stat.textColor} opacity-20`} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Message d'alerte */}
                {message && (
                    <div className="bg-green-50 text-green-800 px-4 py-3 rounded-lg flex items-center gap-3 shadow-sm">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>{message}</span>
                    </div>
                )}

                {/* Barre de recherche améliorée */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                    <div className="p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                            <div className="lg:col-span-6 relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 group-focus-within:text-blue-600 transition" />
                                <Input
                                    type="text"
                                    placeholder={t('administration.users.index.search_ph')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="pl-10 pr-10 bg-gray-50 border-gray-200 focus:border-blue-300 focus:bg-white transition"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="lg:col-span-2">
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    className="w-full h-10 px-3 border border-gray-200 rounded-md bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
                                >
                                    <option value="">{t('administration.users.index.all_roles')}</option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="lg:col-span-2">
                                <select
                                    value={selectedGender}
                                    onChange={(e) => setSelectedGender(e.target.value)}
                                    className="w-full h-10 px-3 border border-gray-200 rounded-md bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
                                >
                                    <option value="">{t('administration.users.index.all_genders')}</option>
                                    <option value="male">{t('administration.users.gender.male')}</option>
                                    <option value="female">{t('administration.users.gender.female')}</option>
                                    <option value="other">{t('administration.users.gender.other')}</option>
                                </select>
                            </div>

                            <Button
                                onClick={handleSearch}
                                className="lg:col-span-1 bg-blue-600 hover:bg-blue-700 text-white gap-2 shrink-0 transition"
                            >
                                <Search className="w-4 h-4" />
                                {t('administration.users.index.filter')}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handleResetFilters}
                                className="lg:col-span-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                                {t('administration.users.index.reset')}
                            </Button>
                        </div>

                        {(searchQuery || selectedRole || selectedGender) && (
                            <p className="text-sm text-gray-500 mt-3">
                                {t('administration.users.index.active_filters')}
                                {searchQuery && <span className="font-semibold text-gray-700">{t('administration.users.index.filter_search', { search: searchQuery })}</span>}
                                {selectedRole && <span className="font-semibold text-gray-700">{t('administration.users.index.filter_role')}</span>}
                                {selectedGender && (
                                    <span className="font-semibold text-gray-700">
                                        {t('administration.users.index.filter_gender', { gender: formatGenderLabel(selectedGender) })}
                                    </span>
                                )}
                            </p>
                        )}
                    </div>
                </div>

                {/* Tableau des utilisateurs */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {/* Table header: count + per-page selector */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <p className="text-sm text-gray-600">
                            {t('administration.users.index.count', { count: users.total })}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{t('administration.users.index.per_page')}</span>
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
                                    <TableHead className="font-semibold text-gray-900">{t('administration.users.index.col_user')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('administration.users.index.col_email')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('administration.users.index.col_matricule')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('administration.users.index.col_phone')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('administration.users.index.col_roles')}</TableHead>
                                    <TableHead className="text-center font-semibold text-gray-900 w-24">{t('administration.users.index.col_actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="text-center py-12 text-gray-500"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <Users className="w-12 h-12 text-gray-300" />
                                                <p className="text-lg">{t('administration.users.index.empty')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.data.map((user) => (
                                        <TableRow key={user.id} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors">
                                            <TableCell className="font-semibold text-gray-900">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                                        <UserIcon className="h-5 w-5 text-blue-600" />
                                                    </div>
                                                    <span>{user.firstname} {user.lastname}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {user.email}
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {user.natricule ? (
                                                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-medium">
                                                        {user.natricule}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {user.telephone || <span className="text-gray-400">-</span>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1 flex-wrap">
                                                    {user.roles.length > 0 ? (
                                                        user.roles.map((role) => (
                                                            <span key={role.id} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                                                {role.name}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">{t('administration.users.index.no_role')}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex gap-2 justify-center">
                                                    <IconButton
                                                        label={t('administration.users.index.view')}
                                                        icon={<Eye className="w-4 h-4" />}
                                                        className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                        onClick={() => router.visit(route('users.show', user.id))}
                                                    />
                                                    <IconButton
                                                        label={t('administration.users.index.edit')}
                                                        icon={<Pencil className="w-4 h-4" />}
                                                        className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                        onClick={() => router.get(route('users.edit', user.id))}
                                                    />
                                                    <IconButton
                                                        label={t('administration.users.index.delete')}
                                                        icon={<Trash2 className="w-4 h-4" />}
                                                        className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                        onClick={() => setDeleteConfirm(user.id)}
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

                {/* Pagination */}
                {users.last_page > 1 && (
                    <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm">
                        <p className="text-sm text-gray-600">
                            {t('administration.users.index.range', { from: users.from, to: users.to, total: users.total })}
                        </p>
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 px-2"
                                disabled={users.current_page === 1}
                                onClick={() => goToPage(1)}>⟪</Button>
                            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 px-2"
                                disabled={users.current_page === 1}
                                onClick={() => goToPage(users.current_page - 1)}>‹</Button>

                            {windowedPages().map((page) => (
                                <Button
                                    key={page}
                                    variant={page === users.current_page ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => goToPage(page)}
                                    className={page === users.current_page
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-700'}
                                >
                                    {page}
                                </Button>
                            ))}

                            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 px-2"
                                disabled={users.current_page === users.last_page}
                                onClick={() => goToPage(users.current_page + 1)}>›</Button>
                            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 px-2"
                                disabled={users.current_page === users.last_page}
                                onClick={() => goToPage(users.last_page)}>⟫</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Dialog de confirmation suppression */}
            <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('administration.users.index.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('administration.users.index.delete_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-3 justify-end">
                        <AlertDialogCancel>{t('administration.users.index.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? t('administration.users.index.deleting') : t('administration.users.index.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
