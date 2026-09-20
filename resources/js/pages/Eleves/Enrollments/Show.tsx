import { Head, router } from '@inertiajs/react';
import { useMoney } from '@/helpers/money';
import { ArrowLeft, FileText, CheckCircle2, Clock, AlertCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { route } from '@/helpers/route';
import AppLayout from '@/layouts/app-layout';

interface School {
    name: string;
    code: string;
}

interface Student {
    firstname: string;
    lastname: string;
    matricule?: string | null;
}

interface Classroom {
    name: string;
    code: string;
}

interface AcademicYear {
    year: string;
}

interface User {
    firstname?: string | null;
    lastname?: string | null;
    email?: string | null;
}

interface Enrollment {
    id: string;
    enrollment_code: string;
    enrollment_date: string;
    status: 'PENDING' | 'ACTIVE' | 'CANCELLED';
    created_at: string;
    updated_at: string;
    school?: School | null;
    student?: Student | null;
    classroom?: Classroom | null;
    academic_year?: AcademicYear | null;
    enrolled_by?: User | null;
}

type InvoiceStatus = 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

interface InvoiceSummary {
    id: string;
    invoice_number: string;
    total: number;
    amount_paid: number;
    amount_remaining: number;
    status: InvoiceStatus;
}

interface ShowProps {
    enrollment: Enrollment;
    invoice?: InvoiceSummary | null;
}

const invoiceStatusConfig: Record<InvoiceStatus, { label: string; icon: React.ReactNode; badge: string }> = {
    ISSUED:         { label: 'Non payé',          icon: <Clock className="w-3.5 h-3.5" />,        badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    PARTIALLY_PAID: { label: 'Partiellement payé', icon: <AlertCircle className="w-3.5 h-3.5" />, badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    PAID:           { label: 'Soldé',              icon: <CheckCircle2 className="w-3.5 h-3.5" />, badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    CANCELLED:      { label: 'Annulé',             icon: null,                                      badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};


const statusMap: Record<Enrollment['status'], string> = {
    PENDING:   'En attente',
    ACTIVE:    'Actif',
    CANCELLED: 'Annulé',
};

const statusBadgeClass: Record<Enrollment['status'], string> = {
    PENDING:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    ACTIVE:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function Show({ enrollment, invoice }: Readonly<ShowProps>) {
    const fmt = useMoney();
    const enrolledByName = [enrollment.enrolled_by?.firstname, enrollment.enrolled_by?.lastname].filter(Boolean).join(' ');

    return (
        <AppLayout>
            <Head title="Détail inscription" />

            <div className="w-full space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => router.get(route('enrollments.index'))}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Détail de l'inscription</h1>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => window.open(route('enrollments.receipt', enrollment.id), '_blank')} className="gap-2">
                            <Printer className="w-4 h-4" />
                            Confirmation
                        </Button>
                        <Button onClick={() => router.get(route('enrollments.invoice', enrollment.id))} className="bg-green-600 hover:bg-green-700 gap-2">
                            <FileText className="w-4 h-4" />
                            Suivi financier
                        </Button>
                        <Button onClick={() => router.get(route('enrollments.edit', enrollment.id))} className="bg-blue-600 hover:bg-blue-700">
                            Modifier
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 h-max">
                    <div>
                        <p className="text-sm text-gray-500">Code d'inscription</p>
                        <p className="font-semibold text-gray-900 mt-1">{enrollment.enrollment_code}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Statut</p>
                        <p className="mt-1">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass[enrollment.status]}`}>
                                {statusMap[enrollment.status]}
                            </span>
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">École</p>
                        <p className="font-medium text-gray-900 mt-1">
                            {enrollment.school ? `${enrollment.school.name} (${enrollment.school.code})` : '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Élève</p>
                        <p className="font-medium text-gray-900 mt-1">
                            {enrollment.student ? `${enrollment.student.firstname} ${enrollment.student.lastname}` : '-'}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">Classe</p>
                        <p className="font-medium text-gray-900 mt-1">
                            {enrollment.classroom ? `${enrollment.classroom.name} (${enrollment.classroom.code})` : '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Année académique</p>
                        <p className="font-medium text-gray-900 mt-1">{enrollment.academic_year?.year ?? '-'}</p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">Date d'inscription</p>
                        <p className="font-medium text-gray-900 mt-1">{new Date(enrollment.enrollment_date).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Enregistré par</p>
                        <p className="font-medium text-gray-900 mt-1">{enrolledByName || enrollment.enrolled_by?.email || '-'}</p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">Créé le</p>
                        <p className="font-medium text-gray-900 mt-1">{new Date(enrollment.created_at).toLocaleString('fr-FR')}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Modifié le</p>
                        <p className="font-medium text-gray-900 mt-1">{new Date(enrollment.updated_at).toLocaleString('fr-FR')}</p>
                    </div>
                </div>

                {/* ── Résumé financier ── */}
                {invoice && (
                    <div
                        className="bg-white rounded-lg p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
                        onClick={() => router.get(route('enrollments.invoice', enrollment.id))}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <p className="font-semibold text-gray-900">Facture {invoice.invoice_number}</p>
                            </div>
                            {(() => {
                                const cfg = invoiceStatusConfig[invoice.status];
                                return (
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.badge}`}>
                                        {cfg.icon}
                                        {cfg.label}
                                    </span>
                                );
                            })()}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-gray-400 text-xs">Total</p>
                                <p className="font-bold text-gray-900">{fmt(invoice.total)}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs">Payé</p>
                                <p className="font-bold text-green-600">{fmt(invoice.amount_paid)}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs">Reste</p>
                                <p className={`font-bold ${invoice.amount_remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {fmt(invoice.amount_remaining)}
                                </p>
                            </div>
                        </div>
                        {invoice.total > 0 && (
                            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${Math.min(100, Math.round(invoice.amount_paid / invoice.total * 100))}%` }}
                                />
                            </div>
                        )}
                    </div>
                )}
                </div>
            </div>
        </AppLayout>
    );
}
