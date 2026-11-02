import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Receipt, Users, Coins, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Props {
    activeEmployees: number;
    defaultComponents: number;
}

interface FormData { period_month: string; period_year: string; label: string; }

export default function Create({ activeEmployees, defaultComponents }: Readonly<Props>) {
    const { t } = useTranslation();
    const MONTHS = ['', ...Array.from({ length: 12 }, (_, i) => t('paie.months.' + (i + 1)))];
    const now = new Date();
    const { data, setData, post, processing, errors } = useForm<FormData>({
        period_month: String(now.getMonth() + 1),
        period_year: String(now.getFullYear()),
        label: '',
    });

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post(route('pay-runs.store'));
    };

    return (
        <AppLayout>
            <Head title={t('paie.create.head')} />
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => router.get(route('pay-runs.index'))} className="p-2 hover:bg-gray-100 rounded-lg transition">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('paie.create.title')}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{t('paie.create.subtitle')}</p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6 max-w-3xl">
                    <div className="rounded-2xl bg-linear-to-br from-blue-50 to-white ring-1 ring-blue-100 p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-blue-700">
                            <Receipt className="h-4 w-4" /><p className="text-sm font-semibold">{t('paie.create.period')}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">{t('paie.create.month')}</label>
                                <Select value={data.period_month} onValueChange={(v) => setData('period_month', v)}>
                                    <SelectTrigger className={errors.period_month ? 'border-red-500' : ''}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {MONTHS.slice(1).map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {errors.period_month && <p className="text-red-600 text-sm mt-1">{errors.period_month}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">{t('paie.create.year')}</label>
                                <Input type="number" min={2000} max={2100} value={data.period_year} onChange={e => setData('period_year', e.target.value)} className={errors.period_year ? 'border-red-500' : ''} />
                                {errors.period_year && <p className="text-red-600 text-sm mt-1">{errors.period_year}</p>}
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-900 mb-2">{t('paie.create.label')}</label>
                                <Input value={data.label} onChange={e => setData('label', e.target.value)} placeholder={t('paie.create.label_ph')} />
                            </div>
                        </div>
                        {(errors as Record<string, string>).period && <p className="text-red-600 text-sm">{(errors as Record<string, string>).period}</p>}
                    </div>

                    <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 p-4 flex items-start gap-3 text-sm text-gray-600">
                        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                            <p className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" /> {t('paie.create.employees_info', { count: activeEmployees })}</p>
                            <p className="flex items-center gap-2"><Coins className="w-4 h-4 text-gray-400" /> {t('paie.create.components_info', { count: defaultComponents })}</p>
                            <p className="text-xs text-gray-400">{t('paie.create.draft_note')}</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing || activeEmployees === 0} className="bg-blue-600 hover:bg-blue-700">
                            {processing ? t('paie.create.generating') : t('paie.create.generate')}
                        </Button>
                        <Button type="button" variant="outline" className="border-slate-200 text-gray-700" onClick={() => router.get(route('pay-runs.index'))}>{t('paie.create.cancel')}</Button>
                    </div>
                    {activeEmployees === 0 && <p className="text-sm text-amber-600">{t('paie.create.no_employees')}</p>}
                </form>
            </div>
        </AppLayout>
    );
}
