import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Globe, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Country {
    id: string;
    name: string;
    code: string;
    created_at: string;
    updated_at: string;
}

export default function Show({ country }: Readonly<{ country: Country }>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
        <AppLayout>
            <Head title={country.name} />

            <div className="w-full space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={() => router.get(route('countries.index'))} className="p-2 hover:bg-gray-100 rounded-lg transition">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                                <Globe className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold tracking-tight text-gray-900">{country.name}</h1>
                                <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">{country.code}</span>
                            </div>
                        </div>
                    </div>
                    <Button onClick={() => router.get(route('countries.edit', country.id))} className="bg-blue-600 hover:bg-blue-700 gap-2">
                        <Pencil className="w-4 h-4" /> {t('parametres.common.edit')}
                    </Button>
                </div>

                <div className="rounded-2xl p-5 bg-linear-to-br from-blue-50/60 to-white ring-1 ring-blue-100 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-xl bg-white/80 ring-1 ring-blue-100 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-gray-500">{t('parametres.countries.name')}</p>
                            <p className="font-semibold text-gray-900 mt-1">{country.name}</p>
                        </div>
                        <div className="rounded-xl bg-white/80 ring-1 ring-blue-100 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-gray-500">{t('parametres.countries.code')}</p>
                            <p className="font-semibold text-gray-900 mt-1">{country.code}</p>
                        </div>
                        <div className="rounded-xl bg-white/80 ring-1 ring-blue-100 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-gray-500">{t('parametres.common.created_on')}</p>
                            <p className="font-semibold text-gray-900 mt-1">{formatDate(country.created_at)}</p>
                        </div>
                        <div className="rounded-xl bg-white/80 ring-1 ring-blue-100 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-gray-500">{t('parametres.common.updated_on')}</p>
                            <p className="font-semibold text-gray-900 mt-1">{formatDate(country.updated_at)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
