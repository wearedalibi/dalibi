import { ClipboardList, Save, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/helpers/i18n';

export interface EvaluationTypeFormData {
    name: string;
    category: string;
    description: string;
}

const CATEGORY_KEYS = ['continu', 'composition'] as const;

interface EvaluationTypeFormProps {
    mode: 'create' | 'edit';
    data: EvaluationTypeFormData;
    errors: Record<string, string>;
    processing: boolean;
    onCancel: () => void;
    onSubmit: (event: React.SubmitEvent<HTMLFormElement>) => void;
    setData: <K extends keyof EvaluationTypeFormData>(key: K, value: EvaluationTypeFormData[K]) => void;
}

export function EvaluationTypeForm({
    mode,
    data,
    errors,
    processing,
    onCancel,
    onSubmit,
    setData,
}: Readonly<EvaluationTypeFormProps>) {
    const { t } = useTranslation();
    const categoryLabel = (key: string) =>
        key === 'continu' || key === 'composition'
            ? t(`parametres.evaluation_types.cat_${key}`)
            : key;

    let submitLabel = t('parametres.common.update');

    if (processing && mode === 'create') {
        submitLabel = t('parametres.common.creating');
    } else if (processing) {
        submitLabel = t('parametres.common.updating');
    } else if (mode === 'create') {
        submitLabel = t('parametres.evaluation_types.submit_create');
    }

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="rounded-2xl p-5 bg-linear-to-br from-blue-50/60 to-white ring-1 ring-blue-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('parametres.evaluation_types.form_section')}</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">{t('parametres.evaluation_types.name_label')}</label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(event) => setData('name', event.target.value)}
                            disabled={processing}
                            placeholder={t('parametres.evaluation_types.name_ph')}
                            className={errors.name ? 'border-red-500 bg-red-50/40' : 'border-gray-200 bg-white focus-visible:ring-blue-500'}
                        />
                        {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">{t('parametres.evaluation_types.category_label')}</label>
                        <Select value={data.category} onValueChange={(v) => setData('category', v)} disabled={processing}>
                            <SelectTrigger className={errors.category ? 'border-red-500 bg-red-50/40' : 'border-gray-200 bg-white'}>
                                <SelectValue placeholder={t('parametres.evaluation_types.category_ph')} />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORY_KEYS.map((value) => (
                                    <SelectItem key={value} value={value}>{categoryLabel(value)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">{t('parametres.evaluation_types.category_hint')}</p>
                        {errors.category && <p className="text-sm text-red-600 mt-1">{errors.category}</p>}
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">{t('parametres.evaluation_types.description_label')}</label>
                        <Textarea
                            id="description"
                            rows={4}
                            value={data.description}
                            onChange={(event) => setData('description', event.target.value)}
                            disabled={processing}
                            placeholder={t('parametres.evaluation_types.description_ph')}
                            className={errors.description ? 'border-red-500 bg-red-50/40' : 'border-gray-200 bg-white focus-visible:ring-blue-500'}
                        />
                        {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
                    </div>
                </div>
            </div>

            <div className="rounded-2xl p-5 bg-linear-to-br from-amber-50/60 to-white ring-1 ring-amber-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('parametres.evaluation_types.preview')}</h3>
                </div>
                <p className="text-sm text-gray-700 mt-3">
                    <span className="font-semibold">{data.name || t('parametres.evaluation_types.preview_name')}</span>
                    {data.category && <span className="ml-2 text-xs text-gray-500">— {categoryLabel(data.category)}</span>}
                </p>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                    {data.description || t('parametres.evaluation_types.preview_no_description')}
                </p>
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