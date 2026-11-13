import { Head, router } from '@inertiajs/react';
import {
    TrendingUp, TrendingDown, Users, AlertTriangle,
    CheckCircle2, Clock, AlertCircle, ChevronDown,
    Eye, BookOpen, Banknote, Filter, XCircle,
} from 'lucide-react';
import { useState } from 'react';
import {
    Bar, CartesianGrid, ComposedChart, Legend, Line,
    ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { useMoney } from '@/helpers/money';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';
import { useChartTheme } from '@/lib/chart-theme';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type InvoiceStatus = 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

interface AcademicYear { id: string; year: string; active: boolean; }
interface Classroom    { id: string; name: string; code: string; }

interface GlobalStats {
    total_invoices:  number;
    total_amount:    number;
    total_paid:      number;
    total_remaining: number;
    paid_count:      number;
    partial_count:   number;
    issued_count:    number;
    cancelled_count: number;
}

interface MonthlyPayment { month: string; month_label: string; total: number; }

interface ClassStat {
    class_id:          string;
    class_name:        string;
    class_code:        string;
    total_enrollments: number;
    total_amount:      number;
    amount_paid:       number;
    amount_remaining:  number;
    paid_count:        number;
    issued_count:      number;
    partial_count:     number;
}

interface StudentUnpaid {
    id: string;
    enrollment_code: string;
    student?: { id: string; firstname: string; lastname: string; matricule?: string | null } | null;
    classroom?: { id: string; name: string; code: string } | null;
    invoice?: {
        id: string;
        invoice_number: string;
        total: number;
        amount_paid: number;
        amount_remaining: number;
        status: InvoiceStatus;
    } | null;
}

interface DashboardProps {
    academicYears:   AcademicYear[];
    classrooms:      Classroom[];
    filters:         { academic_year_id?: string | null; class_id?: string | null };
    globalStats:     GlobalStats | null;
    monthlyPayments: MonthlyPayment[];
    byClass:         ClassStat[];
    studentsUnpaid:  StudentUnpaid[];
    studentsUnpaidTotal: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const pct = (paid: number, total: number) =>
    total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

const statusConfig: Record<InvoiceStatus, { badge: string; icon: React.ReactNode }> = {
    ISSUED:         { badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',        icon: <XCircle className="w-3.5 h-3.5" /> },
    PARTIALLY_PAID: { badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: <AlertCircle className="w-3.5 h-3.5" /> },
    PAID:           { badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    CANCELLED:      { badge: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',        icon: <XCircle className="w-3.5 h-3.5" /> },
};

/* ------------------------------------------------------------------ */
/* Sous-composants                                                     */
/* ------------------------------------------------------------------ */

function KpiCard({ title, value, sub, icon: Icon, color, trend }: {
    title: string; value: string; sub?: string;
    icon: React.ElementType; color: 'blue' | 'green' | 'orange' | 'red';
    trend?: { value: number; label: string };
}) {
    const styles = {
        blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-600 dark:text-blue-400' },
        green:  { bg: 'bg-green-50 dark:bg-green-900/20',  text: 'text-green-600 dark:text-green-400' },
        orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' },
        red:    { bg: 'bg-red-50 dark:bg-red-900/20',      text: 'text-red-600 dark:text-red-400' },
    };
    const { bg, text } = styles[color];
    return (
        <div className={`${bg} rounded-lg p-6 transition-all hover:shadow-md shadow-sm`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
                    <p className={`text-3xl font-bold ${text} mt-2`}>{value}</p>
                    {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
                </div>
                <Icon className={`w-12 h-12 ${text} opacity-20`} />
            </div>
            {trend !== undefined && (
                <div className={`flex items-center gap-1.5 text-xs font-semibold mt-3 pt-3 border-t border-black/5 dark:border-white/10 ${trend.value >= 0 ? 'text-green-700 dark:text-green-500' : 'text-red-600 dark:text-red-400'}`}>
                    {trend.value >= 0
                        ? <TrendingUp className="w-3.5 h-3.5" />
                        : <TrendingDown className="w-3.5 h-3.5" />}
                    {trend.label}
                </div>
            )}
        </div>
    );
}

function ProgressBar({ value, color = 'blue', height = 'h-2' }: {
    value: number; color?: 'blue' | 'green' | 'orange' | 'red'; height?: string;
}) {
    const bar = { blue: 'bg-blue-500', green: 'bg-green-500', orange: 'bg-orange-400', red: 'bg-red-400' };
    return (
        <div className={`w-full ${height} bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden`}>
            <div
                className={`h-full rounded-full transition-all duration-500 ${bar[color]}`}
                style={{ width: `${value}%` }}
            />
        </div>
    );
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400">
                    {icon}
                </div>
                <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
            </div>
            {count !== undefined && (
                <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full">
                    {count}
                </span>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                  */
/* ------------------------------------------------------------------ */

export default function AccountingDashboard({
    academicYears, classrooms, filters, globalStats, monthlyPayments, byClass, studentsUnpaid, studentsUnpaidTotal,
}: Readonly<DashboardProps>) {
    const theme = useChartTheme();
    const fmt = useMoney();
    const { t } = useTranslation();
    const [yearId,  setYearId]  = useState(filters.academic_year_id ?? '');
    const [classId, setClassId] = useState(filters.class_id ?? '');

    const currentYear = academicYears.find(y => y.id === yearId);

    const applyFilters = (newYear?: string, newClass?: string) => {
        const y = newYear  !== undefined ? newYear  : yearId;
        const c = newClass !== undefined ? newClass : classId;
        router.get(route('accounting.index'), {
            academic_year_id: y || undefined,
            class_id:         c || undefined,
        }, { preserveState: true, replace: true });
    };

    const collectedPct = pct(globalStats?.total_paid ?? 0, globalStats?.total_amount ?? 0);

    /* Graphe mensuel : encaissé du mois + cumul, vs total attendu */
    const chartData = (() => {
        let cumulative = 0;
        return monthlyPayments.map(m => {
            cumulative += Number(m.total);
            return { label: m.month_label.slice(0, 3), fullLabel: m.month_label, encaisse: Number(m.total), cumul: cumulative };
        });
    })();
    const totalExpected = Number(globalStats?.total_amount ?? 0);

    /* Urgence : élèves avec 0 paiement */
    const toSend = studentsUnpaid.filter(e => e.invoice?.status === 'ISSUED');

    return (
        <AppLayout>
            <Head title={t('comptabilite.dashboard.head')} />

            <div className="space-y-7">

                {/* ── En-tête ── */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            {t('comptabilite.dashboard.title')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {currentYear ? t('comptabilite.dashboard.year_prefix', { year: currentYear.year }) : t('comptabilite.dashboard.all_years')}
                            {classId && ` · ${classrooms.find(c => c.id === classId)?.name ?? ''}`}
                        </p>
                    </div>

                    {/* Filtres */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Filter className="w-3.5 h-3.5" />
                            {t('comptabilite.dashboard.filter')}
                        </div>
                        <div className="relative">
                            <select
                                value={yearId}
                                onChange={e => { setYearId(e.target.value); applyFilters(e.target.value); }}
                                className="pl-3 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-card dark:text-gray-100 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">{t('comptabilite.dashboard.all_years')}</option>
                                {academicYears.map(y => (
                                    <option key={y.id} value={y.id}>{y.year}{y.active ? ' ✓' : ''}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select
                                value={classId}
                                onChange={e => { setClassId(e.target.value); applyFilters(undefined, e.target.value); }}
                                className="pl-3 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-card dark:text-gray-100 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">{t('comptabilite.dashboard.all_classes')}</option>
                                {classrooms.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>

                        {(yearId || classId) && (
                            <Button size="sm" variant="outline" onClick={() => { setYearId(''); setClassId(''); applyFilters('', ''); }}
                                className="text-xs gap-1">
                                <XCircle className="w-3.5 h-3.5" /> {t('comptabilite.dashboard.reset')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* ── Alerte élèves à renvoyer ── */}
                {toSend.length > 0 && (
                    <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-5 py-3.5">
                        <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                                {t('comptabilite.dashboard.alert_unpaid', { count: toSend.length })}
                            </p>
                            <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                                {t('comptabilite.dashboard.alert_unpaid_hint')}
                            </p>
                        </div>
                    </div>
                )}

                {/* ── KPIs ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                        title={t('comptabilite.dashboard.total_billed')}
                        value={fmt(globalStats?.total_amount ?? 0)}
                        sub={t('comptabilite.dashboard.invoices', { count: globalStats?.total_invoices ?? 0 })}
                        icon={Banknote}
                        color="blue"
                    />
                    <KpiCard
                        title={t('comptabilite.dashboard.collected')}
                        value={fmt(globalStats?.total_paid ?? 0)}
                        sub={t('comptabilite.dashboard.of_total', { pct: collectedPct })}
                        icon={CheckCircle2}
                        color="green"
                        trend={{ value: collectedPct, label: t('comptabilite.dashboard.recovered', { pct: collectedPct }) }}
                    />
                    <KpiCard
                        title={t('comptabilite.dashboard.remaining')}
                        value={fmt(globalStats?.total_remaining ?? 0)}
                        sub={t('comptabilite.dashboard.open_files', { count: (globalStats?.issued_count ?? 0) + (globalStats?.partial_count ?? 0) })}
                        icon={Clock}
                        color="orange"
                    />
                    <KpiCard
                        title={t('comptabilite.dashboard.paid_late')}
                        value={`${globalStats?.paid_count ?? 0} / ${globalStats?.issued_count ?? 0}`}
                        sub={t('comptabilite.dashboard.partial_payments', { count: globalStats?.partial_count ?? 0 })}
                        icon={Users}
                        color="red"
                    />
                </div>

                {/* ── Barre de recouvrement globale ── */}
                <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('comptabilite.dashboard.recovery_global')}</p>
                        <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{collectedPct}%</span>
                    </div>
                    <ProgressBar
                        value={collectedPct}
                        color={collectedPct >= 80 ? 'green' : collectedPct >= 50 ? 'orange' : 'red'}
                        height="h-4"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                        <span>0 F</span>
                        <span>{t('comptabilite.dashboard.collected_of', { paid: fmt(globalStats?.total_paid ?? 0), total: fmt(globalStats?.total_amount ?? 0) })}</span>
                    </div>
                </div>

                {/* ── Évolution mensuelle ── */}
                {monthlyPayments.length > 0 && (
                    <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                        <SectionHeader icon={<TrendingUp className="w-4 h-4" />} title={t('comptabilite.dashboard.monthly')} />
                        <div className="h-72 mt-4 -ml-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: theme.axis }} axisLine={false} tickLine={false} />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} width={70}
                                        tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                                    />
                                    <Tooltip
                                        formatter={(value, name) => [fmt(Number(value)), name === 'encaisse' ? t('comptabilite.dashboard.month_collected') : t('comptabilite.dashboard.cumul_collected')]}
                                        labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullLabel ?? ''}
                                        contentStyle={theme.tooltip.contentStyle} itemStyle={theme.tooltip.itemStyle}
                                    />
                                    <Legend
                                        formatter={(value: string) =>
                                            value === 'encaisse' ? t('comptabilite.dashboard.month_collected') : value === 'cumul' ? t('comptabilite.dashboard.cumul_collected') : t('comptabilite.dashboard.expected')
                                        }
                                        wrapperStyle={{ fontSize: 12 }}
                                    />
                                    {totalExpected > 0 && (
                                        <ReferenceLine y={totalExpected} stroke={theme.status.warning} strokeDasharray="5 5"
                                            label={{ value: t('comptabilite.dashboard.expected_short'), position: 'right', fill: theme.status.warning, fontSize: 11 }} />
                                    )}
                                    <Bar dataKey="encaisse" name="encaisse" fill={theme.primary} radius={[6, 6, 0, 0]} maxBarSize={44} />
                                    <Line type="monotone" dataKey="cumul" name="cumul" stroke={theme.series[2]} strokeWidth={2.5} dot={{ r: 3 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* ── Répartition par classe ── */}
                {byClass.length > 0 && (
                    <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="px-5 pt-5 pb-3">
                            <SectionHeader
                                icon={<BookOpen className="w-4 h-4" />}
                                title={t('comptabilite.dashboard.by_class')}
                                count={byClass.length}
                            />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.dashboard.col_class')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.dashboard.col_students')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.dashboard.col_billed')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.dashboard.col_collected')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.dashboard.col_remaining')}</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[140px]">{t('comptabilite.dashboard.col_rate')}</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.dashboard.col_statuses')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                    {byClass.map(c => {
                                        const p = pct(Number(c.amount_paid), Number(c.total_amount));
                                        const barColor = p >= 80 ? 'green' : p >= 50 ? 'orange' : 'red';
                                        return (
                                            <tr key={c.class_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">
                                                            {c.class_code.slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white text-sm">{c.class_name}</p>
                                                            <p className="text-xs text-gray-400">{c.class_code}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-right">
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">{c.total_enrollments}</span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-gray-700 dark:text-gray-300 font-medium">{fmt(Number(c.total_amount))}</td>
                                                <td className="px-4 py-3.5 text-right font-semibold text-green-600 dark:text-green-400">{fmt(Number(c.amount_paid))}</td>
                                                <td className="px-4 py-3.5 text-right font-semibold text-red-500 dark:text-red-400">{fmt(Number(c.amount_remaining))}</td>
                                                <td className="px-4 py-3.5 min-w-[140px]">
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                                            <span>{p}%</span>
                                                        </div>
                                                        <ProgressBar value={p} color={barColor} />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {c.paid_count > 0 && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                                <CheckCircle2 className="w-3 h-3" />{c.paid_count}
                                                            </span>
                                                        )}
                                                        {c.partial_count > 0 && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                                                <AlertCircle className="w-3 h-3" />{c.partial_count}
                                                            </span>
                                                        )}
                                                        {c.issued_count > 0 && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                                <XCircle className="w-3 h-3" />{c.issued_count}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Élèves avec solde impayé ── */}
                <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="px-5 pt-5 pb-3">
                        <div className="flex items-start justify-between gap-3">
                            <SectionHeader
                                icon={<AlertTriangle className="w-4 h-4" />}
                                title={t('comptabilite.dashboard.unpaid_title')}
                                count={studentsUnpaidTotal}
                            />
                            {studentsUnpaidTotal > studentsUnpaid.length && (
                                <Button variant="outline" size="sm" className="gap-1.5 shrink-0"
                                    onClick={() => router.get(route('accounting.situation'), { academic_year_id: yearId || undefined, class_id: classId || undefined })}>
                                    <Eye className="w-3.5 h-3.5" /> {t('comptabilite.dashboard.view_all')}
                                </Button>
                            )}
                        </div>
                        {studentsUnpaid.length > 0 && (
                            <p className="text-xs text-gray-400 mt-1 mb-2">
                                {studentsUnpaidTotal > studentsUnpaid.length
                                    ? t('comptabilite.dashboard.top_n', { shown: studentsUnpaid.length, total: studentsUnpaidTotal })
                                    : t('comptabilite.dashboard.sorted')}
                                <span className="text-red-500 font-medium">{t('comptabilite.dashboard.no_payment_count', { count: toSend.length })}</span>
                            </p>
                        )}
                    </div>

                    {studentsUnpaid.length === 0 ? (
                        <div className="px-5 pb-10 text-center">
                            <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 className="w-7 h-7 text-green-500" />
                            </div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('comptabilite.dashboard.all_uptodate')}</p>
                            <p className="text-xs text-gray-400 mt-1">{t('comptabilite.dashboard.all_uptodate_hint')}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.dashboard.col_student')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.dashboard.col_class')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.dashboard.col_total')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.dashboard.col_paid')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.dashboard.col_remaining')}</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.dashboard.col_status')}</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.dashboard.col_risk')}</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                    {studentsUnpaid.map(e => {
                                        const inv = e.invoice;
                                        const p   = pct(inv?.amount_paid ?? 0, inv?.total ?? 0);
                                        const st  = inv?.status ? statusConfig[inv.status] : null;
                                        const isHighRisk = inv?.status === 'ISSUED';

                                        return (
                                            <tr key={e.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors ${isHighRisk ? 'border-l-2 border-l-red-400' : ''}`}>
                                                <td className="px-5 py-3.5">
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {e.student ? `${e.student.firstname} ${e.student.lastname}` : '—'}
                                                        </p>
                                                        {e.student?.matricule && (
                                                            <p className="text-xs text-gray-400">{e.student.matricule}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                        <BookOpen className="w-3 h-3" />
                                                        {e.classroom?.name ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-gray-700 dark:text-gray-300 font-medium">{fmt(inv?.total ?? 0)}</td>
                                                <td className="px-4 py-3.5 text-right font-semibold text-green-600 dark:text-green-400">{fmt(inv?.amount_paid ?? 0)}</td>
                                                <td className="px-4 py-3.5 text-right">
                                                    <span className="font-bold text-red-600 dark:text-red-400">{fmt(inv?.amount_remaining ?? 0)}</span>
                                                    <div className="mt-1 w-20 ml-auto">
                                                        <ProgressBar value={p} color="orange" />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    {st && (
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${st.badge}`}>
                                                            {st.icon}{t(`comptabilite.dashboard.status.${inv!.status}`)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    {isHighRisk ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                            <AlertTriangle className="w-3 h-3" /> {t('comptabilite.dashboard.to_expel')}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                                            <AlertCircle className="w-3 h-3" /> {t('comptabilite.dashboard.partial')}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="gap-1.5 text-xs"
                                                        onClick={() => router.get(route('enrollments.invoice', e.id))}
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        {t('comptabilite.dashboard.follow')}
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </AppLayout>
    );
}
