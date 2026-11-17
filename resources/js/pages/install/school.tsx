import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/helpers/i18n';
import InstallLayout from '@/layouts/install/install-layout';

type Currency = { code: string; label: string; symbol: string };
type Country = { code: string; name: string };

type Props = {
    defaults: {
        locale: string;
        currency: string;
        country: string;
        timezone: string;
    };
    currencies: Currency[];
    countries: Country[];
    levels: string[];
    values?: (Record<string, string> & { levels?: string[] }) | null;
};

const selectClass =
    'h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm';

/** Regroupe des champs de même logique sous un intitulé discret (sans card). */
function Section({
    title,
    children,
}: Readonly<{ title: string; children: ReactNode }>) {
    return (
        <div className="grid gap-4">
            <p className="border-b border-gray-200 pb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:border-gray-700">
                {title}
            </p>
            {children}
        </div>
    );
}

export default function InstallSchool({
    defaults,
    currencies,
    countries,
    levels,
    values,
}: Readonly<Props>) {
    const { t } = useTranslation();
    const v = values ?? {};
    const selectedLevels = v.levels ?? ['primaire'];

    return (
        <InstallLayout
            step="school"
            title={t('install.school.title')}
            description={t('install.school.description')}
        >
            <Head title={t('install.school.title')} />

            <Form
                action="/install/school"
                method="post"
                className="flex flex-col gap-6"
            >
                {({ processing, errors, clearErrors }) => (
                    <div
                        className="grid gap-5"
                        onChange={(e) => {
                            // Délégation : efface l'erreur du champ dès qu'on le modifie
                            // (sinon le message resterait figé jusqu'au prochain envoi).
                            const name = (
                                e.target as HTMLInputElement
                            ).name?.replace('[]', '');
                            if (name) {
                                clearErrors(name as keyof typeof errors);
                            }
                        }}
                    >
                        {/* 1. Identité de l'établissement */}
                        <Section title={t('install.school.group_identity')}>
                            <div className="grid gap-2">
                                <Label htmlFor="name">
                                    {t('install.school.name')}
                                </Label>
                                <Input
                                    id="name"
                                    name="name"
                                    required
                                    autoFocus
                                    defaultValue={v.name ?? ''}
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="code">
                                        {t('install.school.code')}
                                    </Label>
                                    <Input
                                        id="code"
                                        name="code"
                                        defaultValue={v.code ?? ''}
                                    />
                                    <InputError message={errors.code} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="currency">
                                        {t('install.school.currency')}
                                    </Label>
                                    <select
                                        id="currency"
                                        name="currency"
                                        defaultValue={
                                            v.currency ?? defaults.currency
                                        }
                                        className={selectClass}
                                    >
                                        {currencies.map((c) => (
                                            <option key={c.code} value={c.code}>
                                                {c.code} — {c.label} ({c.symbol}
                                                )
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.currency} />
                                </div>
                            </div>

                            {/* Devise = slogan/exergue de l'école (distincte de la monnaie). */}
                            <div className="grid gap-2">
                                <Label htmlFor="devise">
                                    {t('install.school.devise')}
                                </Label>
                                <Input
                                    id="devise"
                                    name="devise"
                                    defaultValue={v.devise ?? ''}
                                    placeholder={t('install.school.devise_ph')}
                                />
                                <InputError message={errors.devise} />
                            </div>
                        </Section>

                        {/* 2. Direction & contact */}
                        <Section title={t('install.school.group_contact')}>
                            <div className="grid gap-2">
                                <Label htmlFor="principal">
                                    {t('install.school.principal')}
                                </Label>
                                <Input
                                    id="principal"
                                    name="principal"
                                    defaultValue={v.principal ?? ''}
                                />
                                <InputError message={errors.principal} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">
                                        {t('install.school.email')}
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        defaultValue={v.email ?? ''}
                                    />
                                    <InputError message={errors.email} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">
                                        {t('install.school.phone')}
                                    </Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        defaultValue={v.phone ?? ''}
                                    />
                                    <InputError message={errors.phone} />
                                </div>
                            </div>
                        </Section>

                        {/* 3. Localisation */}
                        <Section title={t('install.school.group_location')}>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="country">
                                        {t('install.school.country')}
                                    </Label>
                                    <select
                                        id="country"
                                        name="country"
                                        defaultValue={
                                            v.country ?? defaults.country
                                        }
                                        className={selectClass}
                                    >
                                        {countries.map((c) => (
                                            <option key={c.code} value={c.code}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.country} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="region">
                                        {t('install.school.region')}
                                    </Label>
                                    <Input
                                        id="region"
                                        name="region"
                                        defaultValue={v.region ?? ''}
                                    />
                                    <InputError message={errors.region} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="city">
                                        {t('install.school.city')}
                                    </Label>
                                    <Input
                                        id="city"
                                        name="city"
                                        defaultValue={v.city ?? ''}
                                    />
                                    <InputError message={errors.city} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="po_box">
                                        {t('install.school.po_box')}
                                    </Label>
                                    <Input
                                        id="po_box"
                                        name="po_box"
                                        defaultValue={v.po_box ?? ''}
                                    />
                                    <InputError message={errors.po_box} />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="address">
                                    {t('install.school.address')}
                                </Label>
                                <Input
                                    id="address"
                                    name="address"
                                    defaultValue={v.address ?? ''}
                                />
                                <InputError message={errors.address} />
                            </div>
                        </Section>

                        {/* 4. Organisation pédagogique (niveaux en bas, regroupés avec l'année & les périodes) */}
                        <Section title={t('install.school.group_pedagogy')}>
                            <div className="grid gap-2">
                                <Label>{t('install.school.levels')}</Label>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {levels.map((slug) => {
                                        const checked =
                                            selectedLevels.includes(slug);
                                        return (
                                            <label
                                                key={slug}
                                                className="flex h-11 cursor-pointer items-center gap-2 overflow-hidden rounded-md border border-input px-3 text-sm whitespace-nowrap transition-colors hover:bg-gray-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:hover:bg-gray-800 dark:has-[:checked]:bg-blue-950/40"
                                            >
                                                <input
                                                    type="checkbox"
                                                    name="levels[]"
                                                    value={slug}
                                                    defaultChecked={checked}
                                                    className="h-4 w-4 shrink-0 accent-blue-600"
                                                />
                                                {t(
                                                    `install.school.level_options.${slug}`,
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-gray-500">
                                    {t('install.school.levels_hint')}
                                </p>
                                <InputError message={errors.levels} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="academic_year_start">
                                        {t(
                                            'install.school.academic_year_start',
                                        )}
                                    </Label>
                                    <Input
                                        id="academic_year_start"
                                        name="academic_year_start"
                                        type="date"
                                        defaultValue={
                                            v.academic_year_start ?? ''
                                        }
                                    />
                                    <InputError
                                        message={errors.academic_year_start}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="period_type">
                                        {t('install.school.period_type')}
                                    </Label>
                                    <select
                                        id="period_type"
                                        name="period_type"
                                        defaultValue={
                                            v.period_type ?? 'trimester'
                                        }
                                        className={selectClass}
                                    >
                                        <option value="trimester">
                                            {t(
                                                'install.school.period_trimester',
                                            )}
                                        </option>
                                        <option value="semester">
                                            {t(
                                                'install.school.period_semester',
                                            )}
                                        </option>
                                    </select>
                                    <InputError message={errors.period_type} />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">
                                    {t('install.school.description')}
                                </Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    rows={2}
                                    defaultValue={v.description ?? ''}
                                    className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                                />
                                <InputError message={errors.description} />
                            </div>
                        </Section>

                        <div className="mt-2 flex items-center justify-between">
                            <Button asChild variant="outline">
                                <Link href="/install/security">
                                    <ArrowLeft className="h-4 w-4" />
                                    {t('install.common.back')}
                                </Link>
                            </Button>
                            <Button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={processing}
                            >
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
