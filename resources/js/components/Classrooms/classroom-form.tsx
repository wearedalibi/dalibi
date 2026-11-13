import { Building2, Save, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/helpers/i18n';

export interface ClassroomTypeOption {
    id: string;
    name: string;
}

export interface ClassroomFormData {
    name: string;
    code: string;
    capacity: number;
    expected_age: number | null;
    classroom_type_id: string;
}

interface ClassroomFormProps {
    mode: 'create' | 'edit';
    data: ClassroomFormData;
    errors: Record<string, string>;
    processing: boolean;
    classroomTypes: ClassroomTypeOption[];
    onCancel: () => void;
    onSubmit: (event: React.SubmitEvent<HTMLFormElement>) => void;
    setData: <K extends keyof ClassroomFormData>(key: K, value: ClassroomFormData[K]) => void;
}

export function ClassroomForm({
    mode,
    data,
    errors,
    processing,
    classroomTypes,
    onCancel,
    onSubmit,
    setData,
}: Readonly<ClassroomFormProps>) {
    const { t } = useTranslation();
    let submitLabel = t('parametres.common.update');

    if (processing && mode === 'create') {
        submitLabel = t('parametres.classrooms.creating');
    } else if (processing) {
        submitLabel = t('parametres.common.updating');
    } else if (mode === 'create') {
        submitLabel = t('parametres.classrooms.submit_create');
    }

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="rounded-2xl p-5 bg-linear-to-br from-blue-50/60 to-white ring-1 ring-blue-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('parametres.classrooms.form_info')}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">{t('parametres.classrooms.label_name')} *</label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(event) => setData('name', event.target.value)}
                            disabled={processing}
                            className={errors.name ? 'border-red-500 bg-red-50/40' : 'border-gray-200 bg-white focus-visible:ring-blue-500'}
                            placeholder={t('parametres.classrooms.name_ph')}
                        />
                        {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                    </div>

                    <div>
                        <label htmlFor="code" className="block text-sm font-medium text-gray-900 mb-2">{t('parametres.classrooms.label_code')} *</label>
                        <Input
                            id="code"
                            value={data.code}
                            onChange={(event) => setData('code', event.target.value)}
                            disabled={processing}
                            className={errors.code ? 'border-red-500 bg-red-50/40' : 'border-gray-200 bg-white focus-visible:ring-blue-500'}
                            placeholder={t('parametres.classrooms.code_ph')}
                        />
                        {errors.code && <p className="text-sm text-red-600 mt-1">{errors.code}</p>}
                    </div>

                    <div>
                        <label htmlFor="capacity" className="block text-sm font-medium text-gray-900 mb-2">{t('parametres.classrooms.label_capacity')} *</label>
                        <Input
                            id="capacity"
                            type="number"
                            min={1}
                            max={200}
                            value={data.capacity}
                            onChange={(event) => {
                                const nextValue = Number(event.target.value);
                                setData('capacity', Number.isNaN(nextValue) ? 0 : nextValue);
                            }}
                            disabled={processing}
                            className={errors.capacity ? 'border-red-500 bg-red-50/40' : 'border-gray-200 bg-white focus-visible:ring-blue-500'}
                        />
                        {errors.capacity && <p className="text-sm text-red-600 mt-1">{errors.capacity}</p>}
                    </div>

                    <div>
                        <label htmlFor="expected_age" className="block text-sm font-medium text-gray-900 mb-2">{t('parametres.classrooms.label_expected_age')}</label>
                        <Input
                            id="expected_age"
                            type="number"
                            min={3}
                            max={30}
                            placeholder={t('parametres.classrooms.expected_age_ph')}
                            value={data.expected_age ?? ''}
                            onChange={(event) => {
                                const v = event.target.value;
                                setData('expected_age', v === '' ? null : Number(v));
                            }}
                            disabled={processing}
                            className={errors.expected_age ? 'border-red-500 bg-red-50/40' : 'border-gray-200 bg-white focus-visible:ring-blue-500'}
                        />
                        <p className="text-xs text-gray-400 mt-1">{t('parametres.classrooms.expected_age_hint')}</p>
                        {errors.expected_age && <p className="text-sm text-red-600 mt-1">{errors.expected_age}</p>}
                    </div>

                    <div>
                        <label htmlFor="classroom_type_id" className="block text-sm font-medium text-gray-900 mb-2">{t('parametres.classrooms.label_type')}</label>
                        <select
                            id="classroom_type_id"
                            value={data.classroom_type_id}
                            onChange={(event) => setData('classroom_type_id', event.target.value)}
                            disabled={processing}
                            className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                                errors.classroom_type_id
                                    ? 'border-red-500 bg-red-50/40'
                                    : 'border-gray-200 bg-white focus-visible:ring-2 focus-visible:ring-blue-500'
                            }`}
                        >
                            <option value="">{t('parametres.classrooms.type_none')}</option>
                            {classroomTypes.map((type) => (
                                <option key={type.id} value={type.id}>
                                    {type.name}
                                </option>
                            ))}
                        </select>
                        {errors.classroom_type_id && <p className="text-sm text-red-600 mt-1">{errors.classroom_type_id}</p>}
                    </div>
                </div>
            </div>

            <div className="rounded-2xl p-5 bg-linear-to-br from-emerald-50/60 to-white ring-1 ring-emerald-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 ring-1 ring-emerald-100">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('parametres.classrooms.preview')}</h3>
                </div>
                <p className="text-sm text-gray-700">
                    {t('parametres.classrooms.preview_text_before')} <span className="font-semibold">{data.capacity || 0}</span> {t('parametres.classrooms.preview_text_after')}
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