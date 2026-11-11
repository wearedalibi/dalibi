import { Head, router } from '@inertiajs/react';
import { BarChart3, Download, FileSpreadsheet, GraduationCap, Layers, MapPin, PieChart as PieIcon, School, TrendingUp, UserCheck, Users, Wallet } from 'lucide-react';
import { useState } from 'react';
import {
    Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, Pie, PieChart,
    ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, Treemap, XAxis, YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMoney } from '@/helpers/money';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';
import { useChartTheme } from '@/lib/chart-theme';
import type { BreadcrumbItem } from '@/types';

/* ---------------- Types ---------------- */
interface YearOption { id: string; year: string; active?: boolean }
interface ClassOption { id: string; name: string }
interface Filters { academic_year_id: string | null; class_id: string | null; gender: string | null }

interface Enrollment {
    total: number;
    gender: { male: number; female: number; other: number };
    ips: number | null;
    part_filles: number;
    by_class: { name: string; cycle: string; male: number; female: number; total: number }[];
    academic_status: Record<string, number>;
    rates: { promotion: number; redoublement: number; abandon: number };
    age_distribution: { age: number; male: number; female: number; total: number }[];
    age_moyen: number | null;
    by_city: { city: string; male: number; female: number; total: number }[];
    over_age: { evaluated: number; count: number; rate: number; threshold: number };
}
interface Finance {
    billed: number; collected: number; remaining: number; recovery_rate: number;
    total_invoices: number; paid_count: number; partial_count: number; unpaid_count: number;
    by_class: { name: string; cycle: string; billed: number; collected: number; remaining: number; rate: number }[];
    by_method: { method: string; total: number; count: number }[];
    monthly: { month: string; total: number }[];
}
interface Success {
    bulletins: number; moyenne_generale: number | null; pass_rate: number;
    mentions: { passable: number; assez_bien: number; bien: number; tres_bien: number };
    exams: { name: string; type: string; center: string | null; registered: number; admitted: number; failed: number; absent: number; admission_rate: number; presentation_rate: number }[];
    exams_summary: { registered: number; admitted: number; admission_rate: number };
}
interface Resources {
    total_students: number; total_teachers: number; rem: number | null;
    class_count: number; avg_class_size: number; threshold: number;
    overcrowded: { name: string; total: number }[];
    class_sizes: { name: string; total: number }[];
}
interface Attendance {
    total: number; present: number; absent: number; late: number; excused: number;
    presence_rate: number; absence_rate: number; late_rate: number;
    chronic_absentees: number; chronic_threshold: number;
    by_period: { name: string; present: number; absent: number; late: number }[];
    by_class: { name: string; absence_rate: number }[];
}
interface TrendPoint { year: string; effectif: number; part_filles: number; redoublement: number; abandon: number; recouvrement: number; reussite: number; admission: number }
interface Trends { series: TrendPoint[] }
interface Geography {
    total: number; localized: number; coverage: number;
    by_region: { name: string; total: number }[];
    by_prefecture: { name: string; region: string; total: number }[];
}
interface Props {
    filters: Filters;
    academicYears: YearOption[];
    classes: ClassOption[];
    enrollment: Enrollment;
    finance: Finance;
    success: Success;
    resources: Resources;
    attendance: Attendance;
    trends: Trends;
    geography: Geography;
}

/* ---------------- Helpers ---------------- */
function Kpi({ label, value, sub, icon: Icon, tone }: { label: string; value: string | number; sub?: string; icon: React.ElementType; tone: string }) {
    return (
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                    <p className={`text-2xl font-bold mt-1.5 ${tone}`}>{value}</p>
                    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
                </div>
                <div className={`rounded-lg p-2 ${tone.replace('text-', 'bg-').replace('600', '50')} dark:bg-gray-700`}>
                    <Icon className={`w-6 h-6 ${tone}`} />
                </div>
            </div>
        </div>
    );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4"><span className="text-gray-400">{icon}</span><h2 className="font-semibold text-sm text-gray-900 dark:text-white">{title}</h2></div>
            {children}
        </div>
    );
}

/** Contraste : texte blanc sur fond foncé, encre sombre sur fond clair. */
function isDarkHex(hex: string): boolean {
    const c = hex.replace('#', '');
    if (c.length < 6) return false;
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

/**
 * Nœud du treemap géographique. Chaque région porte sa propre teinte (identité),
 * la préfecture en reçoit une nuance selon son effectif (magnitude). Position,
 * libellés et légende des régions restent des encodages secondaires qui
 * sécurisent la lecture. Les couleurs finales sont précalculées en amont et
 * passées par les tables `regionColor` / `prefColor`.
 */
function TreemapNode(props: {
    x?: number; y?: number; width?: number; height?: number; depth?: number; name?: string; value?: number;
    surface?: string; regionColor?: Record<string, string>; prefColor?: Record<string, string>;
}) {
    const { x = 0, y = 0, width = 0, height = 0, depth = 0, name = '', value = 0 } = props;
    const surface = props.surface ?? '#ffffff';

    // Racine : ne rien peindre, sinon un grand rectangle recouvrirait tout le treemap.
    if (depth === 0) {
        return <g />;
    }

    // Région : liseré de sa couleur, pour regrouper visuellement ses préfectures.
    if (depth === 1) {
        const accent = props.regionColor?.[name] ?? '#94a3b8';
        return <rect x={x} y={y} width={width} height={height} fill="none" stroke={accent} strokeWidth={2.5} rx={2} />;
    }

    const fill = props.prefColor?.[name] ?? '#94a3b8';
    const onDark = isDarkHex(fill);
    const label = name.length > 15 ? `${name.slice(0, 14)}…` : name;

    return (
        <g>
            <rect x={x} y={y} width={width} height={height} fill={fill} stroke={surface} strokeWidth={1.5} rx={2} />
            {width > 46 && height > 26 && (
                <>
                    <text x={x + 5} y={y + 15} fontSize={11} fontWeight={400} fill={onDark ? '#ffffff' : '#1f2937'}>{label}</text>
                    <text x={x + 5} y={y + 28} fontSize={10} fontWeight={400} fill={onDark ? 'rgba(255,255,255,0.9)' : 'rgba(31,41,55,0.75)'}>{value}</text>
                </>
            )}
        </g>
    );
}

/* ---------------- Page ---------------- */
type Tab = 'effectifs' | 'finances' | 'reussite' | 'encadrement' | 'assiduite' | 'comparaisons' | 'geographie';

export default function StatisticsIndex({ filters, academicYears, classes, enrollment, finance, success, resources, attendance, trends, geography }: Readonly<Props>) {
    const { t } = useTranslation();
    const theme = useChartTheme();
    const [BLUE, ORANGE, GREEN, VIOLET] = theme.series;

    const breadcrumbs: BreadcrumbItem[] = [{ title: t('statistiques.title'), href: '/statistiques' }];
    const methodLabel: Record<string, string> = {
        CASH: t('statistiques.method_cash'),
        MOBILE_MONEY: t('statistiques.method_mobile_money'),
        BANK_TRANSFER: t('statistiques.method_bank_transfer'),
        CHEQUE: t('statistiques.method_cheque'),
    };

    // La couleur est portée par la catégorie elle-même : filtrer une catégorie
    // vide ne doit jamais repeindre les autres.
    const genderData = [
        { name: t('statistiques.boys'), value: enrollment.gender.male, color: BLUE },
        { name: t('statistiques.girls'), value: enrollment.gender.female, color: ORANGE },
        { name: t('statistiques.other'), value: enrollment.gender.other, color: GREEN },
    ].filter((d) => d.value > 0);

    // Donnée ordonnée (Passable → Très bien) : rampe séquentielle, pas des teintes sans rapport.
    const mentionData = [
        { name: t('statistiques.mention_passable'), value: success.mentions.passable },
        { name: t('statistiques.mention_assez_bien'), value: success.mentions.assez_bien },
        { name: t('statistiques.mention_bien'), value: success.mentions.bien },
        { name: t('statistiques.mention_tres_bien'), value: success.mentions.tres_bien },
    ].map((d, i) => ({ ...d, color: theme.sequential[i] })).filter((d) => d.value > 0);
    const money = useMoney();
    const [tab, setTab] = useState<Tab>('effectifs');

    const setFilter = (key: keyof Filters, value: string) => {
        router.get(route('statistics.index'), {
            ...filters,
            [key]: value === 'all' ? '' : value,
        }, { preserveScroll: true, preserveState: false, replace: true });
    };

    const exportUrl = (section: Tab, format: 'pdf' | 'xlsx') => {
        const q = new URLSearchParams();
        if (filters.academic_year_id) q.set('academic_year_id', filters.academic_year_id);
        if (filters.class_id) q.set('class_id', filters.class_id);
        if (filters.gender) q.set('gender', filters.gender);
        return `/statistiques/${section}/export/${format}?${q.toString()}`;
    };

    const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
        { key: 'effectifs', label: t('statistiques.tab_effectifs'), icon: Users },
        { key: 'finances', label: t('statistiques.tab_finances'), icon: Wallet },
        { key: 'reussite', label: t('statistiques.tab_reussite'), icon: GraduationCap },
        { key: 'encadrement', label: t('statistiques.tab_encadrement'), icon: School },
        { key: 'assiduite', label: t('statistiques.tab_assiduite'), icon: UserCheck },
        { key: 'comparaisons', label: t('statistiques.tab_comparaisons'), icon: TrendingUp },
        { key: 'geographie', label: t('statistiques.tab_geographie'), icon: MapPin },
    ];

    /* ---- Effectifs & parité : filtre par cycle sur les classes, pyramide des âges. ---- */
    const effCycles = [...new Set(enrollment.by_class.map((c) => c.cycle))];
    const [effCycle, setEffCycle] = useState<string>('Tous');
    const [effSort, setEffSort] = useState<'niveau' | 'effectif'>('niveau');
    const effClasses = (() => {
        const f = enrollment.by_class.filter((c) => effCycle === 'Tous' || c.cycle === effCycle);
        return effSort === 'effectif' ? [...f].sort((a, b) => b.total - a.total) : f;
    })();
    // Pyramide des âges par sexe : garçons à gauche (valeurs négatives), filles à droite.
    const agePyramid = enrollment.age_distribution.map((d) => ({ age: d.age, male: -d.male, female: d.female }));
    const ageAxisMax = Math.max(1, ...enrollment.age_distribution.map((d) => Math.max(d.male, d.female)));

    /* ---- Finances : recouvrement par classe, filtrable par cycle. ---- */
    const finCycles = [...new Set(finance.by_class.map((c) => c.cycle))];
    const [finCycle, setFinCycle] = useState<string>('Tous');
    const [finSort, setFinSort] = useState<'facture' | 'taux'>('facture');
    const finClasses = (() => {
        const f = finance.by_class.filter((c) => finCycle === 'Tous' || c.cycle === finCycle);
        // Tri par taux = les classes en retard d'abord (croissant) ; par montant = les plus grosses d'abord.
        return finSort === 'taux' ? [...f].sort((a, b) => a.rate - b.rate) : [...f].sort((a, b) => b.billed - a.billed);
    })();
    // Couleur du taux par palier (statut, toujours accompagné du chiffre).
    const rateColor = (r: number) => (r >= 80 ? '#16a34a' : r >= 60 ? '#d97706' : '#dc2626');
    const finChartHeight = Math.max(220, finClasses.length * 24 + 28);

    /* ---- Comparaisons : l'année active est en cours, ses taux de fin d'année
       (redoublement, abandon, admission) ne sont pas encore décidés. On les met à
       null pour que les courbes s'arrêtent au lieu de plonger à zéro. ---- */
    const activeYearLabel = academicYears.find((y) => y.active)?.year;
    type TrendKey = 'effectif' | 'part_filles' | 'redoublement' | 'abandon' | 'recouvrement' | 'reussite' | 'admission';
    const endOfYearKeys: TrendKey[] = ['redoublement', 'abandon', 'admission'];
    const trendSeries = trends.series.map((p) => {
        const inProgress = p.year === activeYearLabel;
        return {
            ...p,
            redoublement: inProgress ? null : p.redoublement,
            abandon: inProgress ? null : p.abandon,
            admission: inProgress ? null : p.admission,
        } as Record<string, number | string | null>;
    });
    // Dernier point renseigné vs le précédent, par métrique (les taux de fin
    // d'année sautent l'année en cours ; les autres non).
    const metricDelta = (key: TrendKey) => {
        const pts = trendSeries.filter((p) => p[key] != null);
        const cur = pts[pts.length - 1];
        const prv = pts[pts.length - 2];
        if (!cur) return null;
        const value = cur[key] as number;
        const delta = prv ? Math.round((value - (prv[key] as number)) * 10) / 10 : null;
        return { year: cur.year as string, value, delta };
    };
    const isPct = (k: TrendKey) => k !== 'effectif';
    const trendKpis: { key: TrendKey; label: string; higherIsBetter: boolean }[] = [
        { key: 'effectif', label: t('statistiques.kpi_effectif'), higherIsBetter: true },
        { key: 'reussite', label: t('statistiques.kpi_reussite'), higherIsBetter: true },
        { key: 'recouvrement', label: t('statistiques.kpi_recouvrement'), higherIsBetter: true },
        { key: 'abandon', label: t('statistiques.kpi_abandon_short'), higherIsBetter: false },
    ];

    /* ---- Géographie : concentration et hiérarchie région → préfecture. ---- */
    const grandLomeNames = ['Golfe', 'Agoè-Nyivé'];
    const grandLomeTotal = geography.by_prefecture.filter((p) => grandLomeNames.includes(p.name)).reduce((s, p) => s + p.total, 0);
    const grandLomeShare = geography.localized > 0 ? Math.round((grandLomeTotal / geography.localized) * 1000) / 10 : 0;

    // Une teinte par région (identité), déclinée en trois nuances selon l'effectif
    // de la préfecture (magnitude). Le nom de région porte l'identité ; la position
    // et la légende sécurisent la lecture, donc des couleurs distinctes sont sûres.
    // Teintes soutenues (validées : contraste >= 3:1 sur fond clair et sombre, et
    // séparation daltonienne dans la bande autorisée avec encodage secondaire).
    const regionFamilies: Record<string, [string, string, string]> = {
        Maritime: ['#60a5fa', '#2563eb', '#1e40af'], // bleu
        Plateaux: ['#4ade80', '#16a34a', '#166534'], // vert
        Centrale: ['#fbbf24', '#d97706', '#92400e'], // ambre
        Kara: ['#a78bfa', '#7c3aed', '#5b21b6'],     // violet
        Savanes: ['#f472b6', '#db2777', '#9d174d'],  // rose
    };
    const fallbackFamily: [string, string, string] = ['#cbd5e1', '#64748b', '#334155'];
    const regionColor: Record<string, string> = {};
    const prefColor: Record<string, string> = {};
    geography.by_region.forEach((r) => {
        const fam = regionFamilies[r.name] ?? fallbackFamily;
        regionColor[r.name] = fam[1];
        const prefs = geography.by_prefecture.filter((p) => p.region === r.name);
        const regionMax = prefs.reduce((m, p) => Math.max(m, p.total), 0) || 1;
        prefs.forEach((p) => {
            const idx = Math.min(2, Math.max(0, Math.round((p.total / regionMax) * 2)));
            prefColor[p.name] = fam[idx];
        });
    });
    const treemapData = geography.by_region
        .map((r) => ({
            name: r.name,
            children: geography.by_prefecture.filter((p) => p.region === r.name).map((p) => ({ name: p.name, size: p.total })),
        }))
        .filter((r) => r.children.length > 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('statistiques.title')} />
            <div className="space-y-6 p-1">
                {/* En-tête + filtres */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <BarChart3 className="h-7 w-7 text-blue-600 shrink-0" /> {t('statistiques.title')}
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">{t('statistiques.subtitle')}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={filters.academic_year_id ?? ''} onValueChange={(v) => setFilter('academic_year_id', v)}>
                            <SelectTrigger className="w-40 bg-white dark:bg-card"><SelectValue placeholder={t('statistiques.year_ph')} /></SelectTrigger>
                            <SelectContent>{academicYears.map((y) => <SelectItem key={y.id} value={y.id}>{y.year}{y.active ? t('statistiques.active_suffix') : ''}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={filters.class_id ?? 'all'} onValueChange={(v) => setFilter('class_id', v)}>
                            <SelectTrigger className="w-40 bg-white dark:bg-card"><SelectValue placeholder={t('statistiques.class_ph')} /></SelectTrigger>
                            <SelectContent><SelectItem value="all">{t('statistiques.all_classes')}</SelectItem>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={filters.gender ?? 'all'} onValueChange={(v) => setFilter('gender', v)}>
                            <SelectTrigger className="w-32 bg-white dark:bg-card"><SelectValue placeholder={t('statistiques.gender_ph')} /></SelectTrigger>
                            <SelectContent><SelectItem value="all">{t('statistiques.all')}</SelectItem><SelectItem value="male">{t('statistiques.boys')}</SelectItem><SelectItem value="female">{t('statistiques.girls')}</SelectItem></SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Onglets + export */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex gap-1">
                        {tabs.map((t) => (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                                <t.icon className="w-4 h-4" /> {t.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 pb-2">
                        <a href={exportUrl(tab, 'pdf')}><Button variant="outline" size="sm" className="gap-1.5 text-xs"><Download className="w-3.5 h-3.5" /> PDF</Button></a>
                        <a href={exportUrl(tab, 'xlsx')}><Button variant="outline" size="sm" className="gap-1.5 text-xs"><FileSpreadsheet className="w-3.5 h-3.5" /> Excel</Button></a>
                    </div>
                </div>

                {/* ---- Effectifs & parité ---- */}
                {tab === 'effectifs' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <Kpi label={t('statistiques.kpi_total')} value={enrollment.total} sub={t('statistiques.kpi_total_sub', { boys: enrollment.gender.male, girls: enrollment.gender.female })} icon={Users} tone="text-blue-600" />
                            <Kpi label={t('statistiques.kpi_ips')} value={enrollment.ips ?? '—'} sub={t('statistiques.kpi_ips_sub', { pct: enrollment.part_filles })} icon={PieIcon} tone="text-pink-600" />
                            <Kpi label={t('statistiques.kpi_redoublement')} value={`${enrollment.rates.redoublement}%`} sub={t('statistiques.kpi_promotion_sub', { pct: enrollment.rates.promotion })} icon={TrendingUp} tone="text-orange-600" />
                            <Kpi label={t('statistiques.kpi_abandon')} value={`${enrollment.rates.abandon}%`} sub={t('statistiques.kpi_age_sub', { age: enrollment.age_moyen ?? '—' })} icon={GraduationCap} tone="text-red-600" />
                        </div>
                        <div className="grid lg:grid-cols-3 gap-5">
                            <div className="lg:col-span-2"><Card title={t('statistiques.card_by_class')} icon={<Users className="w-4 h-4" />}>
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    {['Tous', ...effCycles].map((c) => (
                                        <button key={c} type="button" onClick={() => setEffCycle(c)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${effCycle === c ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                                            {c === 'Tous' ? t('statistiques.all_cycles') : c}
                                        </button>
                                    ))}
                                    <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                                        <span className="mr-1">{t('statistiques.sort')}</span>
                                        {(['niveau', 'effectif'] as const).map((s) => (
                                            <button key={s} type="button" onClick={() => setEffSort(s)}
                                                className={`px-2 py-1 rounded-md transition-colors ${effSort === s ? 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                                {s === 'niveau' ? t('statistiques.sort_level') : t('statistiques.sort_headcount')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={effClasses} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: theme.tick }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={62} />
                                        <YAxis tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                                        <RTooltip contentStyle={theme.tooltip.contentStyle} itemStyle={theme.tooltip.itemStyle} />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        <Bar dataKey="male" name={t('statistiques.boys')} stackId="a" fill={BLUE} maxBarSize={44} />
                                        <Bar dataKey="female" name={t('statistiques.girls')} stackId="a" fill={ORANGE} radius={[4, 4, 0, 0]} maxBarSize={44} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card></div>
                            <Card title={t('statistiques.card_by_gender')} icon={<PieIcon className="w-4 h-4" />}>
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie isAnimationActive={false} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}
                                            data={genderData}>
                                            {genderData.map((d) => <Cell key={d.name} fill={d.color} />)}
                                        </Pie>
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <RTooltip contentStyle={theme.tooltip.contentStyle} itemStyle={theme.tooltip.itemStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Card>
                        </div>
                        <div className="grid lg:grid-cols-2 gap-5">
                            <Card title={t('statistiques.card_age_pyramid')} icon={<BarChart3 className="w-4 h-4" />}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart layout="vertical" data={agePyramid} stackOffset="sign" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={false} />
                                        <XAxis type="number" domain={[-ageAxisMax, ageAxisMax]} tickFormatter={(v) => `${Math.abs(Number(v))}`} tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <YAxis type="category" dataKey="age" reversed tick={{ fontSize: 11, fill: theme.axis }} axisLine={false} tickLine={false} width={28} />
                                        <RTooltip contentStyle={theme.tooltip.contentStyle} itemStyle={theme.tooltip.itemStyle} formatter={(v, n) => [Math.abs(Number(v)), n]} labelFormatter={(l) => t('statistiques.years_old', { value: l })} />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        <Bar dataKey="male" name={t('statistiques.boys')} stackId="pyr" fill={BLUE} maxBarSize={18} />
                                        <Bar dataKey="female" name={t('statistiques.girls')} stackId="pyr" fill={ORANGE} maxBarSize={18} />
                                    </BarChart>
                                </ResponsiveContainer>
                                <div className="mt-3 flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm">
                                    <span className="text-amber-700 dark:text-amber-300">{t('statistiques.overage_label', { threshold: enrollment.over_age.threshold })}</span>
                                    <span className="font-bold text-amber-700 dark:text-amber-300">
                                        {enrollment.over_age.evaluated === 0 ? '—' : `${enrollment.over_age.rate}%`}
                                        {enrollment.over_age.evaluated > 0 && <span className="text-xs font-normal ml-1">({enrollment.over_age.count}/{enrollment.over_age.evaluated})</span>}
                                    </span>
                                </div>
                                {enrollment.over_age.evaluated === 0 && <p className="text-xs text-gray-400 mt-1.5">{t('statistiques.overage_hint')}</p>}
                            </Card>
                            <Card title={t('statistiques.card_city')} icon={<Users className="w-4 h-4" />}>
                                {enrollment.by_city.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">{t('statistiques.not_filled')}</p> : (
                                    <ResponsiveContainer width="100%" height={Math.max(220, enrollment.by_city.length * 28 + 24)}>
                                        <BarChart layout="vertical" data={enrollment.by_city} margin={{ top: 4, right: 28, left: 8, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={false} />
                                            <XAxis type="number" tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} allowDecimals={false} />
                                            <YAxis type="category" dataKey="city" width={92} tick={{ fontSize: 11, fill: theme.axis }} axisLine={false} tickLine={false} />
                                            <RTooltip contentStyle={theme.tooltip.contentStyle} itemStyle={theme.tooltip.itemStyle} />
                                            <Legend wrapperStyle={{ fontSize: 11 }} />
                                            <Bar dataKey="male" name={t('statistiques.boys')} stackId="c" fill={BLUE} maxBarSize={20} />
                                            <Bar dataKey="female" name={t('statistiques.girls')} stackId="c" fill={ORANGE} radius={[0, 4, 4, 0]} maxBarSize={20}>
                                                <LabelList dataKey="total" position="right" style={{ fontSize: 11, fill: theme.tick }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </Card>
                        </div>
                    </div>
                )}

                {/* ---- Finances ---- */}
                {tab === 'finances' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <Kpi label={t('statistiques.kpi_billed')} value={money(finance.billed)} sub={t('statistiques.kpi_billed_sub', { count: finance.total_invoices })} icon={Wallet} tone="text-blue-600" />
                            <Kpi label={t('statistiques.kpi_collected')} value={money(finance.collected)} icon={TrendingUp} tone="text-green-600" />
                            <Kpi label={t('statistiques.kpi_recovery')} value={`${finance.recovery_rate}%`} sub={t('statistiques.kpi_remaining_sub', { amount: money(finance.remaining) })} icon={PieIcon} tone="text-orange-600" />
                            <Kpi label={t('statistiques.kpi_unpaid')} value={finance.unpaid_count} sub={t('statistiques.kpi_unpaid_sub', { count: finance.partial_count })} icon={GraduationCap} tone="text-red-600" />
                        </div>
                        <div className="grid lg:grid-cols-3 gap-5">
                            <div className="lg:col-span-2"><Card title={t('statistiques.card_monthly')} icon={<TrendingUp className="w-4 h-4" />}>
                                <ResponsiveContainer width="100%" height={240}>
                                    <AreaChart data={finance.monthly}>
                                        <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={BLUE} stopOpacity={0.35} /><stop offset="95%" stopColor={BLUE} stopOpacity={0} /></linearGradient></defs>
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} />
                                        <RTooltip formatter={(v) => money(Number(v))} />
                                        <Area type="monotone" dataKey="total" stroke={BLUE} strokeWidth={2} fill="url(#g)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Card></div>
                            <Card title={t('statistiques.card_methods')} icon={<PieIcon className="w-4 h-4" />}>
                                {/* Comparer des montants par catégorie est une magnitude, pas une identité :
                                    des barres étiquetées en une seule teinte se lisent mieux qu'un camembert,
                                    et l'identité ne repose plus sur la couleur. */}
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart layout="vertical" data={finance.by_method.map((m) => ({ ...m, method: methodLabel[m.method] ?? m.method }))}
                                        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={false} />
                                        <XAxis type="number" tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false}
                                            tickFormatter={(v) => (Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v))} />
                                        <YAxis type="category" dataKey="method" width={96} tick={{ fontSize: 12, fill: theme.axis }} axisLine={false} tickLine={false} />
                                        <RTooltip formatter={(v) => money(Number(v))} contentStyle={theme.tooltip.contentStyle} itemStyle={theme.tooltip.itemStyle} />
                                        <Bar dataKey="total" fill={BLUE} radius={[0, 4, 4, 0]} maxBarSize={26} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        </div>
                        {/* Recouvrement par classe — filtrable, plusieurs situations */}
                        <div className="space-y-5">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white mr-2 flex items-center gap-2"><Wallet className="w-4 h-4 text-gray-400" /> {t('statistiques.recovery_by_class')}</span>
                                {['Tous', ...finCycles].map((c) => (
                                    <button key={c} type="button" onClick={() => setFinCycle(c)}
                                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${finCycle === c ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                                        {c === 'Tous' ? t('statistiques.all_cycles') : c}
                                    </button>
                                ))}
                                <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                                    <span className="mr-1">{t('statistiques.sort')}</span>
                                    {(['facture', 'taux'] as const).map((s) => (
                                        <button key={s} type="button" onClick={() => setFinSort(s)}
                                            className={`px-2 py-1 rounded-md transition-colors ${finSort === s ? 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                            {s === 'facture' ? t('statistiques.sort_amount') : t('statistiques.sort_rate')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid lg:grid-cols-2 gap-5">
                                <Card title={t('statistiques.card_billed_split')} icon={<Wallet className="w-4 h-4" />}>
                                    <ResponsiveContainer width="100%" height={finChartHeight}>
                                        <BarChart layout="vertical" data={finClasses} margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={false} />
                                            <XAxis type="number" tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} tickFormatter={(v) => (Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v))} />
                                            <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11, fill: theme.axis }} axisLine={false} tickLine={false} />
                                            <RTooltip contentStyle={theme.tooltip.contentStyle} itemStyle={theme.tooltip.itemStyle} formatter={(v, n) => [money(Number(v)), n]} />
                                            <Legend wrapperStyle={{ fontSize: 11 }} />
                                            <Bar dataKey="collected" name={t('statistiques.series_collected')} stackId="m" fill={GREEN} maxBarSize={20} />
                                            <Bar dataKey="remaining" name={t('statistiques.series_remaining')} stackId="m" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Card>
                                <Card title={t('statistiques.card_recovery_rate')} icon={<TrendingUp className="w-4 h-4" />}>
                                    <ResponsiveContainer width="100%" height={finChartHeight}>
                                        <BarChart layout="vertical" data={finClasses} margin={{ top: 4, right: 36, left: 8, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={false} />
                                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                                            <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11, fill: theme.axis }} axisLine={false} tickLine={false} />
                                            <RTooltip contentStyle={theme.tooltip.contentStyle} itemStyle={theme.tooltip.itemStyle} formatter={(v) => [`${v}%`, t('statistiques.rate_label')]} />
                                            <ReferenceLine x={finance.recovery_rate} stroke={theme.axis} strokeDasharray="4 3" label={{ value: t('statistiques.avg_prefix', { rate: finance.recovery_rate }), fontSize: 10, fill: theme.tick, position: 'top' }} />
                                            <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={20}>
                                                {finClasses.map((c) => <Cell key={c.name} fill={rateColor(c.rate)} />)}
                                                <LabelList dataKey="rate" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 10, fill: theme.tick }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#16a34a' }} /> {t('statistiques.legend_high')}</span>
                                        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#d97706' }} /> {t('statistiques.legend_mid')}</span>
                                        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#dc2626' }} /> {t('statistiques.legend_low')}</span>
                                    </div>
                                </Card>
                            </div>

                            <Card title={t('statistiques.card_detail')} icon={<BarChart3 className="w-4 h-4" />}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead><tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100 dark:border-gray-700">
                                            <th className="py-2">{t('statistiques.th_class')}</th><th className="py-2 text-right">{t('statistiques.th_billed')}</th><th className="py-2 text-right">{t('statistiques.th_collected')}</th><th className="py-2 text-right">{t('statistiques.th_remaining')}</th><th className="py-2 text-right">{t('statistiques.th_rate')}</th></tr></thead>
                                        <tbody>{finClasses.map((c) => (
                                            <tr key={c.name} className="border-b border-gray-50 dark:border-gray-700/50">
                                                <td className="py-2">{c.name}</td>
                                                <td className="py-2 text-right">{money(c.billed)}</td>
                                                <td className="py-2 text-right text-green-600">{money(c.collected)}</td>
                                                <td className="py-2 text-right text-amber-600">{money(c.remaining)}</td>
                                                <td className="py-2 text-right font-semibold" style={{ color: rateColor(c.rate) }}>{c.rate}%</td>
                                            </tr>))}</tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* ---- Réussite ---- */}
                {tab === 'reussite' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <Kpi label={t('statistiques.kpi_bulletins')} value={success.bulletins} icon={GraduationCap} tone="text-blue-600" />
                            <Kpi label={t('statistiques.kpi_average')} value={success.moyenne_generale ?? '—'} icon={BarChart3} tone="text-violet-600" />
                            <Kpi label={t('statistiques.kpi_passrate')} value={`${success.pass_rate}%`} icon={TrendingUp} tone="text-green-600" />
                            <Kpi label={t('statistiques.kpi_admission')} value={`${success.exams_summary.admission_rate}%`} sub={`${success.exams_summary.admitted}/${success.exams_summary.registered}`} icon={PieIcon} tone="text-orange-600" />
                        </div>
                        <div className="grid lg:grid-cols-3 gap-5">
                            <Card title={t('statistiques.card_mentions')} icon={<PieIcon className="w-4 h-4" />}>
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie isAnimationActive={false} dataKey="value" nameKey="name" innerRadius={50} outerRadius={88} paddingAngle={2} data={mentionData}>
                                            {mentionData.map((d) => <Cell key={d.name} fill={d.color} />)}
                                        </Pie>
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <RTooltip contentStyle={theme.tooltip.contentStyle} itemStyle={theme.tooltip.itemStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Card>
                            <div className="lg:col-span-2"><Card title={t('statistiques.card_exams')} icon={<GraduationCap className="w-4 h-4" />}>
                                {success.exams.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">{t('statistiques.no_exams')}</p> : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead><tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100 dark:border-gray-700">
                                                <th className="py-2">{t('statistiques.th_exam')}</th><th className="py-2 text-right">{t('statistiques.th_registered')}</th><th className="py-2 text-right">{t('statistiques.th_admitted')}</th><th className="py-2 text-right">{t('statistiques.th_admission')}</th></tr></thead>
                                            <tbody>{success.exams.map((e, i) => (
                                                <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50">
                                                    <td className="py-2"><span className="uppercase text-blue-600 font-bold mr-1.5">{e.type}</span>{e.name}</td>
                                                    <td className="py-2 text-right">{e.registered}</td><td className="py-2 text-right text-green-600">{e.admitted}</td>
                                                    <td className="py-2 text-right font-semibold">{e.admission_rate}%</td>
                                                </tr>))}</tbody>
                                        </table>
                                    </div>
                                )}
                            </Card></div>
                        </div>
                    </div>
                )}

                {/* ---- Encadrement ---- */}
                {tab === 'encadrement' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <Kpi label={t('statistiques.kpi_rem')} value={resources.rem ?? '—'} sub={t('statistiques.kpi_rem_sub', { count: resources.total_teachers })} icon={GraduationCap} tone="text-blue-600" />
                            <Kpi label={t('statistiques.kpi_students')} value={resources.total_students} icon={Users} tone="text-violet-600" />
                            <Kpi label={t('statistiques.kpi_avg_class')} value={resources.avg_class_size} sub={t('statistiques.kpi_avg_class_sub', { count: resources.class_count })} icon={Layers} tone="text-green-600" />
                            <Kpi label={t('statistiques.kpi_overcrowded')} value={resources.overcrowded.length} sub={t('statistiques.kpi_overcrowded_sub', { threshold: resources.threshold })} icon={School} tone="text-orange-600" />
                        </div>
                        <Card title={t('statistiques.card_class_sizes')} icon={<Layers className="w-4 h-4" />}>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={resources.class_sizes}>
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                                    <YAxis tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                                    <RTooltip />
                                    <Bar dataKey="total" name={t('statistiques.series_students')} radius={[4, 4, 0, 0]}>
                                        {resources.class_sizes.map((c, i) => <Cell key={i} fill={c.total > resources.threshold ? ORANGE : BLUE} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                        {resources.overcrowded.length > 0 && (
                            <Card title={t('statistiques.card_overcrowded')} icon={<School className="w-4 h-4" />}>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {resources.overcrowded.map((c) => (
                                        <div key={c.name} className="flex items-center justify-between rounded-lg bg-orange-50 dark:bg-orange-900/20 px-4 py-2.5">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.name}</span>
                                            <span className="text-sm font-bold text-orange-600">{t('statistiques.students_count', { count: c.total })}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>
                )}

                {/* ---- Assiduité ---- */}
                {tab === 'assiduite' && (
                    <div className="space-y-6">
                        {attendance.total === 0 ? (
                            <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-card p-12 text-center text-gray-400">
                                {t('statistiques.no_attendance')}
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Kpi label={t('statistiques.kpi_presence')} value={`${attendance.presence_rate}%`} sub={t('statistiques.kpi_presence_sub', { count: attendance.present })} icon={UserCheck} tone="text-green-600" />
                                    <Kpi label={t('statistiques.kpi_absence')} value={`${attendance.absence_rate}%`} sub={t('statistiques.kpi_absence_sub', { count: attendance.absent })} icon={TrendingUp} tone="text-red-600" />
                                    <Kpi label={t('statistiques.kpi_late')} value={`${attendance.late_rate}%`} sub={t('statistiques.kpi_late_sub', { count: attendance.late })} icon={BarChart3} tone="text-orange-600" />
                                    <Kpi label={t('statistiques.kpi_chronic')} value={attendance.chronic_absentees} sub={t('statistiques.kpi_chronic_sub', { threshold: attendance.chronic_threshold })} icon={Users} tone="text-violet-600" />
                                </div>
                                <div className="grid lg:grid-cols-2 gap-5">
                                    <Card title={t('statistiques.card_by_period')} icon={<UserCheck className="w-4 h-4" />}>
                                        <ResponsiveContainer width="100%" height={260}>
                                            <BarChart data={attendance.by_period}>
                                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                                                <RTooltip />
                                                <Bar dataKey="present" name={t('statistiques.series_present')} stackId="a" fill={GREEN} />
                                                <Bar dataKey="absent" name={t('statistiques.series_absent')} stackId="a" fill="#ef4444" />
                                                <Bar dataKey="late" name={t('statistiques.series_late')} stackId="a" fill={ORANGE} radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Card>
                                    <Card title={t('statistiques.card_absence_by_class')} icon={<BarChart3 className="w-4 h-4" />}>
                                        {attendance.by_class.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">—</p> : (
                                            <div className="space-y-2.5">
                                                {attendance.by_class.slice(0, 8).map((c) => (
                                                    <div key={c.name}>
                                                        <div className="flex items-center justify-between text-sm mb-1">
                                                            <span className="text-gray-700 dark:text-gray-300">{c.name}</span>
                                                            <span className="font-semibold">{c.absence_rate}%</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${c.absence_rate >= 20 ? 'bg-red-400' : c.absence_rate >= 10 ? 'bg-orange-400' : 'bg-green-500'}`} style={{ width: `${Math.min(100, c.absence_rate)}%` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ---- Comparaisons pluriannuelles ---- */}
                {tab === 'comparaisons' && (
                    <div className="space-y-6">
                        {trends.series.length < 2 ? (
                            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm px-4 py-3">
                                {t('statistiques.need_two_years')}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {trendKpis.map(({ key, label, higherIsBetter }) => {
                                    const d = metricDelta(key);
                                    if (!d) return null;
                                    const up = d.delta != null && d.delta > 0;
                                    const good = d.delta == null ? null : up === higherIsBetter;
                                    const deltaColor = good == null ? 'text-gray-400' : good ? 'text-emerald-600' : 'text-red-500';
                                    return (
                                        <div key={key} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-card p-4 shadow-sm">
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                                            <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                                                {isPct(key) ? `${d.value}%` : d.value}
                                            </p>
                                            <p className="text-xs mt-1 flex items-center gap-1">
                                                {d.delta == null ? (
                                                    <span className="text-gray-400">—</span>
                                                ) : (
                                                    <span className={`font-semibold ${deltaColor}`}>
                                                        {up ? '↑' : d.delta < 0 ? '↓' : '='} {d.delta > 0 ? '+' : ''}{d.delta}{isPct(key) ? ' pts' : ''}
                                                    </span>
                                                )}
                                                <span className="text-gray-400">· {d.year}</span>
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="grid lg:grid-cols-2 gap-5">
                            <Card title={t('statistiques.card_effectif_evol')} icon={<Users className="w-4 h-4" />}>
                                <ResponsiveContainer width="100%" height={260}>
                                    <AreaChart data={trends.series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={BLUE} stopOpacity={0.28} />
                                                <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
                                        <XAxis dataKey="year" tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                                        <RTooltip contentStyle={theme.tooltip.contentStyle} itemStyle={theme.tooltip.itemStyle} />
                                        <Area type="monotone" dataKey="effectif" name={t('statistiques.series_effectif')} stroke={BLUE} strokeWidth={2.5} fill="url(#effGrad)" dot={{ r: 3, fill: BLUE }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Card>
                            <Card title={t('statistiques.card_performance')} icon={<TrendingUp className="w-4 h-4" />}>
                                <ResponsiveContainer width="100%" height={260}>
                                    <LineChart data={trends.series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
                                        <XAxis dataKey="year" tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} width={36} domain={[0, 100]} />
                                        <RTooltip contentStyle={theme.tooltip.contentStyle} itemStyle={theme.tooltip.itemStyle} formatter={(v) => `${v}%`} />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        <Line type="monotone" dataKey="reussite" name={t('statistiques.series_reussite')} stroke={GREEN} strokeWidth={2.5} dot={{ r: 3, fill: GREEN }} />
                                        <Line type="monotone" dataKey="recouvrement" name={t('statistiques.series_recouvrement')} stroke={BLUE} strokeWidth={2.5} dot={{ r: 3, fill: BLUE }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Card>
                        </div>

                        <Card title={t('statistiques.card_deperdition')} icon={<TrendingUp className="w-4 h-4" />}>
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={trendSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
                                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} width={36} />
                                    <RTooltip contentStyle={theme.tooltip.contentStyle} itemStyle={theme.tooltip.itemStyle} formatter={(v) => `${v}%`} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Line type="monotone" dataKey="redoublement" name={t('statistiques.series_redoublement')} stroke={ORANGE} strokeWidth={2.5} dot={{ r: 3, fill: ORANGE }} connectNulls={false} />
                                    <Line type="monotone" dataKey="abandon" name={t('statistiques.series_abandon')} stroke={VIOLET} strokeWidth={2.5} dot={{ r: 3, fill: VIOLET }} connectNulls={false} />
                                </LineChart>
                            </ResponsiveContainer>
                            <p className="text-xs text-gray-400 mt-2">{t('statistiques.deperdition_hint')}</p>
                        </Card>

                        <Card title={t('statistiques.card_comparison')} icon={<BarChart3 className="w-4 h-4" />}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100 dark:border-gray-700">
                                        <th className="py-2">{t('statistiques.th_year')}</th><th className="py-2 text-right">{t('statistiques.th_effectif')}</th><th className="py-2 text-right">{t('statistiques.th_girls_pct')}</th>
                                        <th className="py-2 text-right">{t('statistiques.th_redoubl')}</th><th className="py-2 text-right">{t('statistiques.th_abandon')}</th><th className="py-2 text-right">{t('statistiques.th_recouvr')}</th>
                                        <th className="py-2 text-right">{t('statistiques.th_reussite')}</th><th className="py-2 text-right">{t('statistiques.th_admission')}</th></tr></thead>
                                    <tbody>{trendSeries.map((r) => {
                                        const pct = (v: number | string | null) => (v == null ? '—' : `${v}%`);
                                        return (
                                            <tr key={String(r.year)} className="border-b border-gray-50 dark:border-gray-700/50">
                                                <td className="py-2 font-medium">{r.year}{r.year === activeYearLabel && <span className="ml-2 text-xs text-blue-500">{t('statistiques.in_progress')}</span>}</td>
                                                <td className="py-2 text-right">{r.effectif}</td><td className="py-2 text-right">{r.part_filles}%</td>
                                                <td className="py-2 text-right">{pct(r.redoublement)}</td><td className="py-2 text-right">{pct(r.abandon)}</td><td className="py-2 text-right">{pct(r.recouvrement)}</td>
                                                <td className="py-2 text-right">{pct(r.reussite)}</td><td className="py-2 text-right">{pct(r.admission)}</td>
                                            </tr>
                                        );
                                    })}</tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ---- Géographie ---- */}
                {tab === 'geographie' && (
                    <div className="space-y-6">
                        {geography.by_region.length === 0 ? (
                            <>
                                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm px-4 py-3">
                                    {t('statistiques.coverage_note_1')} <strong>{geography.coverage}%</strong> {t('statistiques.coverage_note_2')} ({geography.localized} / {geography.total}). {t('statistiques.coverage_note_3')}
                                </div>
                                <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-card p-12 text-center text-gray-400">
                                    {t('statistiques.no_geo')}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Kpi label={t('statistiques.kpi_coverage')} value={`${geography.coverage}%`} sub={t('statistiques.kpi_coverage_sub', { localized: geography.localized, total: geography.total })} icon={MapPin} tone="text-blue-600" />
                                    <Kpi label={t('statistiques.kpi_grand_lome')} value={`${grandLomeShare}%`} sub={t('statistiques.kpi_grand_lome_sub')} icon={Users} tone="text-violet-600" />
                                    <Kpi label={t('statistiques.kpi_regions')} value={geography.by_region.length} sub={t('statistiques.kpi_regions_sub')} icon={Layers} tone="text-emerald-600" />
                                    <Kpi label={t('statistiques.kpi_prefectures')} value={geography.by_prefecture.length} sub={t('statistiques.kpi_prefectures_sub')} icon={UserCheck} tone="text-orange-600" />
                                </div>

                                <Card title={t('statistiques.card_origin')} icon={<MapPin className="w-4 h-4" />}>
                                    {/* Hiérarchie région → préfecture : l'aire porte la magnitude, une teinte
                                        par région porte l'identité (déclinée en nuances selon l'effectif), et la
                                        position + la légende + les libellés sécurisent la lecture. */}
                                    <ResponsiveContainer width="100%" height={400}>
                                        <Treemap
                                            data={treemapData}
                                            dataKey="size"
                                            aspectRatio={4 / 3}
                                            stroke={theme.surface}
                                            isAnimationActive={false}
                                            content={<TreemapNode surface={theme.surface} regionColor={regionColor} prefColor={prefColor} />}
                                        >
                                            <RTooltip contentStyle={theme.tooltip.contentStyle} itemStyle={theme.tooltip.itemStyle} formatter={(v) => [t('statistiques.students_tooltip', { value: String(v) }), t('statistiques.headcount_label')]} />
                                        </Treemap>
                                    </ResponsiveContainer>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500 dark:text-gray-400">
                                        {geography.by_region.map((r) => (
                                            <span key={r.name} className="flex items-center gap-1.5">
                                                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: regionColor[r.name] }} />
                                                {r.name}
                                            </span>
                                        ))}
                                        <span className="text-gray-400">{t('statistiques.shade_note')}</span>
                                    </div>
                                </Card>

                                <Card title={t('statistiques.card_by_region')} icon={<BarChart3 className="w-4 h-4" />}>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart layout="vertical" data={geography.by_region} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={false} />
                                            <XAxis type="number" tick={{ fontSize: 11, fill: theme.tick }} axisLine={false} tickLine={false} allowDecimals={false} />
                                            <YAxis type="category" dataKey="name" width={104} tick={{ fontSize: 12, fill: theme.axis }} axisLine={false} tickLine={false} />
                                            <RTooltip contentStyle={theme.tooltip.contentStyle} itemStyle={theme.tooltip.itemStyle} formatter={(v) => [t('statistiques.students_tooltip', { value: String(v) }), t('statistiques.headcount_label')]} />
                                            <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={26}>
                                                {geography.by_region.map((r) => <Cell key={r.name} fill={regionColor[r.name] ?? BLUE} />)}
                                                <LabelList dataKey="total" position="right" style={{ fontSize: 11, fill: theme.tick }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Card>
                            </>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
