import { Head, router } from '@inertiajs/react';
import { useMoney } from '@/helpers/money';
import {
    PieChart, Users, CheckCircle2, AlertCircle, XCircle,
    ChevronDown, Filter, Download, BookOpen,
    TrendingUp, TrendingDown, Eye,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface AcademicYear { id: string; year: string; active: boolean; }
interface Classroom    { id: string; name: string; code: string; }

type InvoiceStatus = 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

interface ClassSummary {
    class_id:         string;
    class_name:       string;
    class_code:       string;
    total_students:   number;
    total_amount:     number;
    amount_paid:      number;
    amount_remaining: number;
    paid_count:       number;
    partial_count:    number;
    issued_count:     number;
    cancelled_count:  number;
}

interface StudentRow {
    enrollment_id:    string;
    enrollment_code:  string;
    student_id:       string;
    firstname:        string;
    lastname:         string;
    matricule?:       string | null;
    invoice_number?:  string | null;
    total:            number;
    amount_paid:      number;
    amount_remaining: number;
    status:           InvoiceStatus;
}

interface GlobalStats {
    total_students:   number;
    total_amount:     number;
    amount_paid:      number;
    amount_remaining: number;
    paid_count:       number;
    partial_count:    number;
    issued_count:     number;
}

interface Props {
    academicYears: AcademicYear[];
    classrooms:    Classroom[];
    filters:       { academic_year_id?: string | null; class_id?: string | null };
    globalStats:   GlobalStats;
    byClass:       ClassSummary[];
    students:      StudentRow[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const pct = (paid: number, total: number) =>
    total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

const statusConfig: Record<InvoiceStatus, { bg: string; text: string; icon: React.ReactNode }> = {
    PAID:           { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    PARTIALLY_PAID: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', icon: <AlertCircle className="w-3.5 h-3.5" /> },
    ISSUED:         { bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-400',    icon: <XCircle className="w-3.5 h-3.5" /> },
    CANCELLED:      { bg: 'bg-gray-100 dark:bg-gray-700',      text: 'text-gray-500 dark:text-gray-400',  icon: <XCircle className="w-3.5 h-3.5" /> },
};

/* ------------------------------------------------------------------ */
/* Sous-composants                                                     */
/* ------------------------------------------------------------------ */
function StatCard({ title, value, sub, icon: Icon, color }: {
    title: string; value: string; sub?: string;
    icon: React.ElementType; color: 'blue' | 'green' | 'orange' | 'red' | 'gray';
}) {
    const styles = {
        blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-600 dark:text-blue-400' },
        green:  { bg: 'bg-green-50 dark:bg-green-900/20',  text: 'text-green-600 dark:text-green-400' },
        orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' },
        red:    { bg: 'bg-red-50 dark:bg-red-900/20',      text: 'text-red-600 dark:text-red-400' },
        gray:   { bg: 'bg-gray-100 dark:bg-gray-700',      text: 'text-gray-500 dark:text-gray-400' },
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
        </div>
    );
}

function ProgressBar({ value, color = 'blue' }: { value: number; color?: 'blue' | 'green' | 'orange' | 'red' }) {
    const bar = { blue: 'bg-blue-500', green: 'bg-green-500', orange: 'bg-orange-400', red: 'bg-red-400' };
    return (
        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${bar[color]}`} style={{ width: `${value}%` }} />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                  */
/* ------------------------------------------------------------------ */
export default function Situation({
    academicYears, classrooms, filters, globalStats, byClass, students,
}: Readonly<Props>) {
    const fmt = useMoney();
    const { t } = useTranslation();
    const [yearId,  setYearId]  = useState(filters.academic_year_id ?? '');
    const [classId, setClassId] = useState(filters.class_id ?? '');

    const selectedClass = classrooms.find(c => c.id === classId);
    const currentYear   = academicYears.find(y => y.id === yearId);

    const applyFilters = (newYear?: string, newClass?: string) => {
        const y = newYear  !== undefined ? newYear  : yearId;
        const c = newClass !== undefined ? newClass : classId;
        router.get(route('accounting.situation'), {
            academic_year_id: y  || undefined,
            class_id:         c  || undefined,
        }, { preserveState: true, replace: true });
    };

    const buildExportUrl = (type: 'all' | 'unpaid') => {
        const params = new URLSearchParams();
        if (yearId)  params.set('academic_year_id', yearId);
        if (classId) params.set('class_id', classId);
        params.set('type', type);
        return route('accounting.situation.export') + '?' + params.toString();
    };

    const collectedPct = pct(globalStats.amount_paid, globalStats.total_amount);

    /* Élèves à risque (aucun paiement) */
    const highRiskCount = students.filter(s => s.status === 'ISSUED').length;
    const unpaidStudentsInView = classId
        ? students.filter(s => s.status === 'ISSUED' || s.status === 'PARTIALLY_PAID').length
        : globalStats.issued_count + globalStats.partial_count;

    const sel = "h-9 pl-3 pr-8 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-card dark:text-gray-100 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500";

    return (
        <AppLayout>
            <Head title={t('comptabilite.situation.head')} />

            <div className="space-y-6">

                {/* ── En-tête ── */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <PieChart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            {t('comptabilite.situation.title')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {currentYear ? t('comptabilite.situation.year', { year: currentYear.year }) : t('comptabilite.dashboard.all_years')}
                            {selectedClass ? ` · ${t('comptabilite.situation.class_prefix', { name: selectedClass.name })}` : ` · ${t('comptabilite.situation.all_classes_suffix')}`}
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
                                className={sel}
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
                                className={sel}
                            >
                                <option value="">{t('comptabilite.dashboard.all_classes')}</option>
                                {classrooms.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>

                        {(yearId || classId) && (
                            <Button size="sm" variant="outline" className="text-xs gap-1"
                                onClick={() => { setYearId(''); setClassId(''); applyFilters('', ''); }}>
                                <XCircle className="w-3.5 h-3.5" /> {t('comptabilite.dashboard.reset')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* ── KPI cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title={t('comptabilite.situation.students_concerned')}
                        value={String(globalStats.total_students)}
                        sub={t('comptabilite.situation.classes_count', { count: byClass.length })}
                        icon={Users}
                        color="blue"
                    />
                    <StatCard
                        title={t('comptabilite.situation.total_collected')}
                        value={fmt(globalStats.amount_paid)}
                        sub={t('comptabilite.situation.of_billed', { pct: pct(globalStats.amount_paid, globalStats.total_amount) })}
                        icon={TrendingUp}
                        color="green"
                    />
                    <StatCard
                        title={t('comptabilite.situation.remaining')}
                        value={fmt(globalStats.amount_remaining)}
                        sub={t('comptabilite.situation.pending_files', { count: unpaidStudentsInView })}
                        icon={TrendingDown}
                        color="orange"
                    />
                    <StatCard
                        title={t('comptabilite.situation.paid_unpaid')}
                        value={`${globalStats.paid_count} / ${globalStats.issued_count}`}
                        sub={t('comptabilite.situation.partial_count', { count: globalStats.partial_count })}
                        icon={PieChart}
                        color="red"
                    />
                </div>

                {/* ── Barre de recouvrement ── */}
                {globalStats.total_amount > 0 && (
                    <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('comptabilite.dashboard.recovery_global')}</p>
                            <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                                {pct(globalStats.amount_paid, globalStats.total_amount)}%
                            </span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    collectedPct >= 80 ? 'bg-green-500' : collectedPct >= 50 ? 'bg-orange-400' : 'bg-red-400'
                                }`}
                                style={{ width: `${collectedPct}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-2">
                            <span>0 F</span>
                            <span>{t('comptabilite.situation.collected_of_short', { paid: fmt(globalStats.amount_paid), total: fmt(globalStats.total_amount) })}</span>
                        </div>
                    </div>
                )}

                {/* ── Tableau résumé par classe ── */}
                <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400">
                                <BookOpen className="w-4 h-4" />
                            </div>
                            <h2 className="font-semibold text-gray-900 dark:text-white">{t('comptabilite.situation.summary_by_class')}</h2>
                            <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full">
                                {byClass.length}
                            </span>
                        </div>
                    </div>

                    {byClass.length === 0 ? (
                        <div className="px-5 py-12 text-center text-gray-400">
                            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">{t('comptabilite.situation.no_data')}</p>
                        </div>
                    ) : (
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
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.situation.col_export')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                    {byClass.map(c => {
                                        const p        = pct(c.amount_paid, c.total_amount);
                                        const barColor = p >= 80 ? 'green' : p >= 50 ? 'orange' : 'red';
                                        const isActive = classId === c.class_id;
                                        return (
                                            <tr
                                                key={c.class_id}
                                                className={`transition-colors cursor-pointer ${isActive ? 'bg-blue-50/70 dark:bg-blue-900/10' : 'hover:bg-gray-50/50 dark:hover:bg-gray-700/20'}`}
                                                onClick={() => {
                                                    const next = isActive ? '' : c.class_id;
                                                    setClassId(next);
                                                    applyFilters(undefined, next);
                                                }}
                                            >
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>
                                                            {c.class_code.slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{c.class_name}</p>
                                                            <p className="text-xs text-gray-400">{c.class_code}</p>
                                                        </div>
                                                        {isActive && (
                                                            <span className="ml-1 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">{t('comptabilite.situation.selected')}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-medium text-gray-700 dark:text-gray-300">{c.total_students}</td>
                                                <td className="px-4 py-3.5 text-right font-medium text-gray-700 dark:text-gray-300">{fmt(c.total_amount)}</td>
                                                <td className="px-4 py-3.5 text-right font-semibold text-green-600 dark:text-green-400">{fmt(c.amount_paid)}</td>
                                                <td className="px-4 py-3.5 text-right font-semibold text-red-500 dark:text-red-400">{fmt(c.amount_remaining)}</td>
                                                <td className="px-4 py-3.5 min-w-[140px]">
                                                    <div className="space-y-1">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">{p}%</span>
                                                        <ProgressBar value={p} color={barColor} />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-1 flex-wrap">
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
                                                <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center gap-1">
                                                        <a
                                                            href={route('accounting.situation.export') + `?class_id=${c.class_id}${yearId ? `&academic_year_id=${yearId}` : ''}&type=all`}
                                                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                            title={t('comptabilite.situation.export_all_title')}
                                                        >
                                                            <Download className="w-3 h-3" /> {t('comptabilite.situation.export_all')}
                                                        </a>
                                                        <a
                                                            href={route('accounting.situation.export') + `?class_id=${c.class_id}${yearId ? `&academic_year_id=${yearId}` : ''}&type=unpaid`}
                                                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                                                            title={t('comptabilite.situation.export_unpaid_title')}
                                                        >
                                                            <Download className="w-3 h-3" /> {t('comptabilite.situation.export_unpaid')}
                                                        </a>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── Détail élèves (quand une classe est sélectionnée) ── */}
                {classId && students.length > 0 && (
                    <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">

                        {/* En-tête panneau */}
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Users className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-900 dark:text-white">
                                        {t('comptabilite.situation.students_of', { name: selectedClass?.name ?? '' })}
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {t('comptabilite.situation.students_sub', { count: students.length, risk: highRiskCount })}
                                    </p>
                                </div>
                            </div>

                            {/* Boutons export globaux pour la classe sélectionnée */}
                            <div className="flex items-center gap-2">
                                <a
                                    href={buildExportUrl('all')}
                                    className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                                >
                                    <Download className="w-4 h-4" />
                                    {t('comptabilite.situation.export_all_title')}
                                </a>
                                <a
                                    href={buildExportUrl('unpaid')}
                                    className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors font-medium"
                                >
                                    <Download className="w-4 h-4" />
                                    {t('comptabilite.situation.export_unpaid_title')}
                                </a>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.dashboard.col_student')}</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.situation.col_invoice')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.dashboard.col_total')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.dashboard.col_paid')}</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.dashboard.col_remaining')}</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[120px]">{t('comptabilite.situation.col_progress')}</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('comptabilite.dashboard.col_status')}</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                    {students.map(s => {
                                        const st       = statusConfig[s.status];
                                        const p        = pct(s.amount_paid, s.total);
                                        const barColor = p >= 100 ? 'green' : p > 0 ? 'orange' : 'red';
                                        const isRisk   = s.status === 'ISSUED';

                                        return (
                                            <tr
                                                key={s.enrollment_id}
                                                className={`transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-700/20 ${isRisk ? 'border-l-2 border-l-red-400' : ''}`}
                                            >
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isRisk ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>
                                                            {(s.firstname?.[0] ?? '?').toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">
                                                                {s.firstname} {s.lastname}
                                                            </p>
                                                            {s.matricule && (
                                                                <p className="text-xs text-gray-400">{s.matricule}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                                        {s.invoice_number ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-medium text-gray-700 dark:text-gray-300">
                                                    {fmt(s.total)}
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-semibold text-green-600 dark:text-green-400">
                                                    {fmt(s.amount_paid)}
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-bold text-red-500 dark:text-red-400">
                                                    {s.amount_remaining > 0 ? fmt(s.amount_remaining) : (
                                                        <span className="text-green-600 dark:text-green-400">{t('comptabilite.situation.settled')}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 min-w-[120px]">
                                                    <div className="space-y-1">
                                                        <span className="text-xs text-gray-400">{p}%</span>
                                                        <ProgressBar value={p} color={barColor} />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.text}`}>
                                                        {st.icon}{t(`comptabilite.dashboard.status.${s.status}`)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="gap-1.5 text-xs h-7"
                                                        onClick={() => router.get(route('enrollments.invoice', s.enrollment_id))}
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        {t('comptabilite.dashboard.follow')}
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>

                                {/* Pied totaux */}
                                <tfoot>
                                    <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 font-semibold">
                                        <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400" colSpan={2}>
                                            {t('comptabilite.situation.total_students_foot', { count: students.length })}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                                            {fmt(students.reduce((acc, s) => acc + s.total, 0))}
                                        </td>
                                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                                            {fmt(students.reduce((acc, s) => acc + s.amount_paid, 0))}
                                        </td>
                                        <td className="px-4 py-3 text-right text-red-500 dark:text-red-400">
                                            {fmt(students.reduce((acc, s) => acc + s.amount_remaining, 0))}
                                        </td>
                                        <td colSpan={3} />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {/* État vide quand classe sélectionnée mais aucun élève */}
                {classId && students.length === 0 && (
                    <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm px-5 py-12 text-center text-gray-400">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-400 opacity-60" />
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('comptabilite.situation.empty_class')}</p>
                    </div>
                )}

            </div>
        </AppLayout>
    );
}
