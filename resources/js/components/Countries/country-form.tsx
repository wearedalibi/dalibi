import { Globe, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/helpers/i18n';

export interface CountryFormData {
    name: string;
    code: string;
}

interface CountryFormProps {
    mode: 'create' | 'edit';
    data: CountryFormData;
    errors: Record<string, string>;
    processing: boolean;
    onCancel: () => void;
    onSubmit: (event: React.SubmitEvent<HTMLFormElement>) => void;
    setData: <K extends keyof CountryFormData>(key: K, value: CountryFormData[K]) => void;
}

export function CountryForm({ mode, data, errors, processing, onCancel, onSubmit, setData }: Readonly<CountryFormProps>) {
    const { t } = useTranslation();
    let submitLabel = t('parametres.common.update');
    if (processing && mode === 'create') submitLabel = t('parametres.common.creating');
    else if (processing) submitLabel = t('parametres.common.updating');
    else if (mode === 'create') submitLabel = t('parametres.countries.submit_create');

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="rounded-2xl p-5 bg-linear-to-br from-blue-50/60 to-white ring-1 ring-blue-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('parametres.countries.form_section')}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">{t('parametres.countries.name')} *</label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(event) => setData('name', event.target.value)}
                            disabled={processing}
                            placeholder={t('parametres.countries.name_ph')}
                            className={errors.name ? 'border-red-500 bg-red-50/40' : 'border-gray-200 bg-white focus-visible:ring-blue-500'}
                        />
                        {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                    </div>

                    <div>
                        <label htmlFor="code" className="block text-sm font-medium text-gray-900 mb-2">{t('parametres.countries.code')} *</label>
                        <Input
                            id="code"
                            value={data.code}
                            onChange={(event) => setData('code', event.target.value.toUpperCase())}
                            disabled={processing}
                            placeholder={t('parametres.countries.code_ph')}
                            className={errors.code ? 'border-red-500 bg-red-50/40' : 'border-gray-200 bg-white focus-visible:ring-blue-500'}
                        />
                        <p className="text-xs text-gray-500 mt-1">{t('parametres.countries.code_hint')}</p>
                        {errors.code && <p className="text-sm text-red-600 mt-1">{errors.code}</p>}
                    </div>
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onCancel} disabled={processing} className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50">
                    {t('parametres.common.cancel')}
                </Button>
                <Button type="submit" disabled={processing} className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm">
                    <Save className="w-4 h-4" />
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
