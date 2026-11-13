import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    CircleUserRound,
    Mail,
    MapPin,
    Phone,
    Shield,
    Sparkles,
    UserCheck,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Role {
    id: string;
    name: string;
    description: string | null;
}

interface User {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    gender: string;
    birth_date: string | null;
    telephone: string | null;
    address: string | null;
    profile: string | null;
    roles: Role[];
}

interface EditProps {
    user: User;
    roles: Role[];
}

export default function Edit({ user, roles }: Readonly<EditProps>) {
    const { t } = useTranslation();
    const normalizeGender = (value: string) => {
        if (value === 'M') return 'male';
        if (value === 'F') return 'female';
        if (value === 'O') return 'other';
        return value;
    };

    const [formData, setFormData] = useState({
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        password: '',
        password_confirmation: '',
        gender: normalizeGender(user.gender),
        birth_date: user.birth_date || '',
        telephone: user.telephone || '',
        address: user.address || '',
        profile: user.profile || '',
        roles: user.roles.map(role => role.id),
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        router.put(route('users.update', user.id), formData, {
            onError: (errors) => {
                setErrors(errors as Record<string, string>);
                setIsSubmitting(false);
            },
            onSuccess: () => {
                setIsSubmitting(false);
            },
        });
    };

    const toggleRole = (roleId: string) => {
        setFormData(prev => ({
            ...prev,
            roles: prev.roles.includes(roleId)
                ? prev.roles.filter(id => id !== roleId)
                : [...prev.roles, roleId]
        }));
    };

    return (
        <AppLayout>
            <Head title={t('administration.users.edit.head', { name: `${user.firstname} ${user.lastname}` })} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.get(route('users.index'))}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {t('administration.users.edit.title', { name: `${user.firstname} ${user.lastname}` })}
                        </h1>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Colonne 1 & 2: Informations de base */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Informations personnelles */}
                            <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <CircleUserRound className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-gray-900">{t('administration.users.form.personal_info')}</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="firstname" className="block text-sm font-medium text-gray-900 mb-2">
                                            {t('administration.users.form.firstname')}
                                        </label>
                                        <Input
                                            id="firstname"
                                            type="text"
                                            value={formData.firstname}
                                            onChange={(e) => setFormData(prev => ({ ...prev, firstname: e.target.value }))}
                                            placeholder={t('administration.users.form.firstname_ph')}
                                            className={errors.firstname ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white focus:ring-blue-500'}
                                        />
                                        {errors.firstname && (
                                            <p className="text-red-600 text-sm mt-1">{errors.firstname}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="lastname" className="block text-sm font-medium text-gray-900 mb-2">
                                            {t('administration.users.form.lastname')}
                                        </label>
                                        <Input
                                            id="lastname"
                                            type="text"
                                            value={formData.lastname}
                                            onChange={(e) => setFormData(prev => ({ ...prev, lastname: e.target.value }))}
                                            placeholder={t('administration.users.form.lastname_ph')}
                                            className={errors.lastname ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white focus:ring-blue-500'}
                                        />
                                        {errors.lastname && (
                                            <p className="text-red-600 text-sm mt-1">{errors.lastname}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="gender" className="block text-sm font-medium text-gray-900 mb-2">
                                            {t('administration.users.form.gender')}
                                        </label>
                                        <select
                                            id="gender"
                                            value={formData.gender}
                                            onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                        >
                                            <option value="male">{t('administration.users.gender.male')}</option>
                                            <option value="female">{t('administration.users.gender.female')}</option>
                                            <option value="other">{t('administration.users.gender.other')}</option>
                                        </select>
                                        {errors.gender && (
                                            <p className="text-red-600 text-sm mt-1">{errors.gender}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Coordonnées */}
                            <div className="bg-white rounded-xl border border-violet-100 shadow-sm p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-9 w-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-gray-900">{t('administration.users.form.contact')}</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                                            <Mail className="inline w-4 h-4 mr-1 text-violet-500" />
                                            {t('administration.users.form.email')}
                                        </label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder={t('administration.users.form.email_ph')}
                                            className={errors.email ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white focus:ring-blue-500'}
                                        />
                                        {errors.email && (
                                            <p className="text-red-600 text-sm mt-1">{errors.email}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="telephone" className="block text-sm font-medium text-gray-900 mb-2">
                                            <Phone className="inline w-4 h-4 mr-1 text-violet-500" />
                                            {t('administration.users.form.phone')}
                                        </label>
                                        <Input
                                            id="telephone"
                                            type="text"
                                            value={formData.telephone}
                                            onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                                            placeholder={t('administration.users.form.phone_ph')}
                                            className={errors.telephone ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white focus:ring-blue-500'}
                                        />
                                        {errors.telephone && (
                                            <p className="text-red-600 text-sm mt-1">{errors.telephone}</p>
                                        )}
                                    </div>

                                    <div className="md:col-span-2">
                                        <label htmlFor="address" className="block text-sm font-medium text-gray-900 mb-2">
                                            <MapPin className="inline w-4 h-4 mr-1 text-violet-500" />
                                            {t('administration.users.form.address')}
                                        </label>
                                        <Input
                                            id="address"
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                            placeholder={t('administration.users.form.address_ph')}
                                            className={errors.address ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white focus:ring-blue-500'}
                                        />
                                        {errors.address && (
                                            <p className="text-red-600 text-sm mt-1">{errors.address}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Sécurité */}
                            <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-gray-900">{t('administration.users.form.security')}</h2>
                                </div>
                                <p className="text-sm text-gray-600 mb-4">
                                    {t('administration.users.form.security_hint')}
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                                            {t('administration.users.form.new_password')}
                                        </label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                            placeholder="••••••••"
                                            className={errors.password ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white focus:ring-blue-500'}
                                        />
                                        {errors.password && (
                                            <p className="text-red-600 text-sm mt-1">{errors.password}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-900 mb-2">
                                            {t('administration.users.form.password_confirmation_opt')}
                                        </label>
                                        <Input
                                            id="password_confirmation"
                                            type="password"
                                            value={formData.password_confirmation}
                                            onChange={(e) => setFormData(prev => ({ ...prev, password_confirmation: e.target.value }))}
                                            placeholder="••••••••"
                                            className="border-gray-200 bg-gray-50 focus:bg-white focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Profil */}
                            <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-gray-900">{t('administration.users.form.profile')}</h2>
                                </div>
                                <div>
                                    <label htmlFor="profile" className="block text-sm font-medium text-gray-900 mb-2">
                                        {t('administration.users.form.profile_desc')}
                                    </label>
                                    <textarea
                                        id="profile"
                                        value={formData.profile}
                                        onChange={(e) => setFormData(prev => ({ ...prev, profile: e.target.value }))}
                                        placeholder={t('administration.users.form.profile_ph')}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                    />
                                    {errors.profile && (
                                        <p className="text-red-600 text-sm mt-1">{errors.profile}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Colonne 3: Rôles */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-6 sticky top-6 space-y-4">
                                <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-indigo-700">
                                            <Users className="w-4 h-4" />
                                            <p className="text-sm font-semibold">{t('administration.users.form.selected_roles')}</p>
                                        </div>
                                        <span className="inline-flex h-6 min-w-6 px-2 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-semibold">
                                            {formData.roles.length}
                                        </span>
                                    </div>
                                    <p className="text-xs text-indigo-600 mt-2">{t('administration.users.form.roles_hint')}</p>
                                </div>

                                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <UserCheck className="w-5 h-5 text-indigo-600" />
                                    {t('administration.users.form.roles')}
                                </h2>
                                <div className="space-y-3">
                                    {roles.map((role) => (
                                        <label
                                            key={role.id}
                                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                                                formData.roles.includes(role.id)
                                                    ? 'border-indigo-200 bg-indigo-50/60'
                                                    : 'border-gray-100 hover:bg-indigo-50/40 hover:border-indigo-100'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.roles.includes(role.id)}
                                                onChange={() => toggleRole(role.id)}
                                                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">{role.name}</p>
                                                {role.description && (
                                                    <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                {errors.roles && (
                                    <p className="text-red-600 text-sm mt-2">{errors.roles}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Boutons */}
                    <div className="flex gap-3">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                        >
                            {isSubmitting ? t('administration.users.edit.updating') : t('administration.users.edit.submit')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="border-gray-200 hover:bg-gray-50"
                            onClick={() => router.get(route('users.index'))}
                        >
                            {t('administration.users.form.cancel')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
