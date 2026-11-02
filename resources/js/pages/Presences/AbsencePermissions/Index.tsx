import { Head, router } from '@inertiajs/react';
import { CheckCircle2, Clock, Plus, Search, Trash2, X, XCircle, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Student { id: string; firstname: string; lastname: string; matricule: string; }
interface User    { id: string; name: string; }

interface Permission {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    start_date: string;
    end_date: string;
    reason: string;
    description: string;
    review_comment: string | null;
    reviewed_at: string | null;
    student: Student;
    requested_by: User | null;
    reviewed_by: User | null;
}

interface Stats { total: number; pending: number; approved: number; rejected: number; }

interface Props {
    permissions: { data: Permission[]; total: number; current_page: number; last_page: number };
    stats:       Stats;
    filters:     { status: string; search: string };
}

const STATUS = {
    pending:  { color: 'bg-amber-100 text-amber-700',   icon: Clock },
    approved: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
    rejected: { color: 'bg-red-100 text-red-700',       icon: XCircle },
} as const;

export default function Index({ permissions, stats, filters }: Readonly<Props>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [search, setSearch]     = useState(filters.search ?? '');
    const [status, setStatus]     = useState(filters.status ?? 'all');
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const apply = (overrides: Record<string, string> = {}) => {
        const s = overrides.status ?? status;
        router.get(route('absence-permissions.index'), {
            search: overrides.search ?? search,
            status: s === 'all' ? '' : s,
        }, { preserveScroll: true, replace: true });
    };

    const onDelete = (id: string) => {
        router.delete(route('absence-permissions.destroy', id), {
            preserveScroll: true,
            onSuccess: () => setDeleteId(null),
        });
    };

    return (
        <AppLayout>
            <Head title={t('presences.permissions.index.head')} />
            <div className="w-full space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><ShieldCheck className="h-7 w-7 text-blue-600 shrink-0" />{t('presences.permissions.index.head')}</h1>
                        <p className="mt-2 text-lg text-gray-600">{t('presences.permissions.index.subtitle')}</p>
                    </div>
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => router.get(route('absence-permissions.create'))}>
                        <Plus className="w-4 h-4" /> {t('presences.permissions.index.new')}
                    </Button>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: t('presences.permissions.index.total'),    value: stats.total,    icon: Clock,        color: 'text-gray-600',    bg: 'bg-gray-50 ring-gray-100',       filter: 'all' },
                        { label: t('presences.permissions.index.pending'),  value: stats.pending,  icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50 ring-amber-100',     filter: 'pending' },
                        { label: t('presences.permissions.index.approved'), value: stats.approved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 ring-emerald-100', filter: 'approved' },
                        { label: t('presences.permissions.index.rejected'), value: stats.rejected, icon: XCircle,      color: 'text-red-600',     bg: 'bg-red-50 ring-red-100',         filter: 'rejected' },
                    ].map(card => {
                        const Icon = card.icon;
                        return (
                            <div key={card.label} className={`${card.bg} ring-1 rounded-2xl p-5 shadow-sm`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500">{card.label}</p>
                                        <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                                    </div>
                                    <Icon className={`w-8 h-8 ${card.color} opacity-25`} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Filtres */}
                <div className="rounded-2xl bg-slate-50/70 ring-1 ring-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && apply()}
                            placeholder={t('presences.permissions.index.search_ph')}
                            className="pl-9"
                        />
                        {search && (
                            <button onClick={() => { setSearch(''); apply({ search: '' }); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <Select value={status} onValueChange={v => { setStatus(v); apply({ status: v }); }}>
                        <SelectTrigger className="w-44"><SelectValue placeholder={t('presences.permissions.index.col_status')} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('presences.permissions.index.all_statuses')}</SelectItem>
                            <SelectItem value="pending">{t('presences.permissions.index.pending')}</SelectItem>
                            <SelectItem value="approved">{t('presences.permissions.index.approved')}</SelectItem>
                            <SelectItem value="rejected">{t('presences.permissions.index.rejected')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={() => apply()} className="bg-blue-600 hover:bg-blue-700">{t('presences.permissions.index.filter')}</Button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead>{t('presences.permissions.index.col_student')}</TableHead>
                                <TableHead>{t('presences.permissions.index.col_reason')}</TableHead>
                                <TableHead>{t('presences.permissions.index.col_period')}</TableHead>
                                <TableHead>{t('presences.permissions.index.col_duration')}</TableHead>
                                <TableHead>{t('presences.permissions.index.col_requested_by')}</TableHead>
                                <TableHead>{t('presences.permissions.index.col_status')}</TableHead>
                                <TableHead className="text-center w-28">{t('presences.permissions.index.col_actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {permissions.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-16 text-center text-gray-400">
                                        <Clock className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                        {t('presences.permissions.index.empty')}
                                    </TableCell>
                                </TableRow>
                            ) : permissions.data.map(p => {
                                const cfg = STATUS[p.status];
                                const Icon = cfg.icon;
                                const days = Math.ceil((new Date(p.end_date).getTime() - new Date(p.start_date).getTime()) / 86400000) + 1;
                                return (
                                    <TableRow key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <TableCell>
                                            <div className="font-medium text-gray-900 text-sm">{p.student.lastname} {p.student.firstname}</div>
                                            <div className="text-xs text-gray-400 font-mono">{p.student.matricule}</div>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">{t('presences.reason.' + p.reason)}</TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {new Date(p.start_date).toLocaleDateString(dateLocale)} → {new Date(p.end_date).toLocaleDateString(dateLocale)}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-gray-700">{t(days > 1 ? 'presences.permissions.index.day_other' : 'presences.permissions.index.day_one', { count: days })}</TableCell>
                                        <TableCell className="text-sm text-gray-500">{p.requested_by?.name ?? '—'}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                                                <Icon className="w-3 h-3" />
                                                {t('presences.permissions.status.' + p.status)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-center gap-1.5">
                                                <Button
                                                    variant="outline" size="sm" className="text-xs gap-1"
                                                    onClick={() => router.get(route('absence-permissions.show', p.id))}
                                                >
                                                    {p.status === 'pending' ? t('presences.permissions.index.review') : t('presences.permissions.index.view')}
                                                </Button>
                                                {p.status !== 'approved' && (
                                                    <Button
                                                        variant="outline" size="sm"
                                                        className="border-red-200 text-red-500 hover:bg-red-50"
                                                        onClick={() => setDeleteId(p.id)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                <p className="text-sm text-gray-400 text-right">{t('presences.permissions.index.total_count', { count: permissions.total })}</p>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('presences.permissions.index.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('presences.permissions.index.delete_desc')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('common.actions.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && onDelete(deleteId)}>
                            {t('common.actions.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
