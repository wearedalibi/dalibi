import { Head, router } from '@inertiajs/react';
import { ArrowLeft, BookOpen, Calendar, FileText, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Subject {
    id: string;
    name: string;
    code: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

interface ShowProps {
    subject: Subject;
}

export default function Show({ subject }: Readonly<ShowProps>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString(dateLocale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <AppLayout>
            <Head title={subject.name} />

            <div className="w-full space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => router.get(route('subjects.index'))}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                                <BookOpen className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold tracking-tight text-gray-900">{subject.name}</h1>
                                <p className="mt-2 text-gray-600">{t('parametres.subjects.show_subtitle')}</p>
                                <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                                    {subject.code}
                                </span>
                            </div>
                        </div>
                    </div>
                    <Button
                        onClick={() => router.get(route('subjects.edit', subject.id))}
                        className="bg-blue-600 hover:bg-blue-700 gap-2"
                    >
                        <Pencil className="w-4 h-4" />
                        {t('parametres.common.edit')}
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="rounded-2xl p-5 bg-linear-to-br from-blue-50/60 to-white ring-1 ring-blue-100 shadow-sm space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-blue-600" />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900">{t('parametres.subjects.info_section')}</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="rounded-xl bg-white/80 ring-1 ring-blue-100 px-4 py-3">
                                    <p className="text-xs uppercase tracking-wide text-gray-500">{t('parametres.subjects.th_code')}</p>
                                    <p className="font-semibold text-gray-900 mt-1">{subject.code}</p>
                                </div>
                                <div className="rounded-xl bg-white/80 ring-1 ring-blue-100 px-4 py-3">
                                    <p className="text-xs uppercase tracking-wide text-gray-500">{t('parametres.subjects.th_name')}</p>
                                    <p className="font-semibold text-gray-900 mt-1">{subject.name}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl p-5 bg-linear-to-br from-violet-50/60 to-white ring-1 ring-violet-100 shadow-sm space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-violet-600" />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900">{t('parametres.subjects.description')}</h2>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {subject.description || t('parametres.subjects.show_no_description')}
                            </p>
                        </div>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <div className="rounded-2xl p-5 bg-linear-to-br from-emerald-50/60 to-white ring-1 ring-emerald-100 shadow-sm space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-emerald-600" />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900">{t('parametres.subjects.history')}</h2>
                            </div>
                            <div className="space-y-3">
                                <div className="rounded-xl bg-white/80 ring-1 ring-emerald-100 px-4 py-3">
                                    <p className="text-xs uppercase tracking-wide text-gray-500">{t('parametres.subjects.created_on')}</p>
                                    <p className="font-semibold text-gray-900 mt-1">{formatDate(subject.created_at)}</p>
                                </div>
                                <div className="rounded-xl bg-white/80 ring-1 ring-emerald-100 px-4 py-3">
                                    <p className="text-xs uppercase tracking-wide text-gray-500">{t('parametres.subjects.updated_on')}</p>
                                    <p className="font-semibold text-gray-900 mt-1">{formatDate(subject.updated_at)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl p-5 bg-linear-to-br from-amber-50/60 to-white ring-1 ring-amber-100 shadow-sm">
                            <h2 className="text-lg font-semibold text-gray-900">{t('parametres.subjects.summary')}</h2>
                            <p className="text-sm text-gray-700 mt-2">
                                {t('parametres.subjects.summary_before')} <span className="font-semibold">{subject.name}</span> {t('parametres.subjects.summary_middle')}
                                {' '}
                                <span className="font-semibold">{subject.code}</span>.
                            </p>
                            <p className="text-xs text-gray-500 mt-3">
                                {t('parametres.subjects.summary_stats')}
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                className="mt-4 w-full border-gray-200 text-gray-700 hover:bg-gray-50"
                                onClick={() => router.get(route('subjects.edit', subject.id))}
                            >
                                {t('parametres.subjects.edit_this')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
