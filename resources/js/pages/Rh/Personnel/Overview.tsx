import { Head, router } from '@inertiajs/react';
import { Users, Layers, AlertTriangle, Wallet, Receipt, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMoney } from '@/helpers/money';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Props {
    stats: { active: number; ungraded: number; grades: number; monthly_base: number };
    lastRun: { id: string; period_label: string; status: string; total_net: number } | null;
}

const PAY_STATUS: Record<string, { cls: string }> = {
    draft:     { cls: 'bg-gray-100 text-gray-600' },
    validated: { cls: 'bg-blue-100 text-blue-700' },
    paid:      { cls: 'bg-green-100 text-green-700' },
    cancelled: { cls: 'bg-red-100 text-red-600' },
};

function Kpi({ title, value, icon: Icon, color, onClick, sub }: {
    title: string; value: string; icon: React.ElementType; color: string; onClick?: () => void; sub?: string;
}) {
    return (
        <div onClick={onClick} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
                </div>
                <Icon className={`w-10 h-10 ${color} opacity-20`} />
            </div>
        </div>
    );
}

export default function Overview({ stats, lastRun }: Readonly<Props>) {
    const fmt = useMoney();
    const { t } = useTranslation();
    const st = lastRun ? (PAY_STATUS[lastRun.status] ?? PAY_STATUS.draft) : null;

    return (
        <AppLayout>
            <Head title={t('rh.personnel.overview.head')} />
            <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('rh.personnel.overview.title')}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{t('rh.personnel.overview.subtitle')}</p>
                    </div>
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => router.get(route('pay-runs.create'))}>
                        <Plus className="w-4 h-4" /> {t('rh.personnel.overview.new_run')}
                    </Button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Kpi title={t('rh.personnel.overview.kpi_active')} value={String(stats.active)} icon={Users} color="text-blue-600" onClick={() => router.get(route('personnel.index'))} />
                    <Kpi title={t('rh.personnel.overview.kpi_ungraded')} value={String(stats.ungraded)} sub={stats.ungraded > 0 ? t('rh.personnel.overview.kpi_ungraded_sub_some') : t('rh.personnel.overview.kpi_ungraded_sub_none')} icon={AlertTriangle} color={stats.ungraded > 0 ? 'text-amber-600' : 'text-gray-400'} onClick={() => router.get(route('personnel.index'), { ungraded: 1 })} />
                    <Kpi title={t('rh.personnel.overview.kpi_grades')} value={String(stats.grades)} icon={Layers} color="text-indigo-600" onClick={() => router.get(route('salary-grades.index'))} />
                    <Kpi title={t('rh.personnel.overview.kpi_mass')} value={fmt(stats.monthly_base)} sub={t('rh.personnel.overview.kpi_mass_sub')} icon={Wallet} color="text-emerald-600" />
                </div>

                {/* Bandeau à classer */}
                {stats.ungraded > 0 && (
                    <button onClick={() => router.get(route('personnel.index'), { ungraded: 1 })} className="w-full text-left rounded-xl bg-amber-50 ring-1 ring-amber-100 px-4 py-3 flex items-center gap-2 text-sm text-amber-800 hover:bg-amber-100 transition-colors">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {t('rh.personnel.overview.ungraded_banner', { count: stats.ungraded })}
                        <ArrowRight className="w-4 h-4 ml-auto" />
                    </button>
                )}

                {/* Dernier cycle */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-blue-600" /> {t('rh.personnel.overview.last_run')}
                        </h2>
                        <Button variant="outline" size="sm" onClick={() => router.get(route('pay-runs.index'))}>{t('rh.personnel.overview.all_runs')}</Button>
                    </div>
                    {!lastRun ? (
                        <p className="text-sm text-gray-400">{t('rh.personnel.overview.no_run')}</p>
                    ) : (
                        <button onClick={() => router.get(route('pay-runs.show', lastRun.id))} className="w-full text-left flex items-center justify-between gap-4 rounded-lg hover:bg-gray-50 p-3 -m-3 transition-colors">
                            <div>
                                <p className="font-medium text-gray-900">{lastRun.period_label}</p>
                                {st && <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{t('rh.pay_status.' + lastRun.status)}</span>}
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500">{t('rh.personnel.overview.net_mass')}</p>
                                <p className="text-lg font-bold text-gray-900">{fmt(lastRun.total_net)}</p>
                            </div>
                        </button>
                    )}
                </div>

                {/* Raccourcis */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: t('rh.personnel.overview.shortcut_personnel'), desc: t('rh.personnel.overview.shortcut_personnel_desc'), icon: Users, href: route('personnel.index') },
                        { label: t('rh.personnel.overview.shortcut_grades'), desc: t('rh.personnel.overview.shortcut_grades_desc'), icon: Layers, href: route('salary-grades.index') },
                        { label: t('rh.personnel.overview.shortcut_runs'), desc: t('rh.personnel.overview.shortcut_runs_desc'), icon: Receipt, href: route('pay-runs.index') },
                    ].map(s => (
                        <button key={s.label} onClick={() => router.get(s.href)} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left hover:shadow-md transition-shadow flex items-center gap-3">
                            <span className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0"><s.icon className="w-5 h-5 text-blue-600" /></span>
                            <span>
                                <span className="block font-medium text-gray-900">{s.label}</span>
                                <span className="block text-xs text-gray-400">{s.desc}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
