import { Head, router } from '@inertiajs/react';
import { useMoney } from '@/helpers/money';
import { CheckCircle2, ScanLine, Search, XCircle, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface VerifyResult {
    valid: boolean;
    receipt_number?: string;
    amount?: number;
    paid_at?: string | null;
    student?: string | null;
    matricule?: string | null;
    class_name?: string | null;
    year?: string | null;
}

interface Props {
    code: string;
    result: VerifyResult | null;
}


export default function Verify({ code, result }: Readonly<Props>) {
    const fmt = useMoney();
    const { t } = useTranslation();
    const [value, setValue] = useState(code ?? '');

    const search = () => {
        router.get(route('receipts.verify'), { code: value }, { preserveScroll: true, replace: true });
    };

    return (
        <AppLayout>
            <Head title={t('comptabilite.verify.head')} />
            <div className="w-full max-w-2xl space-y-6">

                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><ShieldCheck className="h-7 w-7 text-blue-600 shrink-0" />{t('comptabilite.verify.title')}</h1>
                    <p className="mt-2 text-gray-500">{t('comptabilite.verify.subtitle')}</p>
                </div>

                <div className="rounded-2xl bg-slate-50/70 ring-1 ring-slate-200 shadow-sm p-4 flex gap-3 items-center">
                    <div className="relative flex-1">
                        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && search()}
                            placeholder={t('comptabilite.verify.placeholder')}
                            className="pl-9 font-mono"
                            autoFocus
                        />
                    </div>
                    <Button onClick={search} className="bg-blue-600 hover:bg-blue-700 gap-2">
                        <Search className="w-4 h-4" /> {t('comptabilite.verify.verify')}
                    </Button>
                </div>

                {result && (
                    result.valid ? (
                        <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                <div>
                                    <p className="text-lg font-bold text-emerald-800">{t('comptabilite.verify.authentic')}</p>
                                    <p className="text-sm text-emerald-600 font-mono">{result.receipt_number}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><p className="text-gray-500">{t('comptabilite.verify.student')}</p><p className="font-semibold text-gray-900">{result.student ?? '—'}</p></div>
                                <div><p className="text-gray-500">{t('comptabilite.verify.matricule')}</p><p className="font-semibold text-gray-900 font-mono">{result.matricule ?? '—'}</p></div>
                                <div><p className="text-gray-500">{t('comptabilite.verify.class')}</p><p className="font-semibold text-gray-900">{result.class_name ?? '—'} {result.year ? `(${result.year})` : ''}</p></div>
                                <div><p className="text-gray-500">{t('comptabilite.verify.date')}</p><p className="font-semibold text-gray-900">{result.paid_at ?? '—'}</p></div>
                                <div className="col-span-2"><p className="text-gray-500">{t('comptabilite.verify.amount')}</p><p className="text-2xl font-bold text-emerald-700">{fmt(result.amount)}</p></div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl bg-red-50 ring-1 ring-red-200 p-6 flex items-center gap-3">
                            <XCircle className="w-8 h-8 text-red-600" />
                            <div>
                                <p className="text-lg font-bold text-red-800">{t('comptabilite.verify.not_found')}</p>
                                <p className="text-sm text-red-600">{t('comptabilite.verify.not_found_hint')}</p>
                            </div>
                        </div>
                    )
                )}
            </div>
        </AppLayout>
    );
}
