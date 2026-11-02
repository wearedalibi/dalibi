import { Head, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Permission {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

interface EditProps {
    permission: Permission;
}

export default function Edit({ permission }: Readonly<EditProps>) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: permission.name,
        description: permission.description || '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        router.put(route('permissions.update', permission.id), formData, {
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
            <Head title={t('administration.permissions.edit.head', { name: permission.name })} />

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
                            {t('administration.permissions.edit.title')}
                        </h1>
                        <p className="text-gray-600 mt-1">{permission.name}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
                    {/* Nom de la permission */}
                    <div className="bg-white rounded-lg border p-6">
                        <label htmlFor="edit-perm-name" className="block text-sm font-medium text-gray-900 mb-2">
                            {t('administration.permissions.edit.name')}
                        </label>
                        <Input
                            id="edit-perm-name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder={t('administration.permissions.edit.name_ph')}
                            className={errors.name ? 'border-red-500' : ''}
                        />
                        {errors.name && (
                            <p className="text-red-600 text-sm mt-1">{errors.name}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-2">
                            {t('administration.permissions.edit.name_hint')}
                        </p>
                    </div>

                    {/* Description */}
                    <div className="bg-white rounded-lg border p-6">
                        <label htmlFor="edit-perm-description" className="block text-sm font-medium text-gray-900 mb-2">
                            {t('administration.permissions.edit.description')}
                        </label>
                        <textarea
                            id="edit-perm-description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder={t('administration.permissions.edit.description_ph')}
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
                            {isSubmitting ? t('administration.permissions.edit.updating') : t('administration.permissions.edit.update')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.get(route('permissions.index'))}
                        >
                            {t('administration.permissions.edit.cancel')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
