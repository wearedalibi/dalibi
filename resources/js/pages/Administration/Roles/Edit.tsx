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
}

interface Role {
    id: string;
    name: string;
    description: string | null;
    permissions: Permission[];
    created_at: string;
    updated_at: string;
}

interface EditProps {
    role: Role;
    permissions: Permission[];
}

export default function Edit({ role, permissions }: Readonly<EditProps>) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: role.name,
        description: role.description || '',
        permissions: role.permissions.map(p => p.id),
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        router.put(route('roles.update', role.id), formData, {
            onError: (errors) => {
                setErrors(errors as Record<string, string>);
                setIsSubmitting(false);
            },
            onSuccess: () => {
                setIsSubmitting(false);
            },
        });
    };

    const togglePermission = (permissionId: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permissionId)
                ? prev.permissions.filter(id => id !== permissionId)
                : [...prev.permissions, permissionId]
        }));
    };

    return (
        <AppLayout>
            <Head title={t('administration.roles.edit.head', { name: role.name })} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.get(route('roles.index'))}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {t('administration.roles.edit.title')}
                            </h1>
                            <p className="text-gray-600 mt-1">{role.name}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Form Section */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* Nom du rôle */}
                            <div className="bg-white rounded-lg border p-6">
                                <label htmlFor="role-name" className="block text-sm font-medium text-gray-900 mb-2">
                                    {t('administration.roles.edit.name')}
                                </label>
                                <Input
                                    id="role-name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder={t('administration.roles.edit.name_ph')}
                                    className={errors.name ? 'border-red-500' : ''}
                                />
                                {errors.name && (
                                    <p className="text-red-600 text-sm mt-1">{errors.name}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div className="bg-white rounded-lg border p-6">
                                <label htmlFor="role-description" className="block text-sm font-medium text-gray-900 mb-2">
                                    {t('administration.roles.edit.description')}
                                </label>
                                <textarea
                                    id="role-description"
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder={t('administration.roles.edit.description_ph')}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Boutons */}
                            <div className="flex gap-3">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                >
                                    {isSubmitting ? t('administration.roles.edit.updating') : t('administration.roles.edit.update')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.get(route('roles.index'))}
                                >
                                    {t('administration.roles.edit.cancel')}
                                </Button>
                            </div>
                        </div>

                        {/* Permissions Section */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-lg border p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                    {t('administration.roles.edit.permissions', { count: formData.permissions.length })}
                                </h2>
                                {errors.permissions && (
                                    <p className="text-red-600 text-sm mb-4">{errors.permissions}</p>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                                    {permissions.map((permission) => (
                                        <label
                                            key={permission.id}
                                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.permissions.includes(permission.id)}
                                                onChange={() => togglePermission(permission.id)}
                                                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-1"
                                            />
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">
                                                    {permission.name}
                                                </p>
                                                {permission.description && (
                                                    <p className="text-sm text-gray-600">
                                                        {permission.description}
                                                    </p>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
