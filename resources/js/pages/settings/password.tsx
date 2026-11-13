import { Transition } from '@headlessui/react';
import { Form, Head } from '@inertiajs/react';
import { Lock, KeyRound, ShieldCheck } from 'lucide-react';
import { useRef, useState } from 'react';
import PasswordController from '@/actions/App/Http/Controllers/Settings/PasswordController';
import InputError from '@/components/input-error';
import PasswordStrength from '@/components/password-strength';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/user-password';
import type { BreadcrumbItem } from '@/types';

export default function Password() {
    const { t } = useTranslation();
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);
    const [password, setPassword] = useState('');

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('settings.password.page.breadcrumb'),
            href: edit().url,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('settings.password.page.head')} />

            <h1 className="sr-only flex items-center gap-3"><KeyRound className="h-7 w-7 text-blue-600 shrink-0" />{t('settings.password.page.heading')}</h1>

            <SettingsLayout bare>
                <div className="space-y-6">
                    {/* En-tête */}
                    <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-50 to-cyan-50 p-6 ring-1 ring-blue-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                                <KeyRound className="h-7 w-7" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{t('settings.password.page.heading')}</h2>
                                <p className="text-sm text-gray-600">{t('settings.password.page.card_desc')}</p>
                            </div>
                        </div>
                        <Lock className="pointer-events-none absolute -right-4 -bottom-6 h-32 w-32 text-blue-600 opacity-[0.07]" />
                    </div>

                    {/* Formulaire */}
                    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                    <Form
                        {...PasswordController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        resetOnError={[
                            'password',
                            'password_confirmation',
                            'current_password',
                        ]}
                        resetOnSuccess
                        onError={(errors) => {
                            if (errors.password) {
                                passwordInput.current?.focus();
                            }

                            if (errors.current_password) {
                                currentPasswordInput.current?.focus();
                            }
                        }}
                        className="space-y-6"
                    >
                        {({ errors, processing, recentlySuccessful }) => (
                            <>
                                {/* Mot de passe actuel - Fond gris */}
                                <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-4">
                                        <KeyRound className="w-4 h-4 text-gray-600" />
                                        <Label htmlFor="current_password" className="text-sm font-semibold text-gray-900 mb-0">
                                            {t('settings.password.page.current')}
                                        </Label>
                                    </div>
                                    <Input
                                        id="current_password"
                                        ref={currentPasswordInput}
                                        name="current_password"
                                        type="password"
                                        className="bg-white border-gray-300"
                                        autoComplete="current-password"
                                        placeholder={t('settings.password.page.current_ph')}
                                    />
                                    <InputError message={errors.current_password} />
                                </div>

                                {/* Nouveau mot de passe - Fond vert */}
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-5 border-2 border-green-200">
                                    <div className="flex items-center gap-2 mb-4">
                                        <ShieldCheck className="w-5 h-5 text-green-600" />
                                        <span className="text-sm font-semibold text-green-900">
                                            {t('settings.password.page.new_section')}
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="password" className="text-sm font-medium text-gray-900">
                                                {t('settings.password.page.new')}
                                            </Label>
                                            <Input
                                                id="password"
                                                ref={passwordInput}
                                                name="password"
                                                type="password"
                                                className="mt-2 bg-white border-green-300 focus:ring-green-500"
                                                autoComplete="new-password"
                                                placeholder={t('settings.password.page.new_ph')}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                            <InputError message={errors.password} />
                                            <PasswordStrength value={password} />
                                        </div>

                                        <div>
                                            <Label htmlFor="password_confirmation" className="text-sm font-medium text-gray-900">
                                                {t('settings.password.page.confirm')}
                                            </Label>
                                            <Input
                                                id="password_confirmation"
                                                name="password_confirmation"
                                                type="password"
                                                className="mt-2 bg-white border-green-300 focus:ring-green-500"
                                                autoComplete="new-password"
                                                placeholder={t('settings.password.page.confirm_ph')}
                                            />
                                            <InputError message={errors.password_confirmation} />
                                        </div>
                                    </div>

                                    <div className="mt-4 p-3 bg-green-100 rounded-md">
                                        <p className="text-xs text-green-800">
                                            💡 <strong>{t('settings.password.page.tip_label')}</strong> {t('settings.password.page.tip')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pt-2">
                                    <Button
                                        disabled={processing}
                                        className="bg-blue-600 hover:bg-blue-700"
                                        data-test="update-password-button"
                                    >
                                        {processing ? t('settings.password.page.saving') : t('settings.password.page.submit')}
                                    </Button>

                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-in-out duration-300"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out duration-300"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-sm text-green-600 font-medium">
                                            {t('settings.password.page.saved')}
                                        </p>
                                    </Transition>
                                </div>
                            </>
                        )}
                    </Form>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
