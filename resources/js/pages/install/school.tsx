import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/helpers/i18n';
import InstallLayout from '@/layouts/install/install-layout';

type Props = {
    defaults: { locale: string; currency: string; timezone: string };
    values?: Record<string, string> | null;
};

export default function InstallSchool({ defaults, values }: Readonly<Props>) {
    const { t } = useTranslation();
    const v = values ?? {};

    return (
        <InstallLayout step="school" title={t('install.school.title')} description={t('install.school.description')}>
            <Head title={t('install.school.title')} />

            <Form action="/install/school" method="post" className="flex flex-col gap-6">
                {({ processing, errors }) => (
                    <div className="grid gap-5">
                        <div className="grid gap-2">
                            <Label htmlFor="name">{t('install.school.name')}</Label>
                            <Input id="name" name="name" required autoFocus defaultValue={v.name ?? ''} />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="code">{t('install.school.code')}</Label>
                                <Input id="code" name="code" defaultValue={v.code ?? ''} />
                                <InputError message={errors.code} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="currency">{t('install.school.currency')}</Label>
                                <Input id="currency" name="currency" defaultValue={v.currency ?? defaults.currency} />
                                <InputError message={errors.currency} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="timezone">{t('install.school.timezone')}</Label>
                            <Input id="timezone" name="timezone" defaultValue={v.timezone ?? defaults.timezone} />
                            <InputError message={errors.timezone} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="academic_year_start">{t('install.school.academic_year_start')}</Label>
                                <Input
                                    id="academic_year_start"
                                    name="academic_year_start"
                                    type="date"
                                    defaultValue={v.academic_year_start ?? ''}
                                />
                                <InputError message={errors.academic_year_start} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="period_type">{t('install.school.period_type')}</Label>
                                <select
                                    id="period_type"
                                    name="period_type"
                                    defaultValue={v.period_type ?? 'trimester'}
                                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                >
                                    <option value="trimester">{t('install.school.period_trimester')}</option>
                                    <option value="semester">{t('install.school.period_semester')}</option>
                                </select>
                                <InputError message={errors.period_type} />
                            </div>
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
