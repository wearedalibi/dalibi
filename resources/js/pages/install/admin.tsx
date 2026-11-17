import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordStrength from '@/components/password-strength';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/helpers/i18n';
import InstallLayout from '@/layouts/install/install-layout';

type Props = {
    values?: { firstname?: string; lastname?: string; email?: string } | null;
};

export default function InstallAdmin({ values }: Readonly<Props>) {
    const { t } = useTranslation();
    const v = values ?? {};
    const [password, setPassword] = useState('');
    const [show, setShow] = useState(false);

    return (
        <InstallLayout step="admin" title={t('install.admin.title')} description={t('install.admin.description')}>
            <Head title={t('install.admin.title')} />

            <Form action="/install/admin" method="post" resetOnSuccess={['password', 'password_confirmation']} className="flex flex-col gap-6">
                {({ processing, errors }) => (
                    <div className="grid gap-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="firstname">{t('install.admin.firstname')}</Label>
                                <Input id="firstname" name="firstname" required autoFocus defaultValue={v.firstname ?? ''} />
                                <InputError message={errors.firstname} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="lastname">{t('install.admin.lastname')}</Label>
                                <Input id="lastname" name="lastname" required defaultValue={v.lastname ?? ''} />
                                <InputError message={errors.lastname} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">{t('install.admin.email')}</Label>
                            <Input id="email" name="email" type="email" required autoComplete="email" defaultValue={v.email ?? ''} />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">{t('install.admin.password')}</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={show ? 'text' : 'password'}
                                    required
                                    autoComplete="new-password"
                                    className="pr-10"
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShow(!show)}
                                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 transition hover:text-gray-700"
                                >
                                    {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            <InputError message={errors.password} />
                            <PasswordStrength value={password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">{t('install.admin.password_confirmation')}</Label>
                            <Input id="password_confirmation" name="password_confirmation" type="password" required autoComplete="new-password" />
                            <InputError message={errors.password_confirmation} />
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                            <Button asChild variant="outline">
                                <Link href="/install">
                                    <ArrowLeft className="h-4 w-4" />
                                    {t('install.common.back')}
                                </Link>
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={processing}>
                                {processing && <Spinner />}
                                {t('install.common.continue')}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Form>
        </InstallLayout>
    );
}
