import { Head, Link, router } from '@inertiajs/react';
import { Users, Banknote, TrendingUp, TrendingDown, Wallet, CheckCircle2, AlertCircle, XCircle, AlertTriangle, BookOpen, ClipboardList, ArrowRight, CalendarDays, GraduationCap, UserCheck, ShieldCheck, FileBadge, LayoutGrid, User, Layers } from 'lucide-react';
import {
    Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart,
    ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMoney } from '@/helpers/money';
import { useTranslation } from '@/helpers/i18n';
import { route } from '@/helpers/route';
import AppLayout from '@/layouts/app-layout';
import { useChartTheme } from '@/lib/chart-theme';
import type { BreadcrumbItem } from '@/types';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ActiveYear { id: string; year: string; }
interface YearOption { id: string; year: string; active?: boolean; }
interface EnrollmentByClass { class_name: string; total: number; }

interface FinancialStats {
    total_invoices:  number;
    total_amount:    number;
    total_paid:      number;
    total_remaining: number;
    paid_count:      number;
    partial_count:   number;
    issued_count:    number;
}

interface MonthlyPayment { month: string; month_label: string; total: number; }

interface CashAccount { id: string; name: string; type: string; balance: number; }

interface RecentPayment {
    id: string;
    amount: number;
    payment_method: string;
    paid_at: string | null;
    cash_account: string | null;
    student_name: string;
    class_name: string;
}

interface StudentNoPay {
    id: string;
    enrollment_code: string;
    status: string;
    student?: { id: string; firstname: string; lastname: string; matricule?: string | null } | null;
    classroom?: { id: string; name: string; code: string } | null;
    invoice?: { id: string; total: number; amount_remaining: number; status: string } | null;
}

interface RecentEnrollment {
    id: string;
    enrollment_code: string;
    enrollment_date: string | null;
    status: string;
    student_name: string;
    matricule: string | null;
    class_name: string;
    class_code: string;
}

interface Assignment {
    id: string;
    subject: string;
    class_id: string;
    class_name: string;
    class_code: string;
}

interface TodaySlot {
    id: string;
    start_time: string;
    end_time: string;
    subject: string;
    class_name: string;
    room: string | null;
}

interface PendingEval {
    id: string;
    name: string;
    subject: string;
    class_name: string;
    date: string | null;
}

interface PendingPermission {
    id: string;
    student_name: string;
    reason: string;
    start_date: string | null;
    end_date: string | null;
}

interface UpcomingExam {
    id: string;
    name: string;
    type: string;
    exam_date: string | null;
    center: string | null;
    registrations: number;
}

interface DashboardProps {
    activeYear:          ActiveYear | null;
    selectedYearId:      string | null;
    selectedYear:        ActiveYear | null;
    academicYears:       YearOption[];
    userRole:            string | null;
    financial?: {
        stats:           FinancialStats | null;
        monthlyPayments: MonthlyPayment[];
        cashAccounts:    CashAccount[];
        recentPayments:  RecentPayment[];
        studentsNoPay:   StudentNoPay[];
        month:           { income: number; expenses: number; net: number };
        paymentMethods:  { method: string; total: number }[];
    };
    enrollments?: {
        total_students:    number;
        active_students:   number;
        students_by_gender: { male: number; female: number; other: number };
        active_classrooms: number;
        total_users:       number;
        enrollments_year:  number;
        enrollments_week:  number;
        teachers_count:    number;
        rem:               number | null;
        recentEnrollments: RecentEnrollment[];
        byClass:           EnrollmentByClass[];
    };
    teaching?: {
        assignments: Assignment[];
        today: TodaySlot[];
        pendingMarks: { count: number; items: PendingEval[] };
    };
    academic?: {
        present_today:       number;
        absent_today:        number;
        pending_permissions: number;
        documents_month:     number;
        exams_open:          number;
        exam_registrations:  number;
        pendingPermissions:  PendingPermission[];
        upcomingExams:       UpcomingExam[];
    };
    bulletins?: {
        period:    string | null;
        validated: number;
        average:   number | null;
    };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */


const pct = (paid: number, total: number) =>
    total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

/* ------------------------------------------------------------------ */
/* Micro-composants                                                    */
/* ------------------------------------------------------------------ */

function KpiCard({ title, value, sub, icon: Icon, color }: {
    title: string; value: string | number; sub?: string;
    icon: React.ElementType;
    color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
}) {
    const styles = {
        blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-600 dark:text-blue-400'    },
        green:  { bg: 'bg-green-50 dark:bg-green-900/20',  text: 'text-green-600 dark:text-green-400'  },
        orange: { bg: 'bg-orange-50 dark:bg-orange-900/20',text: 'text-orange-600 dark:text-orange-400'},
        red:    { bg: 'bg-red-50 dark:bg-red-900/20',      text: 'text-red-600 dark:text-red-400'      },
        purple: { bg: 'bg-purple-50 dark:bg-purple-900/20',text: 'text-purple-600 dark:text-purple-400'},
    };
    const { bg, text } = styles[color];
    return (
        <div className="bg-white dark:bg-card rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 min-h-28 flex flex-col justify-center">
            <div className="flex items-start justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
                    <p className={`text-2xl font-bold ${text} mt-1.5 truncate`}>{value}</p>
                    {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
                </div>
                {/* Chip d'icône : seul accent coloré restant, le fond de la card reste blanc. */}
                <div className={`${bg} rounded-lg p-2 shrink-0 ml-3`}>
                    <Icon className={`w-6 h-6 ${text}`} />
                </div>
            </div>
        </div>
    );
}

function ProgressBar({ value, color = 'blue' }: { value: number; color?: 'blue' | 'green' | 'orange' | 'red' }) {
    const bar = { blue: 'bg-blue-500', green: 'bg-green-500', orange: 'bg-orange-400', red: 'bg-red-400' };
    return (
        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${bar[color]}`} style={{ width: `${value}%` }} />
        </div>
    );
}

function SectionCard({ title, icon, count, children, action }: {
    title: string; icon: React.ReactNode; count?: number;
    children: React.ReactNode;
    action?: { label: string; href: string };
}) {
    return (
        <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                        {icon}
                    </div>
                    <h2 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h2>
                    {count !== undefined && (
                        <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full">
                            {count}
                        </span>
                    )}
                </div>
                {action && (
                    <Button size="sm" variant="outline" className="text-xs gap-1 h-7"
                        onClick={() => router.get(action.href)}>
                        {action.label} <ArrowRight className="w-3 h-3" />
                    </Button>
                )}
            </div>
            {children}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                 */
/* ------------------------------------------------------------------ */

export default function Dashboard({ activeYear, selectedYearId, selectedYear, academicYears, userRole, financial, enrollments, teaching, academic, bulletins }: Readonly<DashboardProps>) {
    const theme = useChartTheme();
    const fmt = useMoney();
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [{ title: t('dashboard.title'), href: '/dashboard' }];

    const PAYMENT_METHOD_LABELS: Record<string, string> = {
        CASH: t('dashboard.method.cash'),
        MOBILE_MONEY: t('dashboard.method.mobile_money'),
        BANK_TRANSFER: t('dashboard.method.bank_transfer'),
        CHEQUE: t('dashboard.method.cheque'),
        AUTRE: t('dashboard.method.other'),
    };
    const methodLabel: Record<string, string> = {
        CASH: t('dashboard.method.cash'),
        MOBILE_MONEY: t('dashboard.method.mobile_money'),
        BANK_TRANSFER: t('dashboard.method.bank_transfer_short'),
        CHEQUE: t('dashboard.method.cheque'),
    };
    const cashTypeLabel: Record<string, string> = {
        CASH: t('dashboard.method.cash'),
        MOBILE_MONEY: t('dashboard.method.mobile_money'),
        BANK: t('dashboard.method.bank'),
    };
    const statusLabel: Record<string, { label: string; cls: string }> = {
        ISSUED: { label: t('dashboard.status.issued'), cls: 'bg-red-100 text-red-700' },
        PARTIALLY_PAID: { label: t('dashboard.status.partially_paid'), cls: 'bg-orange-100 text-orange-700' },
        PAID: { label: t('dashboard.status.paid'), cls: 'bg-green-100 text-green-700' },
        ACTIVE: { label: t('dashboard.status.active'), cls: 'bg-green-100 text-green-700' },
        PENDING: { label: t('dashboard.status.pending'), cls: 'bg-gray-100 text-gray-600' },
    };

    const changeYear = (id: string) => {
        router.get(route('dashboard'), { academic_year_id: id }, { preserveScroll: true, preserveState: false });
    };

    const stats      = financial?.stats;
    const collectedPct = pct(Number(stats?.total_paid ?? 0), Number(stats?.total_amount ?? 0));

    const invoiceStatusData = stats ? [
        { name: t('dashboard.status.paid'),            value: Number(stats.paid_count ?? 0),    color: theme.status.good },
        { name: t('dashboard.status.partially_paid'),  value: Number(stats.partial_count ?? 0), color: theme.status.warning },
        { name: t('dashboard.status.issued'),          value: Number(stats.issued_count ?? 0),  color: theme.status.critical },
    ].filter(d => d.value > 0) : [];

    const isFinancial  = !!financial;
    const isEnrollment = !!enrollments;
    const isTeacher    = !!teaching;
    const isAcademic   = !!academic;
    const isBulletins  = !!bulletins;
    const reasonLabel: Record<string, string> = { medical: t('dashboard.reason.medical'), familial: t('dashboard.reason.familial'), autre: t('dashboard.reason.autre') };

    // Taux de présence du jour (présents / pointés), calculé depuis les compteurs existants.
    const pointedToday = academic ? academic.present_today + academic.absent_today : 0;
    const presenceRateToday = pointedToday > 0 ? Math.round((academic!.present_today / pointedToday) * 100) : null;

    const g = enrollments?.students_by_gender;
    const genderTotal = g ? g.male + g.female + g.other : 0;
    const genderPct = (n: number) => (genderTotal > 0 ? Math.round((n / genderTotal) * 100) : 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('dashboard.title')} />

            <div className="space-y-6 p-1">

                {/* ── En-tête ──────────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3"><LayoutGrid className="h-7 w-7 text-blue-600 shrink-0" />{t('dashboard.title')}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {selectedYear ? t('dashboard.header.school_year', { year: selectedYear.year }) : t('dashboard.header.no_active_year')}
                            {userRole && ` · ${userRole}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-gray-400" />
                        <Select value={selectedYearId ?? ''} onValueChange={changeYear}>
                            <SelectTrigger className="w-44 bg-white dark:bg-card">
                                <SelectValue placeholder={t('dashboard.header.academic_year')} />
                            </SelectTrigger>
                            <SelectContent>
                                {academicYears.map(y => (
                                    <SelectItem key={y.id} value={y.id}>
                                        {y.year}{y.active ? ` · ${t('dashboard.header.active_suffix')}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* ── Alerte élèves 0 paiement ─────────────────────────── */}
                {isFinancial && (financial.studentsNoPay.length > 0) && (
                    <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-5 py-3.5">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                                {t('dashboard.alert.no_payment', { count: financial.studentsNoPay.length })}
                            </p>
                            <p className="text-xs text-red-500 mt-0.5">
                                {t('dashboard.alert.no_payment_hint')}
                            </p>
                        </div>
                        <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100 text-xs gap-1 shrink-0"
                            onClick={() => router.get(route('accounting.index'))}>
                            {t('common.actions.view')} <ArrowRight className="w-3 h-3" />
                        </Button>
                    </div>
                )}

                {/* ── KPIs : grille unifiée — cards identiques, accolées, sans espace ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {isEnrollment && (
                    <>
                        <KpiCard
                            title={t('dashboard.kpi.students_enrolled')}
                            value={enrollments.enrollments_year}
                            sub={t('dashboard.header.school_year', { year: activeYear?.year ?? '—' })}
                            icon={Users}
                            color="blue"
                        />
                        <KpiCard
                            title={t('dashboard.kpi.this_week')}
                            value={enrollments.enrollments_week}
                            sub={t('dashboard.kpi.this_week_sub')}
                            icon={CalendarDays}
                            color="purple"
                        />
                        <KpiCard
                            title={t('dashboard.kpi.active_students')}
                            value={enrollments.active_students}
                            sub={t('dashboard.kpi.active_students_sub', { total: enrollments.total_students })}
                            icon={GraduationCap}
                            color="green"
                        />
                        {isFinancial && (
                            <div className="bg-white dark:bg-card rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 min-h-28 flex flex-col justify-center">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('dashboard.kpi.recovery_rate')}</p>
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{collectedPct}%</p>
                                <ProgressBar
                                    value={collectedPct}
                                    color={collectedPct >= 80 ? 'green' : collectedPct >= 50 ? 'orange' : 'red'}
                                />
                            </div>
                        )}
                        <KpiCard
                            title={t('dashboard.kpi.boys')}
                            value={enrollments.students_by_gender.male}
                            sub={t('dashboard.kpi.gender_sub', { pct: genderPct(enrollments.students_by_gender.male) })}
                            icon={User}
                            color="blue"
                        />
                        <KpiCard
                            title={t('dashboard.kpi.girls')}
                            value={enrollments.students_by_gender.female}
                            sub={t('dashboard.kpi.gender_sub', { pct: genderPct(enrollments.students_by_gender.female) })}
                            icon={User}
                            color="purple"
                        />
                        <KpiCard
                            title={t('dashboard.kpi.active_classes')}
                            value={enrollments.active_classrooms}
                            sub={t('dashboard.kpi.active_classes_sub')}
                            icon={Layers}
                            color="green"
                        />
                        <KpiCard
                            title={t('dashboard.kpi.users')}
                            value={enrollments.total_users}
                            sub={t('dashboard.kpi.users_sub')}
                            icon={Users}
                            color="orange"
                        />
                        <KpiCard
                            title={t('dashboard.kpi.teachers')}
                            value={enrollments.teachers_count}
                            sub={t('dashboard.kpi.teachers_sub')}
                            icon={GraduationCap}
                            color="purple"
                        />
                        <KpiCard
                            title={t('dashboard.kpi.rem')}
                            value={enrollments.rem ?? '—'}
                            sub={t('dashboard.kpi.rem_sub', { count: enrollments.teachers_count })}
                            icon={Users}
                            color="blue"
                        />
                    </>
                )}
                {isAcademic && (
                    <>
                        <KpiCard
                            title={t('dashboard.kpi.present_today')}
                            value={academic.present_today}
                            sub={t('dashboard.kpi.present_today_sub', { count: academic.absent_today })}
                            icon={UserCheck}
                            color="green"
                        />
                        <KpiCard
                            title={t('dashboard.kpi.presence_rate')}
                            value={presenceRateToday !== null ? `${presenceRateToday}%` : '—'}
                            sub={pointedToday > 0 ? t('dashboard.kpi.presence_rate_sub', { present: academic.present_today, total: pointedToday }) : t('dashboard.kpi.presence_rate_none')}
                            icon={UserCheck}
                            color={presenceRateToday === null ? 'blue' : presenceRateToday >= 90 ? 'green' : presenceRateToday >= 75 ? 'orange' : 'red'}
                        />
                        <KpiCard
                            title={t('dashboard.kpi.pending_permissions')}
                            value={academic.pending_permissions}
                            sub={t('dashboard.kpi.pending_permissions_sub')}
                            icon={ShieldCheck}
                            color="orange"
                        />
                        <KpiCard
                            title={t('dashboard.kpi.documents')}
                            value={academic.documents_month}
                            sub={t('dashboard.kpi.this_month')}
                            icon={FileBadge}
                            color="purple"
                        />
                        <KpiCard
                            title={t('dashboard.kpi.official_exams')}
                            value={academic.exams_open}
                            sub={t('dashboard.kpi.official_exams_sub', { count: academic.exam_registrations })}
                            icon={GraduationCap}
                            color="blue"
                        />
                    </>
                )}
                {isBulletins && (
                    <>
                        <KpiCard
                            title={t('dashboard.kpi.validated_bulletins')}
                            value={bulletins.validated}
                            sub={bulletins.period ? t('dashboard.kpi.period', { period: bulletins.period }) : t('dashboard.kpi.all_periods')}
                            icon={FileBadge}
                            color="blue"
                        />
                        <KpiCard
                            title={t('dashboard.kpi.general_average')}
                            value={bulletins.average !== null ? `${bulletins.average}/20` : '—'}
                            sub={bulletins.period ? t('dashboard.kpi.period', { period: bulletins.period }) : t('dashboard.kpi.current_period')}
                            icon={CheckCircle2}
                            color="green"
                        />
                    </>
                )}
                {isFinancial && (
                    <>
                        <KpiCard
                            title={t('dashboard.kpi.total_billed')}
                            value={fmt(Number(stats?.total_amount ?? 0))}
                            sub={t('dashboard.kpi.total_billed_sub', { count: stats?.total_invoices ?? 0 })}
                            icon={Banknote}
                            color="blue"
                        />
                        <KpiCard
                            title={t('dashboard.kpi.collected')}
                            value={fmt(Number(stats?.total_paid ?? 0))}
                            sub={t('dashboard.kpi.collected_sub', { pct: collectedPct })}
                            icon={CheckCircle2}
                            color="green"
                        />
                        <KpiCard
                            title={t('dashboard.kpi.remaining')}
                            value={fmt(Number(stats?.total_remaining ?? 0))}
                            sub={t('dashboard.kpi.remaining_sub', { count: (stats?.issued_count ?? 0) + (stats?.partial_count ?? 0) })}
                            icon={AlertCircle}
                            color="orange"
                        />
                        <KpiCard
                            title={t('dashboard.kpi.paid_unpaid')}
                            value={`${stats?.paid_count ?? 0} / ${stats?.issued_count ?? 0}`}
                            sub={t('dashboard.kpi.paid_unpaid_sub', { count: stats?.partial_count ?? 0 })}
                            icon={XCircle}
                            color="red"
                        />
                        <KpiCard title={t('dashboard.kpi.collected_month')} value={fmt(financial.month.income)} sub={t('dashboard.kpi.this_month')} icon={TrendingUp} color="green" />
                        <KpiCard title={t('dashboard.kpi.expenses_month')} value={fmt(financial.month.expenses)} sub={t('dashboard.kpi.this_month')} icon={TrendingDown} color="red" />
                        <KpiCard
                            title={t('dashboard.kpi.net_month')}
                            value={fmt(financial.month.net)}
                            sub={financial.month.net >= 0 ? t('dashboard.kpi.surplus') : t('dashboard.kpi.deficit')}
                            icon={Wallet}
                            color={financial.month.net >= 0 ? 'blue' : 'orange'}
                        />
                    </>
                )}
                </div>

                {/* ── Permissions en attente + Prochains examens ────────── */}
                {isAcademic && (
                    <div className="grid lg:grid-cols-2 gap-5">
                        <SectionCard
                            title={t('dashboard.section.pending_permissions')}
                            icon={<ShieldCheck className="w-4 h-4" />}
                            count={academic.pendingPermissions.length}
                            action={{ label: t('dashboard.section.pending_permissions_action'), href: route('absence-permissions.index') }}
                        >
                            {academic.pendingPermissions.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6 px-5">{t('dashboard.section.pending_permissions_empty')}</p>
                            ) : (
                                <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                    {academic.pendingPermissions.map(p => (
                                        <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.student_name}</p>
                                                <p className="text-xs text-gray-400">{reasonLabel[p.reason] ?? p.reason} · {p.start_date} → {p.end_date}</p>
                                            </div>
                                            <span className="shrink-0 ml-3 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                                {t('dashboard.status.pending')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SectionCard>

                        <SectionCard
                            title={t('dashboard.section.upcoming_exams')}
                            icon={<GraduationCap className="w-4 h-4" />}
                            count={academic.upcomingExams.length}
                            action={{ label: t('dashboard.section.upcoming_exams_action'), href: route('official-exams.index') }}
                        >
                            {academic.upcomingExams.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6 px-5">{t('dashboard.section.upcoming_exams_empty')}</p>
                            ) : (
                                <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                    {academic.upcomingExams.map(e => (
                                        <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    <span className="uppercase text-blue-600 dark:text-blue-400 font-bold mr-1.5">{e.type}</span>{e.name}
                                                </p>
                                                <p className="text-xs text-gray-400">{e.center ?? '—'} · {t('dashboard.section.registered', { count: e.registrations })}</p>
                                            </div>
                                            <span className="shrink-0 ml-3 text-xs text-gray-500">{e.exam_date}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SectionCard>
                    </div>
                )}

                {/* ── Évolution mensuelle + Caisses ────────────────────── */}
                {isFinancial && (
                    <div className="grid lg:grid-cols-3 gap-5">

                        {/* Graphe mensuel */}
                        <div className="lg:col-span-2 bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="w-4 h-4 text-gray-400" />
                                <h2 className="font-semibold text-sm text-gray-900 dark:text-white">{t('dashboard.section.monthly')}</h2>
                            </div>
                            {financial.monthlyPayments.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-8">{t('dashboard.section.monthly_empty')}</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={financial.monthlyPayments.map(m => ({ name: m.month_label.slice(0, 3), total: Number(m.total), label: m.month_label }))}
                                        margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={theme.primary} stopOpacity={0.35} />
                                                <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: theme.tick }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} width={48}
                                            tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} />
                                        <RTooltip formatter={(v) => [fmt(Number(v)), t('dashboard.section.collected_tooltip')]} labelFormatter={() => ''} />
                                        <Area type="monotone" dataKey="total" stroke={theme.primary} strokeWidth={2} fill="url(#payGrad)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Soldes caisses */}
                        <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Wallet className="w-4 h-4 text-gray-400" />
                                <h2 className="font-semibold text-sm text-gray-900 dark:text-white">{t('dashboard.section.cash_balances')}</h2>
                            </div>
                            {financial.cashAccounts.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6">{t('dashboard.section.cash_balances_empty')}</p>
                            ) : (
                                <div className="space-y-3">
                                    {financial.cashAccounts.map(ca => (
                                        <div key={ca.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                                            <div>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{ca.name}</p>
                                                <p className="text-xs text-gray-400">{cashTypeLabel[ca.type] ?? ca.type}</p>
                                            </div>
                                            <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                                {fmt(Number(ca.balance))}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                                        <p className="text-xs font-semibold text-gray-500 uppercase">{t('dashboard.section.total')}</p>
                                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                            {fmt(financial.cashAccounts.reduce((s, ca) => s + Number(ca.balance), 0))}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Moyens de paiement ─────────────────────────────────── */}
                {isFinancial && (
                    <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Banknote className="w-4 h-4 text-gray-400" />
                            <h2 className="font-semibold text-sm text-gray-900 dark:text-white">
                                {t('dashboard.section.payment_methods_year', { year: selectedYear?.year ?? activeYear?.year ?? '' })}
                            </h2>
                        </div>
                        {(() => {
                            const total = financial.paymentMethods.reduce((s, m) => s + m.total, 0);
                            if (total === 0) return <p className="text-sm text-gray-400 text-center py-6">{t('dashboard.section.payment_methods_empty')}</p>;
                            return (
                                <ul className="space-y-3">
                                    {financial.paymentMethods.map(m => {
                                        const pct = Math.round((m.total / total) * 100);
                                        const isMomo = m.method === 'MOBILE_MONEY';
                                        return (
                                            <li key={m.method}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className={isMomo ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}>
                                                        {PAYMENT_METHOD_LABELS[m.method] ?? m.method}{isMomo ? ' ★' : ''}
                                                    </span>
                                                    <span className="text-gray-500">{fmt(m.total)} · {pct}%</span>
                                                </div>
                                                <ProgressBar value={pct} color={isMomo ? 'green' : 'blue'} />
                                            </li>
                                        );
                                    })}
                                </ul>
                            );
                        })()}
                    </div>
                )}

                {/* ── Charts : répartition factures + élèves par classe ─── */}
                {((isFinancial && invoiceStatusData.length > 0) || (isEnrollment && enrollments.byClass.length > 0)) && (
                    <div className="grid lg:grid-cols-2 gap-5">

                        {/* Donut : statut des factures */}
                        {isFinancial && invoiceStatusData.length > 0 && (
                            <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <Banknote className="w-4 h-4 text-gray-400" />
                                    <h2 className="font-semibold text-sm text-gray-900 dark:text-white">{t('dashboard.section.invoice_breakdown')}</h2>
                                </div>
                                <div className="flex items-center gap-4">
                                    <ResponsiveContainer width="55%" height={200}>
                                        <PieChart>
                                            <Pie isAnimationActive={false} data={invoiceStatusData} dataKey="value" nameKey="name"
                                                innerRadius={50} outerRadius={80} paddingAngle={2}>
                                                {invoiceStatusData.map(d => <Cell key={d.name} fill={d.color} />)}
                                            </Pie>
                                            <RTooltip formatter={(v, n) => [`${v}`, n]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="space-y-2 flex-1">
                                        {invoiceStatusData.map(d => (
                                            <div key={d.name} className="flex items-center justify-between text-sm">
                                                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                                    {d.name}
                                                </span>
                                                <span className="font-semibold text-gray-900 dark:text-white">{d.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Barres : élèves par classe */}
                        {isEnrollment && enrollments.byClass.length > 0 && (
                            <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <h2 className="font-semibold text-sm text-gray-900 dark:text-white">{t('dashboard.section.students_per_class')}</h2>
                                </div>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={enrollments.byClass.map(c => ({ name: c.class_name, total: Number(c.total) }))}
                                        margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                                        <YAxis tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                                        <RTooltip formatter={(v) => [`${v}`, t('dashboard.section.students_tooltip')]} />
                                        <Bar dataKey="total" fill={theme.primary} radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Derniers paiements + Dernières inscriptions ───────── */}
                <div className="grid lg:grid-cols-2 gap-5">

                    {/* Derniers paiements */}
                    {isFinancial && (
                        <SectionCard
                            title={t('dashboard.section.recent_payments')}
                            icon={<Banknote className="w-4 h-4" />}
                            count={financial.recentPayments.length}
                            action={{ label: t('dashboard.section.recent_payments_action'), href: route('accounting.index') }}
                        >
                            {financial.recentPayments.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6 px-5">{t('dashboard.section.recent_payments_empty')}</p>
                            ) : (
                                <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                    {financial.recentPayments.map(p => (
                                        <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.student_name}</p>
                                                <p className="text-xs text-gray-400">{p.class_name} · {methodLabel[p.payment_method] ?? p.payment_method}</p>
                                            </div>
                                            <div className="text-right shrink-0 ml-3">
                                                <p className="text-sm font-bold text-green-600 dark:text-green-400">{fmt(p.amount)}</p>
                                                <p className="text-xs text-gray-400">{p.paid_at ?? '—'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SectionCard>
                    )}

                    {/* Dernières inscriptions */}
                    {isEnrollment && (
                        <SectionCard
                            title={t('dashboard.section.recent_enrollments')}
                            icon={<ClipboardList className="w-4 h-4" />}
                            count={enrollments.recentEnrollments.length}
                            action={{ label: t('dashboard.section.recent_enrollments_action'), href: route('enrollments.index') }}
                        >
                            {enrollments.recentEnrollments.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6 px-5">{t('dashboard.section.recent_enrollments_empty')}</p>
                            ) : (
                                <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                    {enrollments.recentEnrollments.map(e => {
                                        const st = statusLabel[e.status] ?? { label: e.status, cls: 'bg-gray-100 text-gray-600' };
                                        return (
                                            <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{e.student_name}</p>
                                                    <p className="text-xs text-gray-400">{e.class_name} · {e.enrollment_date ?? '—'}</p>
                                                </div>
                                                <span className={`shrink-0 ml-3 text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>
                                                    {st.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </SectionCard>
                    )}
                </div>

                {/* ── Élèves sans paiement (table détaillée) ──────────── */}
                {isFinancial && financial.studentsNoPay.length > 0 && (
                    <SectionCard
                        title={t('dashboard.section.students_no_pay')}
                        icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
                        count={financial.studentsNoPay.length}
                        action={{ label: t('dashboard.section.students_no_pay_action'), href: route('accounting.index') }}
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('dashboard.section.col_student')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('dashboard.section.col_class')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('dashboard.section.col_amount_due')}</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                    {financial.studentsNoPay.map(e => (
                                        <tr key={e.id} className="hover:bg-red-50/30 dark:hover:bg-red-900/10 border-l-2 border-l-red-400">
                                            <td className="px-5 py-3">
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {e.student ? `${e.student.firstname} ${e.student.lastname}` : '—'}
                                                </p>
                                                {e.student?.matricule && <p className="text-xs text-gray-400">{e.student.matricule}</p>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                                                    {e.classroom?.name ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                                                {fmt(Number(e.invoice?.amount_remaining ?? 0))}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button size="sm" variant="outline" className="text-xs h-7"
                                                    onClick={() => router.get(route('enrollments.invoice', e.id))}>
                                                    {t('dashboard.section.invoice_action')}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>
                )}

                {/* ── Section enseignant ───────────────────────────────── */}
                {isTeacher && (
                    <>
                        <div className="grid lg:grid-cols-2 gap-4">
                            {/* Emploi du temps du jour */}
                            <SectionCard
                                title={t('dashboard.teacher.today_timetable')}
                                icon={<CalendarDays className="w-4 h-4" />}
                                count={teaching.today.length}
                                action={{ label: t('dashboard.teacher.timetable_action'), href: route('timetable.index') }}
                            >
                                {teaching.today.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-6 px-5">{t('dashboard.teacher.today_empty')}</p>
                                ) : (
                                    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {teaching.today.map(s => (
                                            <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                                                <span className="font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                    {s.start_time}–{s.end_time}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-gray-800 dark:text-gray-200 text-sm truncate">{s.subject}</p>
                                                    <p className="text-xs text-gray-400">{s.class_name}{s.room ? ` · ${t('dashboard.teacher.room', { room: s.room })}` : ''}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </SectionCard>

                            {/* Notes à saisir */}
                            <SectionCard
                                title={t('dashboard.teacher.pending_marks')}
                                icon={<ClipboardList className="w-4 h-4" />}
                                count={teaching.pendingMarks.count}
                                action={{ label: t('dashboard.teacher.evaluations_action'), href: route('evaluations.index') }}
                            >
                                {teaching.pendingMarks.items.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-6 px-5">{t('dashboard.teacher.pending_marks_empty')}</p>
                                ) : (
                                    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {teaching.pendingMarks.items.map(e => (
                                            <li key={e.id}>
                                                <Link
                                                    href={route('marks.index', e.id)}
                                                    className="flex items-center gap-3 px-5 py-3 hover:bg-amber-50/60 dark:hover:bg-amber-900/10"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium text-gray-800 dark:text-gray-200 text-sm truncate">{e.name}</p>
                                                        <p className="text-xs text-gray-400">{e.subject} · {e.class_name}{e.date ? ` · ${e.date}` : ''}</p>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-amber-500 shrink-0" />
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </SectionCard>
                        </div>

                        {/* Mes classes & matières */}
                        <SectionCard
                            title={t('dashboard.teacher.my_classes')}
                            icon={<BookOpen className="w-4 h-4" />}
                            count={teaching.assignments.length}
                            action={{ label: t('dashboard.teacher.assignments_action'), href: route('subject-assignments.index') }}
                        >
                            {teaching.assignments.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6 px-5">
                                    {t('dashboard.teacher.assignments_empty', { year: activeYear?.year ?? '—' })}
                                </p>
                            ) : (
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
                                    {teaching.assignments.map(a => (
                                        <div key={a.id} className="bg-white dark:bg-card rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                                            <p className="font-semibold text-blue-700 dark:text-blue-300 text-sm">{a.subject}</p>
                                            <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                                                {a.class_name} <span className="opacity-60">({a.class_code})</span>
                                            </p>
                                            <Link
                                                href={route('attendances.index')}
                                                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-300 hover:gap-2 transition-all"
                                            >
                                                <UserCheck className="w-3.5 h-3.5" /> {t('dashboard.teacher.take_attendance')}
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SectionCard>
                    </>
                )}

                {/* ── État vide ────────────────────────────────────────── */}
                {!isFinancial && !isEnrollment && !isTeacher && (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                            <TrendingDown className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 font-medium">{t('dashboard.empty.title')}</p>
                        <p className="text-sm text-gray-400 mt-1">{t('dashboard.empty.subtitle')}</p>
                    </div>
                )}

            </div>
        </AppLayout>
    );
}
