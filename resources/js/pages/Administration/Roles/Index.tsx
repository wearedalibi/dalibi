import { Head, router } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Search, Shield, CheckCircle2, Users, Eye, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
    description: string | null;
    permissions_count: number;
    created_at: string;
}

interface PaginatedRoles {
    data: Role[];
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
}

interface IndexProps {
    roles: PaginatedRoles;
    message?: string;
    filters: {
        search?: string;
    };
}

export default function Index({ roles, message, filters }: Readonly<IndexProps>) {
    const { t } = useTranslation();
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');

    const handleDelete = (roleId: string) => {
        setIsDeleting(true);
        router.delete(route('roles.destroy', roleId), {
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
        router.get(route('roles.index'), { search: searchQuery }, { 
            preserveScroll: true,
            replace: true 
        });
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        router.get(route('roles.index'), {}, { 
            preserveScroll: true,
            replace: true 
        });
    };

    // Stat Cards
    const statsCards = [
        {
            title: t('administration.roles.index.stat_total'),
            value: roles.total,
            icon: Shield,
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
            borderColor: 'border-blue-200',
        },
        {
            title: t('administration.roles.index.stat_avg_permissions'),
            value: roles.total > 0
                ? (roles.data.reduce((sum, role) => sum + role.permissions_count, 0) / roles.data.length).toFixed(0)
                : 0,
            icon: CheckCircle2,
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
            borderColor: 'border-green-200',
        },
        {
            title: t('administration.roles.index.stat_page'),
            value: `${roles.current_page}/${roles.last_page}`,
            icon: Users,
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-600',
            borderColor: 'border-purple-200',
        },
    ];

    return (
        <AppLayout>
            <Head title={t('administration.roles.index.head')} />

            <div className="space-y-6">
                {/* Header avec titre et bouton */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><Shield className="h-7 w-7 text-blue-600 shrink-0" />
                            {t('administration.roles.index.title')}
                        </h1>
                        <p className="mt-2 text-lg text-gray-600">
                            {t('administration.roles.index.subtitle')}
                        </p>
                    </div>
                    <Button
                        onClick={() => router.get(route('roles.create'))}
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="w-5 h-5" />
                        {t('administration.roles.index.new')}
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
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <span>{message}</span>
                    </div>
                )}

                {/* Barre de recherche améliorée */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                    <div className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-1 relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 group-focus-within:text-blue-600 transition" />
                                <Input
                                    type="text"
                                    placeholder={t('administration.roles.index.search_ph')}
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
                                {t('administration.roles.index.search')}
                            </Button>
                        </div>
                        {searchQuery && (
                            <p className="text-sm text-gray-500 mt-3">
                                {t('administration.roles.index.results_for')} <span className="font-semibold text-gray-700">« {searchQuery} »</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Tableau des rôles */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow className="border-b border-gray-200">
                                    <TableHead className="font-semibold text-gray-900">{t('administration.roles.index.col_name')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('administration.roles.index.col_description')}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t('administration.roles.index.col_permissions')}</TableHead>
                                    <TableHead className="text-center font-semibold text-gray-900 w-24">{t('administration.roles.index.col_actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {roles.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
                                            className="text-center py-12 text-gray-500"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <Shield className="w-12 h-12 text-gray-300" />
                                                <p className="text-lg">{t('administration.roles.index.empty')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    roles.data.map((role) => (
                                        <TableRow key={role.id} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors">
                                            <TableCell className="font-semibold text-gray-900">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                                        <Shield className="h-5 w-5 text-blue-600" />
                                                    </div>
                                                    <span>{role.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-600 max-w-xs truncate">
                                                {role.description || <span className="text-gray-400">-</span>}
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                                                    {role.permissions_count}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex gap-2 justify-center">
                                                    <IconButton
                                                        label={t('administration.roles.index.view')}
                                                        icon={<Eye className="w-4 h-4" />}
                                                        className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                        onClick={() => router.visit(route('roles.show', role.id))}
                                                    />
                                                    <IconButton
                                                        label={t('administration.roles.index.edit')}
                                                        icon={<Pencil className="w-4 h-4" />}
                                                        className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                        onClick={() => router.get(route('roles.edit', role.id))}
                                                    />
                                                    <IconButton
                                                        label={t('administration.roles.index.delete')}
                                                        icon={<Trash2 className="w-4 h-4" />}
                                                        className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                        onClick={() => setDeleteConfirm(role.id)}
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

                {/* Pagination améliorée */}
                {roles.last_page > 1 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                                {t('administration.roles.index.range', { from: roles.from, to: roles.to, total: roles.total })}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={roles.current_page === 1}
                                    onClick={() => router.get(route('roles.index'), { 
                                        page: roles.current_page - 1, 
                                        search: filters.search 
                                    }, { preserveScroll: true })}
                                    className="border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    {t('administration.roles.index.previous')}
                                </Button>
                                <div className="flex gap-1">
                                    {Array.from({ length: Math.min(5, roles.last_page) }, (_, i) => {
                                        let page = i + 1;
                                        if (roles.last_page > 5 && roles.current_page > 3) {
                                            page = roles.current_page - 2 + i;
                                        }
                                        if (page > roles.last_page) return null;
                                        return (
                                            <Button
                                                key={page}
                                                variant={page === roles.current_page ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => router.get(route('roles.index'), { 
                                                    page, 
                                                    search: filters.search 
                                                }, { preserveScroll: true })}
                                                className={page === roles.current_page 
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
                                    disabled={roles.current_page === roles.last_page}
                                    onClick={() => router.get(route('roles.index'), { 
                                        page: roles.current_page + 1, 
                                        search: filters.search 
                                    }, { preserveScroll: true })}
                                    className="border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {t('administration.roles.index.next')}
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                            <p className="text-sm text-gray-600">
                                {t('administration.roles.index.page_of', { current: roles.current_page, last: roles.last_page })}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Dialog de confirmation suppression */}
            <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('administration.roles.index.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('administration.roles.index.delete_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-3 justify-end">
                        <AlertDialogCancel>{t('administration.roles.index.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? t('administration.roles.index.deleting') : t('administration.roles.index.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
