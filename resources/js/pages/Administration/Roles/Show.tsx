import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface ShowProps {
    role: Role;
}

export default function Show({ role }: Readonly<ShowProps>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const formatDate = (date: string) => {
        return new Intl.DateTimeFormat(dateLocale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(date));
    };

    return (
        <AppLayout>
            <Head title={role.name} />

            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={route('roles.index')}>
                            <Button variant="ghost" size="sm" className="p-2">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {role.name}
                            </h1>
                            {role.description && (
                                <p className="text-gray-600 mt-2">{role.description}</p>
                            )}
                        </div>
                    </div>
                    <Link href={route('roles.edit', role.id)}>
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                            <Pencil className="w-4 h-4" />
                            {t('administration.roles.show.edit')}
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Info Générale */}
                    <div className="bg-white rounded-lg border p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            {t('administration.roles.show.info')}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600">{t('administration.roles.show.name')}</p>
                                <p className="text-lg font-medium text-gray-900">
                                    {role.name}
                                </p>
                            </div>
                            {role.description && (
                                <div>
                                    <p className="text-sm text-gray-600">{t('administration.roles.show.description')}</p>
                                    <p className="text-gray-700">{role.description}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-gray-600">{t('administration.roles.show.assigned_permissions')}</p>
                                <p className="text-lg font-medium text-gray-900">
                                    {role.permissions.length}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white rounded-lg border p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            {t('administration.roles.show.events')}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600">{t('administration.roles.show.created_on')}</p>
                                <p className="text-gray-700">{formatDate(role.created_at)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">{t('administration.roles.show.updated_on')}</p>
                                <p className="text-gray-700">{formatDate(role.updated_at)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                        <h2 className="text-lg font-semibold text-blue-900 mb-4">
                            {t('administration.roles.show.stats')}
                        </h2>
                        <div className="text-center">
                            <p className="text-5xl font-bold text-blue-600">
                                {role.permissions.length}
                            </p>
                            <p className="text-blue-700 mt-2">{t('administration.roles.show.assigned_permissions')}</p>
                        </div>
                    </div>
                </div>

                {/* Permissions */}
                <div className="bg-white rounded-lg border p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {t('administration.roles.show.role_permissions')}
                    </h2>
                    {role.permissions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {role.permissions.map((permission) => (
                                <div key={permission.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="font-medium text-gray-900">{permission.name}</p>
                                    {permission.description && (
                                        <p className="text-sm text-gray-600 mt-1">{permission.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-600">{t('administration.roles.show.no_permission')}</p>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
