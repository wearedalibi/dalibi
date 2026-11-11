import { Form, Head } from '@inertiajs/react';
import { ShieldBan, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { disable, enable, show } from '@/routes/two-factor';
import type { BreadcrumbItem } from '@/types';

type Props = {
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
};

export default function TwoFactor({
    requiresConfirmation = false,
    twoFactorEnabled = false,
}: Readonly<Props>) {
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('settings.two_factor.page.breadcrumb'),
            href: show.url(),
        },
    ];
    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState<boolean>(false);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('settings.two_factor.page.head')} />

            <h1 className="sr-only flex items-center gap-3"><ShieldCheck className="h-7 w-7 text-blue-600 shrink-0" />{t('settings.two_factor.page.heading')}</h1>

            <SettingsLayout bare>
                <div className="space-y-6">
                    {/* En-tête */}
                    <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-50 to-cyan-50 p-6 ring-1 ring-blue-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                                <ShieldCheck className="h-7 w-7" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{t('settings.two_factor.page.heading')}</h2>
                                <p className="text-sm text-gray-600">{t('settings.two_factor.page.card_desc')}</p>
                            </div>
                        </div>
                        <ShieldCheck className="pointer-events-none absolute -right-4 -bottom-6 h-32 w-32 text-blue-600 opacity-[0.07]" />
                    </div>

                    {/* Contenu */}
                    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                    {twoFactorEnabled ? (
                        <div className="flex flex-col items-start justify-start space-y-4">
                            <Badge variant="default" className="bg-green-100 text-green-800">{t('settings.two_factor.page.enabled_badge')}</Badge>
                            <p className="text-muted-foreground">
                                {t('settings.two_factor.page.enabled_desc')}
                            </p>

                            <TwoFactorRecoveryCodes
                                recoveryCodesList={recoveryCodesList}
                                fetchRecoveryCodes={fetchRecoveryCodes}
                                errors={errors}
                            />

                            <div className="relative inline">
                                <Form {...disable.form()}>
                                    {({ processing }) => (
                                        <Button
                                            variant="destructive"
                                            type="submit"
                                            disabled={processing}
                                        >
                                            <ShieldBan /> {t('settings.two_factor.page.disable')}
                                        </Button>
                                    )}
                                </Form>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-start justify-start space-y-4">
                            <Badge variant="destructive" className="bg-red-100 text-red-800">{t('settings.two_factor.page.disabled_badge')}</Badge>
                            <p className="text-muted-foreground">
                                {t('settings.two_factor.page.disabled_desc')}
                            </p>

                            <div>
                                {hasSetupData ? (
                                    <Button
                                        onClick={() => setShowSetupModal(true)}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        <ShieldCheck />
                                        {t('settings.two_factor.page.continue_setup')}
                                    </Button>
                                ) : (
                                    <Form
                                        {...enable.form()}
                                        onSuccess={() =>
                                            setShowSetupModal(true)
                                        }
                                    >
                                        {({ processing }) => (
                                            <Button
                                                type="submit"
                                                disabled={processing}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                <ShieldCheck />
                                                {t('settings.two_factor.page.enable')}
                                            </Button>
                                        )}
                                    </Form>
                                )}
                            </div>
                        </div>
                    )}

                    <TwoFactorSetupModal
                        isOpen={showSetupModal}
                        onClose={() => setShowSetupModal(false)}
                        requiresConfirmation={requiresConfirmation}
                        twoFactorEnabled={twoFactorEnabled}
                        qrCodeSvg={qrCodeSvg}
                        manualSetupKey={manualSetupKey}
                        clearSetupData={clearSetupData}
                        fetchSetupData={fetchSetupData}
                        errors={errors}
                    />
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
