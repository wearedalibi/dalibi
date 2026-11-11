import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';
import GradingConfigFields, { type ClassroomType, type GradingConfigForm, type MentionRow, type School } from './config-fields';

interface Config {
    id: string;
    name: string;
    school_id: string;
    classroom_type_id: string | null;
    passing_score: number;
    default_max_score: number;
    class_weight: number;
    comp_weight: number;
    round_precision: number;
    mentions: { label: string; min: number }[] | null;
    school: School;
}

interface Props {
    config: Config;
    schools: School[];
    classroomTypes: ClassroomType[];
    defaultMentions: { label: string; min: number }[];
}

export default function Edit({ config, schools, classroomTypes, defaultMentions }: Readonly<Props>) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm<GradingConfigForm>({
        school_id:         config.school_id,
        classroom_type_id: config.classroom_type_id ?? '',
        name:              config.name,
        passing_score:     String(config.passing_score),
        default_max_score: String(config.default_max_score),
        class_weight:      String(config.class_weight),
        comp_weight:       String(config.comp_weight),
        round_precision:   String(config.round_precision),
        mentions:          (config.mentions ?? defaultMentions).map((m): MentionRow => ({ label: m.label, min: String(m.min) })),
    });

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('grading-configs.update', config.id));
    };

    return (
        <AppLayout>
            <Head title={t('parametres.grading_configs.edit_head', { name: config.name })} />

            <div className="w-full space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => router.get(route('grading-configs.index'))}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('parametres.grading_configs.edit_title')}</h1>
                        <p className="text-gray-500 mt-0.5">{config.name} — {config.school.name}</p>
                    </div>
                </div>

                <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 space-y-5">
                    <GradingConfigFields data={data} setData={setData} errors={errors} schools={schools} classroomTypes={classroomTypes} />

                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <Button type="button" variant="outline" onClick={() => router.get(route('grading-configs.index'))}>
                            {t('parametres.common.cancel')}
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={processing}>
                            {processing ? t('parametres.grading_configs.saving') : t('parametres.common.save')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
