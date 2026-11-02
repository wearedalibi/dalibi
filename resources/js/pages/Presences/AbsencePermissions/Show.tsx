import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Student { id: string; firstname: string; lastname: string; matricule: string; }
interface User    { id: string; name: string; }

interface AttendanceRecord {
    id: string;
    status: string;
    attendance: { id: string; date: string; session: string; classroom: { name: string; code: string } };
}

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
    attendance_records: AttendanceRecord[];
}

interface Props { permission: Permission; }

export default function Show({ permission }: Readonly<Props>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
    const { data, setData, patch, processing } = useForm({
        decision:       '' as 'approved' | 'rejected' | '',
        review_comment: '',
    });

    const submit = (d: 'approved' | 'rejected') => {
        patch(route('absence-permissions.review', permission.id), {
            // @ts-expect-error useForm types
            data: { decision: d, review_comment: data.review_comment },
            preserveScroll: true,
        });
    };

    const days = Math.ceil((new Date(permission.end_date).getTime() - new Date(permission.start_date).getTime()) / 86400000) + 1;

    const statusConfig = {
        pending:  { color: 'bg-amber-100 text-amber-800 ring-amber-200',   icon: Clock },
        approved: { color: 'bg-emerald-100 text-emerald-800 ring-emerald-200', icon: CheckCircle2 },
        rejected: { color: 'bg-red-100 text-red-800 ring-red-200',          icon: XCircle },
    };
    const cfg = statusConfig[permission.status];
    const Icon = cfg.icon;

    return (
        <AppLayout>
            <Head title={t('presences.permissions.show.head', { name: permission.student.lastname })} />
            <div className="w-full space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => router.get(route('absence-permissions.index'))}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {permission.student.lastname} {permission.student.firstname}
                        </h1>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-gray-500 font-mono">{permission.student.matricule}</span>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${cfg.color}`}>
                                <Icon className="w-3 h-3" /> {t('presences.permissions.status.' + permission.status)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Détails */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 space-y-4">
                    <h2 className="font-semibold text-gray-900 text-lg">{t('presences.permissions.show.details')}</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{t('presences.permissions.show.reason')}</p>
                            <p className="text-sm text-gray-900 mt-1 font-medium">{t('presences.reason.' + permission.reason)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{t('presences.permissions.show.absence_period')}</p>
                            <p className="text-sm text-gray-900 mt-1 font-medium">
                                {new Date(permission.start_date).toLocaleDateString(dateLocale)} → {new Date(permission.end_date).toLocaleDateString(dateLocale)}
                                <span className="ml-2 text-xs text-gray-400">({t(days > 1 ? 'presences.permissions.show.day_other' : 'presences.permissions.show.day_one', { count: days })})</span>
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{t('presences.permissions.show.requested_by')}</p>
                            <p className="text-sm text-gray-900 mt-1">{permission.requested_by?.name ?? '—'}</p>
                        </div>
                        {permission.reviewed_by && (
                            <div>
                                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{t('presences.permissions.show.reviewed_by')}</p>
                                <p className="text-sm text-gray-900 mt-1">
                                    {permission.reviewed_by.name}
                                    {permission.reviewed_at && <span className="ml-1 text-xs text-gray-400">{t('presences.permissions.show.reviewed_on', { date: new Date(permission.reviewed_at).toLocaleDateString(dateLocale) })}</span>}
                                </p>
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{t('presences.permissions.show.description')}</p>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">{permission.description}</p>
                    </div>
                    {permission.review_comment && (
                        <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{t('presences.permissions.show.review_comment')}</p>
                            <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">{permission.review_comment}</p>
                        </div>
                    )}
                </div>

                {/* Absences liées */}
                {permission.attendance_records.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
                        <h2 className="font-semibold text-gray-900 mb-4">{t('presences.permissions.show.linked_absences')}</h2>
                        <div className="space-y-2">
                            {permission.attendance_records.map(rec => (
                                <div key={rec.id} className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-2.5 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                                    <span className="font-medium text-gray-900">
                                        {new Date(rec.attendance.date).toLocaleDateString(dateLocale)}
                                    </span>
                                    <span className="text-gray-500">·</span>
                                    <span className="text-gray-600">{rec.attendance.classroom.name} ({rec.attendance.classroom.code})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Révision (si pending) */}
                {permission.status === 'pending' && (
                    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 space-y-4">
                        <h2 className="font-semibold text-gray-900 text-lg">{t('presences.permissions.show.decision')}</h2>
                        <div>
                            <label className="text-sm font-semibold text-gray-700 block mb-1.5">{t('presences.permissions.show.comment_optional')}</label>
                            <textarea
                                value={data.review_comment}
                                onChange={e => setData('review_comment', e.target.value)}
                                rows={3}
                                placeholder={t('presences.permissions.show.comment_ph')}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button
                                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => submit('approved')}
                                disabled={processing}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                {t('presences.permissions.show.approve')}
                            </Button>
                            <Button
                                className="gap-2 bg-red-600 hover:bg-red-700"
                                onClick={() => submit('rejected')}
                                disabled={processing}
                            >
                                <XCircle className="w-4 h-4" />
                                {t('presences.permissions.show.reject')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
