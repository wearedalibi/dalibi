import { Head, Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/helpers/i18n';
import InstallLayout from '@/layouts/install/install-layout';

type Requirement = { key: string; label: string; ok: boolean; hint: string };

type Props = {
    requirements: Requirement[];
    passes: boolean;
};

export default function InstallRequirements({ requirements, passes }: Readonly<Props>) {
    const { t } = useTranslation();

    return (
        <InstallLayout title={t('install.requirements.title')} description={t('install.requirements.description')}>
            <Head title={t('install.requirements.title')} />

            <div className="grid gap-6">
                <ul className="grid gap-2">
                    {requirements.map((req) => (
                        <li
                            key={req.key}
                            className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-700"
                        >
                            <span className="flex items-center gap-2.5 text-sm text-gray-800 dark:text-gray-200">
                                {req.ok ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                {req.label}
                            </span>
                            <span className={['text-xs', req.ok ? 'text-gray-500' : 'text-red-600'].join(' ')}>{req.hint}</span>
                        </li>
                    ))}
                </ul>

                {passes && (
                    <p className="rounded-lg bg-green-50 p-3 text-xs text-green-800 dark:bg-green-950/40 dark:text-green-200">
                        {t('install.requirements.all_good')}
                    </p>
                )}

                <div className="flex items-center justify-between">
                    <Button asChild variant="outline">
                        <Link href="/install/requirements">
                            <RefreshCw className="h-4 w-4" />
                            {t('install.requirements.recheck')}
                        </Link>
                    </Button>
                    {passes && (
                        <Button asChild className="bg-blue-600 hover:bg-blue-700">
                            <Link href="/install">
                                {t('install.common.continue')}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </InstallLayout>
    );
}
