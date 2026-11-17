import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/helpers/i18n';
import InstallLayout from '@/layouts/install/install-layout';

type Props = {
    phasePlaceholder?: boolean;
};

export default function InstallRunning({ phasePlaceholder }: Readonly<Props>) {
    const { t } = useTranslation();

    return (
        <InstallLayout title={t('install.running.title')} description={t('install.running.description')}>
            <Head title={t('install.running.title')} />

            <div className="grid gap-6">
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <div className="flex-1">
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div className="h-full w-3/5 rounded-full bg-blue-600" />
                        </div>
                    </div>
                </div>

                {phasePlaceholder && (
                    <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        {t('install.running.phase_note')}
                    </p>
                )}

                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                    <Link href="/login">
                        {t('install.running.to_login')}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </InstallLayout>
    );
}
