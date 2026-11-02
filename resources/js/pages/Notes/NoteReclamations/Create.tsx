import { Head, router, useForm } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Student { id: string; firstname: string; lastname: string; matricule: string; }
interface Evaluation {
    id: string;
    template: { name: string; coefficient: number; max_score: number; academic_period: { name: string } };
    class_subject: { class: { name: string; code: string }; subject: { name: string } };
}

interface Props {
    evaluation: Evaluation;
    student: Student;
    originalScore: number | null;
    pendingExists: boolean;
}

export default function Create({ evaluation, student, originalScore, pendingExists }: Readonly<Props>) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        evaluation_id:   evaluation.id,
        student_id:      student.id,
        reason:          '',
        original_score:  originalScore !== null ? String(originalScore) : '',
        requested_score: '',
    });

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('note-reclamations.store'));
    };

    return (
        <AppLayout>
            <Head title={t('notes.reclamations.create.head')} />

            <div className="w-full space-y-6">

                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => history.back()}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('notes.reclamations.create.head')}</h1>
                        <p className="text-gray-500 mt-0.5">{t('notes.reclamations.create.subtitle')}</p>
                    </div>
                </div>

                {/* Evaluation info */}
                <div className="bg-red-50 ring-1 ring-red-200 rounded-2xl p-4 flex gap-3">
                    <Lock className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-red-800">{t('notes.reclamations.create.locked')}</p>
                        <p className="text-sm text-red-600 mt-0.5">
                            {evaluation.template.name} — {evaluation.class_subject.class.name} · {evaluation.class_subject.subject.name}
                        </p>
                        <p className="text-xs text-red-500 mt-0.5">{evaluation.template.academic_period.name} · {t('notes.reclamations.create.on_max', { max: evaluation.template.max_score })}</p>
                    </div>
                </div>

                {/* Student info */}
                <div className="bg-blue-50 ring-1 ring-blue-100 rounded-2xl p-4">
                    <p className="text-sm font-medium text-blue-800">{t('notes.reclamations.create.student_concerned')}</p>
                    <p className="font-bold text-blue-900 mt-0.5">{student.lastname} {student.firstname}</p>
                    <p className="text-xs text-blue-600 font-mono">{student.matricule}</p>
                </div>

                {pendingExists && (
                    <div className="bg-amber-50 ring-1 ring-amber-200 rounded-2xl p-4 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-amber-800">{t('notes.reclamations.create.pending_exists')}</p>
                            <p className="text-sm text-amber-600 mt-0.5">{t('notes.reclamations.create.pending_exists_hint')}</p>
                        </div>
                    </div>
                )}

                {!pendingExists && (
                    <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 space-y-5">

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">{t('notes.reclamations.create.current_score')}</label>
                                <div className="relative">
                                    <Input
                                        type="number" min={0} max={evaluation.template.max_score} step={0.25}
                                        value={data.original_score}
                                        onChange={e => setData('original_score', e.target.value)}
                                        placeholder="—"
                                        className={`pr-10 ${errors.original_score ? 'border-red-400' : ''}`}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">/{evaluation.template.max_score}</span>
                                </div>
                                {errors.original_score && <p className="text-xs text-red-500">{errors.original_score}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">{t('notes.reclamations.create.requested_score')}</label>
                                <div className="relative">
                                    <Input
                                        type="number" min={0} max={evaluation.template.max_score} step={0.25}
                                        value={data.requested_score}
                                        onChange={e => setData('requested_score', e.target.value)}
                                        placeholder="—"
                                        className={`pr-10 ${errors.requested_score ? 'border-red-400' : ''}`}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">/{evaluation.template.max_score}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">{t('notes.reclamations.create.reason')}</label>
                            <textarea
                                value={data.reason}
                                onChange={e => setData('reason', e.target.value)}
                                rows={4}
                                placeholder={t('notes.reclamations.create.reason_ph')}
                                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${errors.reason ? 'border-red-400' : 'border-gray-300'}`}
                            />
                            {errors.reason && <p className="text-xs text-red-500">{errors.reason}</p>}
                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                            <Button type="button" variant="outline" onClick={() => history.back()}>
                                {t('common.actions.cancel')}
                            </Button>
                            <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={processing}>
                                {processing ? t('notes.reclamations.create.submitting') : t('notes.reclamations.create.submit')}
                            </Button>
                        </div>
                    </form>
                )}

                {pendingExists && (
                    <div className="flex justify-center">
                        <Button variant="outline" onClick={() => router.get(route('note-reclamations.index'))}>
                            {t('notes.reclamations.create.view_reclamations')}
                        </Button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
