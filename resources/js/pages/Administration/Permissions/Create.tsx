import { Head, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

export default function Create(): React.ReactNode {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        router.post(route('permissions.store'), formData, {
            onError: (errors) => {
                setErrors(errors as Record<string, string>);
                setIsSubmitting(false);
            },
            onSuccess: () => {
                setIsSubmitting(false);
            },
        });
    };

    return (
        <AppLayout>
            <Head title={t('administration.permissions.create.head')} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.get(route('permissions.index'))}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {t('administration.permissions.create.title')}
                        </h1>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
                    {/* Nom de la permission */}
                    <div className="bg-white rounded-lg border p-6">
                        <label htmlFor="perm-name" className="block text-sm font-medium text-gray-900 mb-2">
                            {t('administration.permissions.create.name')}
                        </label>
                        <Input
                            id="perm-name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder={t('administration.permissions.create.name_ph')}
                            className={errors.name ? 'border-red-500' : ''}
                        />
                        {errors.name && (
                            <p className="text-red-600 text-sm mt-1">{errors.name}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-2">
                            {t('administration.permissions.create.name_hint')}
                        </p>
                    </div>

                    {/* Description */}
                    <div className="bg-white rounded-lg border p-6">
                        <label htmlFor="perm-description" className="block text-sm font-medium text-gray-900 mb-2">
                            {t('administration.permissions.create.description')}
                        </label>
                        <textarea
                            id="perm-description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder={t('administration.permissions.create.description_ph')}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Boutons */}
                    <div className="flex gap-3">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSubmitting ? t('administration.permissions.create.creating') : t('administration.permissions.create.create')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.get(route('permissions.index'))}
                        >
                            {t('administration.permissions.create.cancel')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
