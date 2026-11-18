import { Form, Head } from '@inertiajs/react';
import { ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/helpers/i18n';
import InstallLayout from '@/layouts/install/install-layout';

type Locale = { code: string; label: string; flag: string };

type Props = {
    locales: Locale[];
    current: string;
};

export default function InstallWelcome({ locales, current }: Readonly<Props>) {
    const { t } = useTranslation();
    const [selected, setSelected] = useState(current);

    return (
        <InstallLayout step="language" title={t('install.welcome.title')} description={t('install.welcome.description')}>
            <Head title={t('install.welcome.title')} />

            <Form action="/install/language" method="post" className="flex flex-col gap-6">
                {({ processing }) => (
                    <div className="grid gap-6">
                        <input type="hidden" name="locale" value={selected} />

                        <div className="grid grid-cols-2 gap-3">
                            {locales.map((locale) => {
                                const active = selected === locale.code;
                                return (
                                    <button
                                        key={locale.code}
                                        type="button"
                                        onClick={() => setSelected(locale.code)}
                                        className={[
                                            'flex items-center gap-3 rounded-lg border p-4 text-left transition',
                                            active
                                                ? 'border-blue-600 ring-1 ring-blue-600'
                                                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700',
                                        ].join(' ')}
                                    >
                                        <span className="text-2xl" aria-hidden="true">
                                            {locale.flag}
                                        </span>
                                        <span className="flex-1">
                                            <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {locale.label}
                                            </span>
                                            <span className="block text-xs text-gray-500">{locale.code}</span>
                                        </span>
                                        {active && <Check className="h-5 w-5 text-blue-600" />}
                                    </button>
                                );
                            })}
                        </div>

                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={processing}>
                            {processing && <Spinner />}
                            {t('install.common.continue')}
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </Form>
        </InstallLayout>
    );
}
