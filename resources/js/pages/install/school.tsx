import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/helpers/i18n';
import InstallLayout from '@/layouts/install/install-layout';

type Currency = { code: string; label: string; symbol: string };

type Props = {
    defaults: { locale: string; currency: string; timezone: string };
    currencies: Currency[];
    values?: Record<string, string> | null;
};

const selectClass = 'h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm';

export default function InstallSchool({ defaults, currencies, values }: Readonly<Props>) {
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
                                <Label htmlFor="level">{t('install.school.level')}</Label>
                                <select id="level" name="level" defaultValue={v.level ?? 'primaire'} className={selectClass}>
                                    <option value="primaire">{t('install.school.level_primary')}</option>
                                    <option value="college">{t('install.school.level_college')}</option>
                                    <option value="lycee">{t('install.school.level_high')}</option>
                                </select>
                                <InputError message={errors.level} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="code">{t('install.school.code')}</Label>
                                <Input id="code" name="code" defaultValue={v.code ?? ''} />
                                <InputError message={errors.code} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="currency">{t('install.school.currency')}</Label>
                                <select
                                    id="currency"
                                    name="currency"
                                    defaultValue={v.currency ?? defaults.currency}
                                    className={selectClass}
                                >
                                    {currencies.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.code} — {c.label} ({c.symbol})
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.currency} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="principal">{t('install.school.principal')}</Label>
                                <Input id="principal" name="principal" defaultValue={v.principal ?? ''} />
                                <InputError message={errors.principal} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">{t('install.school.email')}</Label>
                                <Input id="email" name="email" type="email" defaultValue={v.email ?? ''} />
                                <InputError message={errors.email} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">{t('install.school.phone')}</Label>
                                <Input id="phone" name="phone" defaultValue={v.phone ?? ''} />
                                <InputError message={errors.phone} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="address">{t('install.school.address')}</Label>
                            <Input id="address" name="address" defaultValue={v.address ?? ''} />
                            <InputError message={errors.address} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="city">{t('install.school.city')}</Label>
                                <Input id="city" name="city" defaultValue={v.city ?? ''} />
                                <InputError message={errors.city} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="region">{t('install.school.region')}</Label>
                                <Input id="region" name="region" defaultValue={v.region ?? ''} />
                                <InputError message={errors.region} />
                            </div>
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
                                    className={selectClass}
                                >
                                    <option value="trimester">{t('install.school.period_trimester')}</option>
                                    <option value="semester">{t('install.school.period_semester')}</option>
                                </select>
                                <InputError message={errors.period_type} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">{t('install.school.description')}</Label>
                            <textarea
                                id="description"
                                name="description"
                                rows={2}
                                defaultValue={v.description ?? ''}
                                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                            />
                            <InputError message={errors.description} />
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                            <Button asChild variant="outline">
                                <Link href="/install/security">
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
