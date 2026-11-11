import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/helpers/i18n';

export interface School { id: string; name: string }
export interface ClassroomType { id: string; name: string; period_system: string }
export interface MentionRow { label: string; min: string }

export interface GradingConfigForm {
    school_id: string;
    classroom_type_id: string;
    name: string;
    passing_score: string;
    default_max_score: string;
    class_weight: string;
    comp_weight: string;
    round_precision: string;
    mentions: MentionRow[];
}

const PRECISION_VALUES = ['0', '1', '2', '3'] as const;

const ALL = '__all__';

interface Props {
    data: GradingConfigForm;
    setData: (key: keyof GradingConfigForm, value: GradingConfigForm[keyof GradingConfigForm]) => void;
    errors: Partial<Record<string, string>>;
    schools: School[];
    classroomTypes: ClassroomType[];
}

export default function GradingConfigFields({ data, setData, errors, schools, classroomTypes }: Readonly<Props>) {
    const { t } = useTranslation();
    const classTotal = (parseFloat(data.class_weight) || 0) + (parseFloat(data.comp_weight) || 0);
    const pct = (w: string) => (classTotal > 0 ? Math.round(((parseFloat(w) || 0) / classTotal) * 100) : 0);

    const setMention = (i: number, patch: Partial<MentionRow>) => {
        const next = data.mentions.map((m, j) => (j === i ? { ...m, ...patch } : m));
        setData('mentions', next);
    };
    const addMention = () => setData('mentions', [...data.mentions, { label: '', min: '' }]);
    const removeMention = (i: number) => setData('mentions', data.mentions.filter((_, j) => j !== i));

    return (
        <>
            {/* École + type de classe */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">{t('parametres.grading_configs.school_label')}</label>
                    <Select value={data.school_id} onValueChange={(v) => setData('school_id', v)}>
                        <SelectTrigger className={errors.school_id ? 'border-red-400' : ''}>
                            <SelectValue placeholder={t('parametres.grading_configs.school_ph')} />
                        </SelectTrigger>
                        <SelectContent>
                            {schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {errors.school_id && <p className="text-xs text-red-500">{errors.school_id}</p>}
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">{t('parametres.grading_configs.class_type_label')}</label>
                    <Select
                        value={data.classroom_type_id || ALL}
                        onValueChange={(v) => setData('classroom_type_id', v === ALL ? '' : v)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>{t('parametres.grading_configs.all_classes')}</SelectItem>
                            {classroomTypes.map((ct) => (
                                <SelectItem key={ct.id} value={ct.id}>
                                    {ct.name} ({ct.period_system})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">{t('parametres.grading_configs.class_type_hint')}</p>
                </div>
            </div>

            {/* Nom */}
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">{t('parametres.grading_configs.name_label')}</label>
                <Input
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder={t('parametres.grading_configs.name_ph')}
                    className={errors.name ? 'border-red-400' : ''}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">{t('parametres.grading_configs.passing_label')}</label>
                    <div className="relative">
                        <Input
                            type="number" min={0} max={100} step={0.5}
                            value={data.passing_score}
                            onChange={(e) => setData('passing_score', e.target.value)}
                            className={`pr-12 ${errors.passing_score ? 'border-red-400' : ''}`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">/ {data.default_max_score}</span>
                    </div>
                    {errors.passing_score && <p className="text-xs text-red-500">{errors.passing_score}</p>}
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">{t('parametres.grading_configs.max_label')}</label>
                    <Input
                        type="number" min={1} max={100} step={1}
                        value={data.default_max_score}
                        onChange={(e) => setData('default_max_score', e.target.value)}
                        className={errors.default_max_score ? 'border-red-400' : ''}
                    />
                </div>
            </div>

            {/* Pondération Classe / Composition */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('parametres.grading_configs.weight_label')}</label>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <span className="text-xs text-gray-500">{t('parametres.grading_configs.class_weight_label')}</span>
                        <Input type="number" min={0} max={10} step={0.5} value={data.class_weight}
                            onChange={(e) => setData('class_weight', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs text-gray-500">{t('parametres.grading_configs.comp_weight_label')}</span>
                        <Input type="number" min={0} max={10} step={0.5} value={data.comp_weight}
                            onChange={(e) => setData('comp_weight', e.target.value)} />
                    </div>
                </div>
                {classTotal > 0 && (
                    <div className="flex gap-2 mt-1">
                        <div className="flex-1 text-center">
                            <div className="text-lg font-bold text-blue-600">{pct(data.class_weight)}%</div>
                            <div className="text-xs text-gray-400">{t('parametres.grading_configs.pct_class')}</div>
                        </div>
                        <div className="flex-1 text-center">
                            <div className="text-lg font-bold text-blue-600">{pct(data.comp_weight)}%</div>
                            <div className="text-xs text-gray-400">{t('parametres.grading_configs.pct_comp')}</div>
                        </div>
                    </div>
                )}
                <p className="text-xs text-gray-400">{t('parametres.grading_configs.formula', { cw: data.class_weight || 0, pw: data.comp_weight || 0, total: classTotal || 1 })}</p>
            </div>

            {/* Arrondi */}
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">{t('parametres.grading_configs.precision_label')}</label>
                <Select value={data.round_precision} onValueChange={(v) => setData('round_precision', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {PRECISION_VALUES.map((v) => <SelectItem key={v} value={v}>{t(`parametres.grading_configs.precision_${v}`)}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* Mentions */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">{t('parametres.grading_configs.mentions_label')}</label>
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addMention}>
                        <Plus className="w-3.5 h-3.5" /> {t('parametres.grading_configs.add')}
                    </Button>
                </div>
                <div className="space-y-2">
                    {data.mentions.length === 0 && <p className="text-xs text-gray-400">{t('parametres.grading_configs.no_mentions')}</p>}
                    {data.mentions.map((m, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <Input value={m.label} placeholder={t('parametres.grading_configs.mention_label_ph')}
                                onChange={(e) => setMention(i, { label: e.target.value })} className="flex-1" />
                            <span className="text-xs text-gray-400">≥</span>
                            <Input type="number" min={0} max={20} step={0.5} value={m.min}
                                onChange={(e) => setMention(i, { min: e.target.value })} className="w-24" />
                            <Button type="button" variant="outline" size="sm"
                                className="border-red-200 text-red-500 hover:bg-red-50" onClick={() => removeMention(i)}>
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-gray-400">{t('parametres.grading_configs.mentions_hint')}</p>
            </div>
        </>
    );
}
