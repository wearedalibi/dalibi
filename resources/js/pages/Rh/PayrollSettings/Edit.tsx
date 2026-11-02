import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Clock, ShieldCheck, Landmark, Plus, Trash2, Save, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Bracket { up_to: number | null; rate: number; }
interface Settings {
    seniority_enabled: boolean;
    seniority_rate_per_year: number;
    seniority_cap_percent: number;
    cnss_enabled: boolean;
    cnss_employee_rate: number;
    cnss_employer_rate: number;
    cnss_ceiling: number;
    its_enabled: boolean;
    its_brackets: Bracket[] | null;
}

interface FormBracket { up_to: string; rate: string; }
interface FormData {
    seniority_enabled: boolean;
    seniority_rate_per_year: string;
    seniority_cap_percent: string;
    cnss_enabled: boolean;
    cnss_employee_rate: string;
    cnss_employer_rate: string;
    cnss_ceiling: string;
    its_enabled: boolean;
    its_brackets: FormBracket[];
}

export default function Edit({ settings }: Readonly<{ settings: Settings }>) {
    const { t } = useTranslation();
    const { data, setData, put, processing } = useForm<FormData>({
        seniority_enabled: settings.seniority_enabled,
        seniority_rate_per_year: String(settings.seniority_rate_per_year),
        seniority_cap_percent: String(settings.seniority_cap_percent),
        cnss_enabled: settings.cnss_enabled,
        cnss_employee_rate: String(settings.cnss_employee_rate),
        cnss_employer_rate: String(settings.cnss_employer_rate),
        cnss_ceiling: String(settings.cnss_ceiling),
        its_enabled: settings.its_enabled,
        its_brackets: (settings.its_brackets ?? []).map(b => ({ up_to: b.up_to != null ? String(b.up_to) : '', rate: String(b.rate) })),
    });

    const setBracket = (i: number, key: keyof FormBracket, value: string) =>
        setData('its_brackets', data.its_brackets.map((b, j) => j === i ? { ...b, [key]: value } : b));
    const addBracket = () => setData('its_brackets', [...data.its_brackets, { up_to: '', rate: '' }]);
    const removeBracket = (i: number) => setData('its_brackets', data.its_brackets.filter((_, j) => j !== i));

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        put(route('payroll-settings.update'), { preserveScroll: true });
    };

    const inputCls = "w-full h-10 px-3 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

    return (
        <AppLayout>
            <Head title={t('rh.payroll_settings.head')} />
            <form onSubmit={submit} className="space-y-6 w-full">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => router.get(route('payroll.overview'))} className="p-2 hover:bg-gray-100 rounded-lg transition">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('rh.payroll_settings.title')}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{t('rh.payroll_settings.subtitle')}</p>
                    </div>
                </div>

                <div className="rounded-xl bg-amber-50 ring-1 ring-amber-100 p-4 flex items-start gap-2 text-sm text-amber-800">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <span dangerouslySetInnerHTML={{ __html: t('rh.payroll_settings.disclaimer') }} />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Ancienneté */}
                <section className="rounded-2xl bg-linear-to-br from-amber-50 to-white ring-1 ring-amber-100 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-amber-700"><Clock className="h-4 w-4" /><p className="text-sm font-semibold">{t('rh.payroll_settings.seniority')}</p></div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <Checkbox checked={data.seniority_enabled} onCheckedChange={c => setData('seniority_enabled', c === true)} /> {t('rh.payroll_settings.seniority_enable')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">{t('rh.payroll_settings.seniority_rate')}</label>
                            <Input type="number" min={0} max={100} step="0.5" value={data.seniority_rate_per_year} onChange={e => setData('seniority_rate_per_year', e.target.value)} disabled={!data.seniority_enabled} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">{t('rh.payroll_settings.seniority_cap')}</label>
                            <Input type="number" min={0} max={100} step="0.5" value={data.seniority_cap_percent} onChange={e => setData('seniority_cap_percent', e.target.value)} disabled={!data.seniority_enabled} />
                        </div>
                    </div>
                </section>

                {/* CNSS */}
                <section className="rounded-2xl bg-linear-to-br from-blue-50 to-white ring-1 ring-blue-100 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-blue-700"><ShieldCheck className="h-4 w-4" /><p className="text-sm font-semibold">{t('rh.payroll_settings.cnss')}</p></div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <Checkbox checked={data.cnss_enabled} onCheckedChange={c => setData('cnss_enabled', c === true)} /> {t('rh.payroll_settings.cnss_enable')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">{t('rh.payroll_settings.cnss_employee')}</label>
                            <Input type="number" min={0} max={100} step="0.1" value={data.cnss_employee_rate} onChange={e => setData('cnss_employee_rate', e.target.value)} disabled={!data.cnss_enabled} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">{t('rh.payroll_settings.cnss_employer')}</label>
                            <Input type="number" min={0} max={100} step="0.1" value={data.cnss_employer_rate} onChange={e => setData('cnss_employer_rate', e.target.value)} disabled={!data.cnss_enabled} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">{t('rh.payroll_settings.cnss_ceiling')}</label>
                            <Input type="number" min={0} value={data.cnss_ceiling} onChange={e => setData('cnss_ceiling', e.target.value)} disabled={!data.cnss_enabled} />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400">{t('rh.payroll_settings.cnss_note')}</p>
                </section>

                {/* ITS */}
                <section className="xl:col-span-2 rounded-2xl bg-linear-to-br from-slate-50 to-white ring-1 ring-slate-100 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-slate-700"><Landmark className="h-4 w-4" /><p className="text-sm font-semibold">{t('rh.payroll_settings.its')}</p></div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <Checkbox checked={data.its_enabled} onCheckedChange={c => setData('its_enabled', c === true)} /> {t('rh.payroll_settings.its_enable')}
                    </label>
                    <p className="text-xs text-gray-500">{t('rh.payroll_settings.its_desc')}</p>

                    <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-gray-500 uppercase px-1">
                            <span>{t('rh.payroll_settings.its_up_to')}</span><span>{t('rh.payroll_settings.its_rate')}</span><span></span>
                        </div>
                        {data.its_brackets.length === 0 && <p className="text-sm text-gray-400">{t('rh.payroll_settings.its_empty')}</p>}
                        {data.its_brackets.map((b, i) => (
                            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                                <Input type="number" min={0} value={b.up_to} onChange={e => setBracket(i, 'up_to', e.target.value)} placeholder={t('rh.payroll_settings.its_beyond')} disabled={!data.its_enabled} className={inputCls} />
                                <Input type="number" min={0} max={100} step="0.5" value={b.rate} onChange={e => setBracket(i, 'rate', e.target.value)} disabled={!data.its_enabled} className={inputCls} />
                                <button type="button" onClick={() => removeBracket(i)} disabled={!data.its_enabled} className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addBracket} disabled={!data.its_enabled}>
                            <Plus className="w-3.5 h-3.5" /> {t('rh.payroll_settings.its_add')}
                        </Button>
                    </div>
                </section>
                </div>

                <div className="flex gap-3">
                    <Button type="submit" disabled={processing} className="gap-2 bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4" /> {processing ? t('rh.payroll_settings.saving') : t('rh.payroll_settings.save')}</Button>
                    <Button type="button" variant="outline" className="border-slate-200 text-gray-700" onClick={() => router.get(route('payroll.overview'))}>{t('rh.payroll_settings.back')}</Button>
                </div>
            </form>
        </AppLayout>
    );
}
