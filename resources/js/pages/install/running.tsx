import { Head, router, usePage } from '@inertiajs/react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/helpers/i18n';
import InstallLayout from '@/layouts/install/install-layout';

export default function InstallRunning() {
    const { t } = useTranslation();
    const { errors } = usePage().props as unknown as { errors: Record<string, string> };
    const failed = Boolean(errors?.install);

    // Progression simulée : l'exécution est « silencieuse à la fin » (une seule
    // requête POST), la barre rassure l'utilisateur pendant le traitement.
    const [progress, setProgress] = useState(8);
    const started = useRef(false);

    const execute = () => {
        router.post(
            '/install/execute',
            {},
            {
                preserveScroll: true,
                onStart: () => setProgress(12),
            },
        );
    };

    useEffect(() => {
        if (started.current || failed) {
            return;
        }
        started.current = true;
        execute();
    }, [failed]);

    useEffect(() => {
        if (failed) {
            return;
        }
        const id = setInterval(() => {
            setProgress((p) => (p < 90 ? p + Math.max(1, Math.round((90 - p) / 12)) : p));
        }, 600);

        return () => clearInterval(id);
    }, [failed]);

    return (
        <InstallLayout title={t('install.running.title')} description={t('install.running.description')}>
            <Head title={t('install.running.title')} />

            <div className="grid gap-6">
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                    {failed ? (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                    ) : (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    )}
                    <div className="flex-1">
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                                className={[
                                    'h-full rounded-full transition-all duration-500',
                                    failed ? 'bg-red-500' : 'bg-blue-600',
                                ].join(' ')}
                                style={{ width: `${failed ? 100 : progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {failed ? (
                    <>
                        <p className="rounded-lg bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-200">
                            {errors.install}
                        </p>
                        <Button
                            onClick={() => {
                                setProgress(12);
                                execute();
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            <RefreshCw className="h-4 w-4" />
                            {t('install.running.retry')}
                        </Button>
                    </>
                ) : (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400">{t('install.running.working')}</p>
                )}
            </div>
        </InstallLayout>
    );
}
