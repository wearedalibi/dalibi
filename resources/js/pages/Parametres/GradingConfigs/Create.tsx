import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';
import GradingConfigFields, { type ClassroomType, type GradingConfigForm, type MentionRow, type School } from './config-fields';

interface Props {
    schools: School[];
    classroomTypes: ClassroomType[];
    defaultMentions: { label: string; min: number }[];
    preselectedSchoolId: string | null;
}

export default function Create({ schools, classroomTypes, defaultMentions, preselectedSchoolId }: Readonly<Props>) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm<GradingConfigForm>({
        school_id:         preselectedSchoolId ?? '',
        classroom_type_id: '',
        name:              '',
        passing_score:     '10',
        default_max_score: '20',
        class_weight:      '1',
        comp_weight:       '1',
        round_precision:   '2',
        mentions:          defaultMentions.map((m): MentionRow => ({ label: m.label, min: String(m.min) })),
    });

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('grading-configs.store'));
    };

    return (
        <AppLayout>
            <Head title={t('parametres.grading_configs.create_head')} />

            <div className="w-full space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => router.get(route('grading-configs.index'))}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('parametres.grading_configs.create_title')}</h1>
                        <p className="text-gray-500 mt-0.5">{t('parametres.grading_configs.create_subtitle')}</p>
                    </div>
                </div>

                <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 space-y-5">
                    <GradingConfigFields data={data} setData={setData} errors={errors} schools={schools} classroomTypes={classroomTypes} />

                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <Button type="button" variant="outline" onClick={() => router.get(route('grading-configs.index'))}>
                            {t('parametres.common.cancel')}
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={processing}>
                            {processing ? t('parametres.common.creating') : t('parametres.grading_configs.submit_create')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
