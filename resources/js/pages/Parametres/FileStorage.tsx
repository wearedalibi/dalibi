import axios from 'axios';
import { Head, useForm } from '@inertiajs/react';
import { CloudUpload, HardDrive, Loader2, ServerCrash } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Settings {
    driver:      'local' | 's3';
    s3_key:      string;
    s3_secret:   string;
    s3_region:   string;
    s3_bucket:   string;
    s3_endpoint: string;
    s3_url:      string;
}

interface Props {
    settings:  Settings;
    hasKey:    boolean;
    hasSecret: boolean;
}

export default function FileStorage({ settings, hasKey, hasSecret }: Readonly<Props>) {
    const { t } = useTranslation();
    // Les credentials arrivent masqués : on part de champs vides pour ne pas
    // renvoyer la valeur masquée au serveur (qui la conserverait telle quelle).
    const { data, setData, post, processing, errors } = useForm<Settings>({
        ...settings,
        s3_key:    '',
        s3_secret: '',
    });
    const { toast } = useToast();
    const [testing, setTesting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('file-storage.update'), {
            onSuccess: () => toast({ title: t('parametres.file_storage.toast_saved_title'), description: t('parametres.file_storage.toast_saved_desc'), variant: 'success' }),
            onError:   () => toast({ title: t('parametres.file_storage.toast_error_title'), description: t('parametres.file_storage.toast_error_desc'), variant: 'error' }),
        });
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await axios.post(
                route('file-storage.test'),
                {},
                { headers: { 'X-CSRF-TOKEN': csrfToken, 'X-Requested-With': 'XMLHttpRequest' } },
            );
            if (res.data?.success) {
                toast({
                    title: t('parametres.file_storage.toast_test_ok_title'),
                    description: t('parametres.file_storage.toast_test_ok_desc', { driver: res.data.driver }),
                    variant: 'success',
                });
            } else {
                toast({ title: t('parametres.file_storage.toast_test_fail_title'), description: res.data?.error ?? t('parametres.file_storage.toast_unknown_error'), variant: 'error' });
            }
        } catch (err: any) {
            const message = err?.response?.data?.error ?? err?.message ?? t('parametres.file_storage.toast_unreachable');
            toast({ title: t('parametres.file_storage.toast_test_fail_title'), description: message, variant: 'error' });
        } finally {
            setTesting(false);
        }
    };

    const isS3 = data.driver === 's3';

    return (
        <AppLayout>
            <Head title={t('parametres.file_storage.head')} />
            <div className="w-full space-y-6">

                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><HardDrive className="h-7 w-7 text-blue-600 shrink-0" />{t('parametres.file_storage.title')}</h1>
                    <p className="mt-2 text-gray-500">{t('parametres.file_storage.subtitle')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Choix du driver */}
                    <div className="grid grid-cols-2 gap-4">
                        {([
                            { value: 'local', label: t('parametres.file_storage.driver_local'),   desc: t('parametres.file_storage.driver_local_desc'),    Icon: HardDrive,   ring: 'ring-blue-500',   bg: 'bg-blue-50',   iconBg: 'bg-blue-100',   iconColor: 'text-blue-600' },
                            { value: 's3',    label: t('parametres.file_storage.driver_s3'), desc: t('parametres.file_storage.driver_s3_desc'),       Icon: CloudUpload, ring: 'ring-violet-500', bg: 'bg-violet-50', iconBg: 'bg-violet-100', iconColor: 'text-violet-600' },
                        ] as const).map(opt => {
                            const active = data.driver === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setData('driver', opt.value)}
                                    className={`rounded-2xl p-5 text-left ring-2 transition-all ${active ? `${opt.ring} ${opt.bg}` : 'ring-gray-200 bg-white hover:ring-gray-300'}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${active ? opt.iconBg : 'bg-gray-100'}`}>
                                        <opt.Icon className={`w-5 h-5 ${active ? opt.iconColor : 'text-gray-400'}`} />
                                    </div>
                                    <p className={`font-semibold text-sm ${active ? 'text-gray-900' : 'text-gray-600'}`}>{opt.label}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                                </button>
                            );
                        })}
                    </div>

                    {/* Config S3 */}
                    {isS3 && (
                        <div className="rounded-2xl bg-violet-50/60 ring-1 ring-violet-100 p-6 space-y-4">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <CloudUpload className="w-4 h-4 text-violet-600" />
                                {t('parametres.file_storage.s3_section')}
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">
                                        {t('parametres.file_storage.access_key')} {hasKey ? <span className="text-gray-400 font-normal">{t('parametres.file_storage.keep_hint')}</span> : '*'}
                                    </label>
                                    <Input value={data.s3_key} onChange={e => setData('s3_key', e.target.value)} placeholder={hasKey ? (settings.s3_key || '••••••••') : 'AKIAIOSFODNN7EXAMPLE'} className={errors.s3_key ? 'border-red-400' : ''} />
                                    {errors.s3_key && <p className="text-xs text-red-500">{errors.s3_key}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">
                                        {t('parametres.file_storage.secret_key')} {hasSecret ? <span className="text-gray-400 font-normal">{t('parametres.file_storage.keep_hint')}</span> : '*'}
                                    </label>
                                    <Input type="password" value={data.s3_secret} onChange={e => setData('s3_secret', e.target.value)} placeholder={hasSecret ? '••••••••' : 'wJalrXUtnFEMI...'} className={errors.s3_secret ? 'border-red-400' : ''} />
                                    {errors.s3_secret && <p className="text-xs text-red-500">{errors.s3_secret}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">{t('parametres.file_storage.bucket')}</label>
                                    <Input value={data.s3_bucket} onChange={e => setData('s3_bucket', e.target.value)} placeholder="mon-bucket" className={errors.s3_bucket ? 'border-red-400' : ''} />
                                    {errors.s3_bucket && <p className="text-xs text-red-500">{errors.s3_bucket}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">{t('parametres.file_storage.region')}</label>
                                    <Input value={data.s3_region} onChange={e => setData('s3_region', e.target.value)} placeholder={t('parametres.file_storage.region_ph')} className={errors.s3_region ? 'border-red-400' : ''} />
                                    {errors.s3_region && <p className="text-xs text-red-500">{errors.s3_region}</p>}
                                </div>

                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        {t('parametres.file_storage.endpoint')} <span className="text-gray-400 font-normal">{t('parametres.file_storage.endpoint_hint')}</span>
                                    </label>
                                    <Input value={data.s3_endpoint} onChange={e => setData('s3_endpoint', e.target.value)} placeholder="https://<account_id>.r2.cloudflarestorage.com" />
                                </div>

                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        {t('parametres.file_storage.public_url')} <span className="text-gray-400 font-normal">{t('parametres.file_storage.public_url_hint')}</span>
                                    </label>
                                    <Input value={data.s3_url} onChange={e => setData('s3_url', e.target.value)} placeholder="https://files.monecole.tg" />
                                </div>
                            </div>

                            <div className="rounded-xl bg-white/70 ring-1 ring-violet-100 p-4 text-xs text-gray-500 space-y-1">
                                <p className="font-semibold text-gray-700">{t('parametres.file_storage.r2_title')}</p>
                                <p>{t('parametres.file_storage.r2_region')} <code className="bg-gray-100 px-1 rounded">auto</code></p>
                                <p>{t('parametres.file_storage.r2_endpoint')} <code className="bg-gray-100 px-1 rounded">https://{'<ACCOUNT_ID>'}.r2.cloudflarestorage.com</code></p>
                                <p>{t('parametres.file_storage.r2_bandwidth')}</p>
                            </div>
                        </div>
                    )}

                    {/* Note stockage local */}
                    {!isS3 && (
                        <div className="rounded-xl bg-blue-50 ring-1 ring-blue-100 p-4 flex gap-3 text-sm text-blue-700">
                            <ServerCrash className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold">{t('parametres.file_storage.local_active')}</p>
                                <p className="text-blue-600 mt-0.5">{t('parametres.file_storage.local_active_before')} <code className="bg-blue-100 px-1 rounded">storage/app/public/</code> {t('parametres.file_storage.local_active_middle')} <code className="bg-blue-100 px-1 rounded">/storage/</code>.</p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                        <Button type="button" variant="outline" onClick={handleTest} disabled={testing} className="gap-2">
                            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
                            {t('parametres.file_storage.test_connection')}
                        </Button>

                        <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700 gap-2">
                            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {t('parametres.file_storage.save')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
