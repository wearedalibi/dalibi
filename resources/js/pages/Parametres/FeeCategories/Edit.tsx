import { Head, router } from '@inertiajs/react';
import { ArrowLeft, FileText, Tag } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface FeeCategorie {
    id: string;
    name: string;
    description: string | null;
}

interface EditProps {
    feeCategorie: FeeCategorie;
}

export default function Edit({ feeCategorie }: Readonly<EditProps>) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: feeCategorie.name,
        description: feeCategorie.description || '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        router.put(route('fee-categories.update', feeCategorie.id), formData as never, {
            onError: (validationErrors) => {
                setErrors(validationErrors);
                setIsSubmitting(false);
            },
            onSuccess: () => setIsSubmitting(false),
        });
    };

    return (
        <AppLayout>
            <Head title={t('parametres.fee_categories.edit_head')} />

            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => router.get(route('fee-categories.index'))}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('parametres.fee_categories.edit_title')}</h1>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="rounded-2xl bg-linear-to-br from-amber-50 to-white ring-1 ring-amber-100 p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 text-amber-700">
                                <Tag className="h-4 w-4" />
                                <p className="text-sm font-semibold">{t('parametres.fee_categories.identity')}</p>
                            </div>
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                                    {t('parametres.fee_categories.name_label')}
                                </label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                                    className={`${errors.name ? 'border-red-500 bg-white/90' : 'border-slate-200 bg-white/90'}`}
                                    placeholder={t('parametres.fee_categories.name_ph')}
                                />
                                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                            </div>
                        </div>

                        <div className="rounded-2xl bg-linear-to-br from-cyan-50 to-white ring-1 ring-cyan-100 p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 text-cyan-700">
                                <FileText className="h-4 w-4" />
                                <p className="text-sm font-semibold">{t('parametres.fee_categories.description')}</p>
                            </div>
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
                                    {t('parametres.fee_categories.description')}
                                </label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                                    className={`w-full px-3 py-2 rounded-lg bg-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                                        errors.description ? 'border border-red-500' : 'border border-slate-200'
                                    }`}
                                    placeholder={t('parametres.fee_categories.description_ph')}
                                    rows={4}
                                />
                                {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                            {isSubmitting ? t('parametres.common.updating') : t('parametres.common.update')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="border-slate-200 text-gray-700"
                            onClick={() => router.get(route('fee-categories.index'))}
                        >
                            {t('parametres.common.cancel')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
