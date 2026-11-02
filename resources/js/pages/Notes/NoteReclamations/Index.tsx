import { Head, router } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Clock, Eye, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Student { id: string; firstname: string; lastname: string; matricule: string; }
interface Reclamation {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    reason: string;
    original_score: number | null;
    requested_score: number | null;
    corrected_score: number | null;
    created_at: string;
    student: Student;
    requested_by: { id: string; firstname: string; lastname: string };
    reviewed_by: { id: string; firstname: string; lastname: string } | null;
    evaluation: {
        id: string;
        template: { name: string; academic_period: { name: string } };
        class_subject: {
            class: { name: string; code: string };
            subject: { name: string };
        };
    };
}

interface Props {
    reclamations: { data: Reclamation[]; total: number; current_page: number; last_page: number };
    filters: { status: string };
    canReview: boolean;
}

const STATUS_CONFIG = {
    pending:  { icon: Clock,         cls: 'bg-amber-100 text-amber-700' },
    approved: { icon: CheckCircle2,  cls: 'bg-emerald-100 text-emerald-700' },
    rejected: { icon: XCircle,       cls: 'bg-red-100 text-red-700' },
};

export default function Index({ reclamations, filters, canReview }: Readonly<Props>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [status, setStatus] = useState(filters.status || 'all');

    const onStatusChange = (v: string) => {
        setStatus(v);
        router.get(route('note-reclamations.index'), { status: v === 'all' ? '' : v }, { replace: true });
    };

    const pendingCount = reclamations.data.filter(r => r.status === 'pending').length;

    return (
        <AppLayout>
            <Head title={t('notes.reclamations.index.head')} />

            <div className="w-full space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><AlertCircle className="h-7 w-7 text-blue-600 shrink-0" />{t('notes.reclamations.index.head')}</h1>
                        <p className="mt-2 text-lg text-gray-600">
                            {t('notes.reclamations.index.subtitle')}
                        </p>
                    </div>
                    {pendingCount > 0 && canReview && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 ring-1 ring-amber-200 rounded-xl text-amber-700 text-sm font-medium">
                            <AlertCircle className="w-4 h-4" />
                            {t('notes.reclamations.index.pending_badge', { count: pendingCount })}
                        </div>
                    )}
                </div>

                {/* Filter */}
                <div className="rounded-2xl bg-slate-50/70 ring-1 ring-slate-200 shadow-sm p-4 flex gap-3 items-center">
                    <Select value={status} onValueChange={onStatusChange}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('notes.reclamations.index.all_statuses')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('notes.reclamations.index.all_statuses')}</SelectItem>
                            <SelectItem value="pending">{t('notes.reclamations.index.status_pending')}</SelectItem>
                            <SelectItem value="approved">{t('notes.reclamations.index.status_approved')}</SelectItem>
                            <SelectItem value="rejected">{t('notes.reclamations.index.status_rejected')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead>{t('notes.reclamations.index.col_date')}</TableHead>
                                <TableHead>{t('notes.reclamations.index.col_student')}</TableHead>
                                <TableHead>{t('notes.reclamations.index.col_evaluation')}</TableHead>
                                <TableHead>{t('notes.reclamations.index.col_requested_by')}</TableHead>
                                <TableHead className="text-center">{t('notes.reclamations.index.col_original')}</TableHead>
                                <TableHead className="text-center">{t('notes.reclamations.index.col_requested')}</TableHead>
                                <TableHead className="text-center">{t('notes.reclamations.index.col_status')}</TableHead>
                                <TableHead className="text-center w-24">{t('notes.reclamations.index.col_action')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reclamations.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-16 text-center text-gray-400">
                                        <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        {t('notes.reclamations.index.empty')}
                                    </TableCell>
                                </TableRow>
                            ) : reclamations.data.map(r => {
                                const sc = STATUS_CONFIG[r.status];
                                const Icon = sc.icon;
                                return (
                                    <TableRow
                                        key={r.id}
                                        className={`transition-colors ${r.status === 'pending' ? 'bg-amber-50/30' : 'hover:bg-gray-50/50'}`}
                                    >
                                        <TableCell className="text-sm text-gray-500">
                                            {new Date(r.created_at).toLocaleDateString(dateLocale)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-gray-900">
                                                {r.student.lastname} {r.student.firstname}
                                            </div>
                                            <div className="text-xs text-gray-400 font-mono">{r.student.matricule}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-gray-800">{r.evaluation.template.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {r.evaluation.class_subject.class.name} · {r.evaluation.class_subject.subject.name}
                                                <span className="ml-1 text-gray-400">({r.evaluation.template.academic_period.name})</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {r.requested_by.firstname} {r.requested_by.lastname}
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-gray-600">
                                            {r.original_score !== null ? r.original_score : '—'}
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-gray-600">
                                            {r.requested_score !== null ? r.requested_score : '—'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>
                                                <Icon className="w-3 h-3" />
                                                {t('notes.reclamations.status.' + r.status)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="outline" size="sm" className="gap-1 text-xs"
                                                onClick={() => router.get(route('note-reclamations.show', r.id))}
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                {canReview && r.status === 'pending' ? t('notes.reclamations.index.process') : t('notes.reclamations.index.view')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                <p className="text-sm text-gray-400 text-right">{t('notes.reclamations.index.total', { count: reclamations.total })}</p>
            </div>
        </AppLayout>
    );
}
