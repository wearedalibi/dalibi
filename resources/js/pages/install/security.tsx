import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, Download, KeyRound, Lock, Lock as LockIcon, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/helpers/i18n';
import InstallLayout from '@/layouts/install/install-layout';

type Defaults = {
    force_2fa: boolean;
    force_https: boolean;
    app_debug_off: boolean;
    enable_sentry: boolean;
    password_policy: string;
};

type Props = {
    defaults: Defaults;
    values?: Partial<Defaults> | null;
};

function Toggle({ on, onClick }: Readonly<{ on: boolean; onClick: () => void }>) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={onClick}
            className={[
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition',
                on ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
            ].join(' ')}
        >
            <span
                className={['inline-block h-5 w-5 transform rounded-full bg-white transition', on ? 'translate-x-5' : 'translate-x-0.5'].join(' ')}
            />
        </button>
    );
}

export default function InstallSecurity({ defaults, values }: Readonly<Props>) {
    const { t } = useTranslation();
    const init = { ...defaults, ...(values ?? {}) };

    const [force2fa, setForce2fa] = useState(!!init.force_2fa);
    const [appDebugOff, setAppDebugOff] = useState(init.app_debug_off !== false);
    const [forceHttps, setForceHttps] = useState(init.force_https !== false);
    const [sentry, setSentry] = useState(!!init.enable_sentry);

    const rows = [
        { icon: ShieldCheck, label: t('install.security.force_2fa'), on: force2fa, set: () => setForce2fa((x) => !x), name: 'force_2fa' },
        { icon: LockIcon, label: t('install.security.app_debug_off'), on: appDebugOff, set: () => setAppDebugOff((x) => !x), name: 'app_debug_off' },
        { icon: Lock, label: t('install.security.force_https'), on: forceHttps, set: () => setForceHttps((x) => !x), name: 'force_https' },
        { icon: Download, label: t('install.security.enable_sentry'), on: sentry, set: () => setSentry((x) => !x), name: 'enable_sentry' },
    ];

    return (
        <InstallLayout step="security" title={t('install.security.title')} description={t('install.security.description')}>
            <Head title={t('install.security.title')} />

            <Form action="/install/security" method="post" className="flex flex-col gap-6">
                {({ processing }) => (
                    <div className="grid gap-5">
                        <input type="hidden" name="password_policy" value={defaults.password_policy} />
                        {rows.map((row) => <input key={`h-${row.name}`} type="hidden" name={row.name} value={row.on ? '1' : '0'} />)}

                        <div className="grid gap-2.5">
                            {rows.map((row) => (
                                <div
                                    key={row.name}
                                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                                >
                                    <span className="flex items-center gap-2.5 text-sm text-gray-800 dark:text-gray-200">
                                        <row.icon className="h-4 w-4 text-blue-600" />
                                        {row.label}
                                    </span>
                                    <Toggle on={row.on} onClick={row.set} />
                                </div>
                            ))}

                            <div className="flex items-center gap-2.5 rounded-lg border border-gray-200 p-3 text-sm text-gray-800 dark:border-gray-700 dark:text-gray-200">
                                <KeyRound className="h-4 w-4 text-blue-600" />
                                {t('install.security.password_policy')}
                            </div>
                        </div>

                        <p className="flex items-center gap-2 text-xs text-gray-500">
                            <Lock className="h-3.5 w-3.5" />
                            {t('install.security.lock_note')}
                        </p>

                        <div className="mt-2 flex items-center justify-between">
                            <Button asChild variant="outline">
                                <Link href="/install/admin">
                                    <ArrowLeft className="h-4 w-4" />
                                    {t('install.common.back')}
                                </Link>
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={processing}>
                                {processing && <Spinner />}
                                {t('install.common.install')}
                            </Button>
                        </div>
                    </div>
                )}
            </Form>
        </InstallLayout>
    );
}
