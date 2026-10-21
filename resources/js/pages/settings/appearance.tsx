import { Head, router } from '@inertiajs/react';
import { Palette, Languages } from 'lucide-react';
import AppearanceTabs from '@/components/appearance-tabs';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit as editAppearance } from '@/routes/appearance';
import type { BreadcrumbItem } from '@/types';

export default function Appearance() {
    const { t, locale, locales } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('settings.appearance.title'),
            href: editAppearance().url,
        },
    ];

    const changeLanguage = (value: string) => {
        if (value === locale) {
            return;
        }
        router.patch('/settings/language', { locale: value }, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('settings.appearance.title')} />

            <h1 className="sr-only flex items-center gap-3"><Palette className="h-7 w-7 text-blue-600 shrink-0" />{t('settings.appearance.title')}</h1>

            <SettingsLayout bare>
                <div className="space-y-6">
                    {/* En-tête */}
                    <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-50 to-cyan-50 p-6 ring-1 ring-blue-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                                <Palette className="h-7 w-7" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{t('settings.appearance.title')}</h2>
                                <p className="text-sm text-gray-600">{t('settings.appearance.desc')}</p>
                            </div>
                        </div>
                        <Palette className="pointer-events-none absolute -right-4 -bottom-6 h-32 w-32 text-blue-600 opacity-[0.07]" />
                    </div>

                    {/* Thème */}
                    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                        <AppearanceTabs />
                    </div>

                    {/* Langue */}
                    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                        <div className="flex items-center gap-2 mb-1">
                            <Languages className="h-5 w-5 text-blue-600" />
                            <h3 className="font-semibold text-gray-900">{t('settings.language.title')}</h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">{t('settings.language.desc')}</p>
                        <label htmlFor="locale" className="block text-sm font-medium text-gray-700 mb-1.5">
                            {t('settings.language.label')}
                        </label>
                        <select
                            id="locale"
                            value={locale}
                            onChange={(e) => changeLanguage(e.target.value)}
                            className="w-full max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            {locales.map((l) => (
                                <option key={l.code} value={l.code}>
                                    {l.flag} {l.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
