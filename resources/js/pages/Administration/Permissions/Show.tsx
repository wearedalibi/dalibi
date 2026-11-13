import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Role {
    id: string;
    name: string;
    description: string | null;
}

interface Permission {
    id: string;
    name: string;
    description: string | null;
    roles: Role[];
    created_at: string;
    updated_at: string;
}

interface ShowProps {
    permission: Permission;
}

export default function Show({ permission }: Readonly<ShowProps>) {
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
            <Head title={permission.name} />

            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={route('permissions.index')}>
                            <Button variant="ghost" size="sm" className="p-2">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {permission.name}
                            </h1>
                            {permission.description && (
                                <p className="text-gray-600 mt-2">{permission.description}</p>
                            )}
                        </div>
                    </div>
                    <Link href={route('permissions.edit', permission.id)}>
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                            <Pencil className="w-4 h-4" />
                            {t('administration.permissions.show.edit')}
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Info Générale */}
                    <div className="bg-white rounded-lg border p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            {t('administration.permissions.show.info')}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600">{t('administration.permissions.show.name')}</p>
                                <p className="text-lg font-medium text-gray-900">
                                    {permission.name}
                                </p>
                            </div>
                            {permission.description && (
                                <div>
                                    <p className="text-sm text-gray-600">{t('administration.permissions.show.description')}</p>
                                    <p className="text-gray-700">{permission.description}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-gray-600">{t('administration.permissions.show.assigned_roles')}</p>
                                <p className="text-lg font-medium text-gray-900">
                                    {permission.roles.length}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white rounded-lg border p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            {t('administration.permissions.show.events')}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600">{t('administration.permissions.show.created_on')}</p>
                                <p className="text-gray-700">{formatDate(permission.created_at)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">{t('administration.permissions.show.updated_on')}</p>
                                <p className="text-gray-700">{formatDate(permission.updated_at)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                        <h2 className="text-lg font-semibold text-blue-900 mb-4">
                            {t('administration.permissions.show.stats')}
                        </h2>
                        <div className="text-center">
                            <p className="text-5xl font-bold text-blue-600">
                                {permission.roles.length}
                            </p>
                            <p className="text-blue-700 mt-2">{t('administration.permissions.show.assigned_roles')}</p>
                        </div>
                    </div>
                </div>

                {/* Rôles */}
                <div className="bg-white rounded-lg border p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {t('administration.permissions.show.associated_roles')}
                    </h2>
                    {permission.roles.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {permission.roles.map((role) => (
                                <div key={role.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="font-medium text-gray-900">{role.name}</p>
                                    {role.description && (
                                        <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-600">{t('administration.permissions.show.no_role')}</p>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
