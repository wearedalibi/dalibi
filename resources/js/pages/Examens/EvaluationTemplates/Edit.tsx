import { Head, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Template {
    id: string; name: string; description: string | null;
    coefficient: number; max_score: number; date: string | null;
    academic_period_id: string; evaluation_type_id: string; class_type_id: string | null;
}
interface Props {
    template: Template;
    periods: { id: string; name: string }[];
    evaluationTypes: { id: string; name: string }[];
    classroomTypes: { id: string; name: string }[];
}

export default function Edit({ template, periods, evaluationTypes, classroomTypes }: Readonly<Props>) {
    const { t } = useTranslation();
    const [form, setForm] = useState({
        academic_period_id: template.academic_period_id,
        evaluation_type_id: template.evaluation_type_id,
        class_type_id:      template.class_type_id ?? 'all',
        name:               template.name,
        description:        template.description ?? '',
        coefficient:        String(template.coefficient),
        max_score:          String(template.max_score),
        date:               template.date ?? '',
    });
    const [errors, setErrors]       = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [k]: e.target.value }));

    const handleSubmit = () => {
        setSubmitting(true);
        const payload = { ...form, class_type_id: form.class_type_id === 'all' ? '' : form.class_type_id };
        router.put(route('evaluation-templates.update', template.id), payload, {
            onError:   e => { setErrors(e as typeof errors); setSubmitting(false); },
            onSuccess: () => setSubmitting(false),
        });
    };

    const field = (label: string, key: keyof typeof form, node: React.ReactNode) => (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            {node}
            {errors[key] && <p className="text-xs text-red-500">{errors[key]}</p>}
        </div>
    );

    return (
        <AppLayout>
            <Head title={t('examens.templates.edit.head', { name: template.name })} />

            <div className="w-full space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => router.get(route('evaluation-templates.show', template.id))}>
                        <ArrowLeft className="w-4 h-4" /> {t('common.actions.back')}
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">{t('examens.templates.edit.title')}</h1>
                </div>

                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {field(t('examens.templates.form.name'), 'name',
                            <Input value={form.name} onChange={set('name')} className={errors.name ? 'border-red-400' : ''} />
                        )}
                        {field(t('examens.templates.form.period'), 'academic_period_id',
                            <Select value={form.academic_period_id} onValueChange={v => setForm(p => ({ ...p, academic_period_id: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{periods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                            </Select>
                        )}
                        {field(t('examens.templates.form.eval_type_short'), 'evaluation_type_id',
                            <Select value={form.evaluation_type_id} onValueChange={v => setForm(p => ({ ...p, evaluation_type_id: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{evaluationTypes.map(et => <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>)}</SelectContent>
                            </Select>
                        )}
                        {field(t('examens.templates.form.class_type'), 'class_type_id',
                            <Select value={form.class_type_id} onValueChange={v => setForm(p => ({ ...p, class_type_id: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('examens.templates.form.all_types')}</SelectItem>
                                    {classroomTypes.map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                        {field(t('examens.templates.form.coefficient'), 'coefficient',
                            <Input type="number" min={0.25} max={99} step={0.25} value={form.coefficient} onChange={set('coefficient')} />
                        )}
                        {field(t('examens.templates.form.scale_short'), 'max_score',
                            <Input type="number" min={1} max={1000} step={1} value={form.max_score} onChange={set('max_score')} />
                        )}
                        {field(t('examens.templates.form.date'), 'date',
                            <Input type="date" value={form.date} onChange={set('date')} />
                        )}
                    </div>
                    {field(t('examens.templates.form.description'), 'description',
                        <textarea value={form.description} onChange={set('description')} rows={3}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    )}
                    <div className="flex gap-3 pt-2">
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSubmit} disabled={submitting}>
                            {submitting ? t('examens.templates.form.saving') : t('examens.templates.edit.submit')}
                        </Button>
                        <Button variant="outline" onClick={() => router.get(route('evaluation-templates.show', template.id))}>{t('common.actions.cancel')}</Button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
