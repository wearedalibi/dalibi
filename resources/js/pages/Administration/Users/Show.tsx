import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Calendar, Mail, MapPin, Phone, User as UserIcon, Shield, BookOpen, CalendarRange, Receipt, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMoney } from '@/helpers/money';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';
import PayrollSection, { type EmployeeProfile } from './PayrollSection';
import { type ContractType, type SalaryGradeOption } from '@/components/Employees/employee-form';

interface Affectation {
    id: string;
    active: boolean;
    subject?: { id: string; name: string } | null;
    classroom?: { id: string; name: string } | null;
    academic_year?: { id: string; year: string } | null;
}

interface Slot {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    room: string | null;
    subject?: { id: string; name: string } | null;
    classroom?: { id: string; name: string } | null;
}

const PAY_STATUS_CLS: Record<string, string> = {
    draft:     'bg-gray-100 text-gray-600',
    validated: 'bg-blue-100 text-blue-700',
    paid:      'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
};

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
    natricule: string | null;
    roles: Role[];
    employee_profile: EmployeeProfile | null;
    subject_assignments?: Affectation[];
    timetable_slots?: Slot[];
    created_at: string;
    updated_at: string;
}

interface ShowProps {
    user: User;
    activeYear: string | null;
    contractTypes: ContractType[];
    salaryGrades: SalaryGradeOption[];
    canManagePayroll: boolean;
}

export default function Show({ user, activeYear, contractTypes, salaryGrades, canManagePayroll }: Readonly<ShowProps>) {
    const fmt = useMoney();
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const DAYS = ['', ...Array.from({ length: 7 }, (_, i) => t('administration.users.days.' + (i + 1)))];
    const MONTHS_SHORT = ['', ...Array.from({ length: 12 }, (_, i) => t('administration.users.months_short.' + (i + 1)))];
    const yearBadge = activeYear
        ? <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{activeYear}</span>
        : null;
    const affectations = user.subject_assignments ?? [];
    const slots = user.timetable_slots ?? [];
    const payslips = user.employee_profile?.payslips ?? [];

    const formatGender = (gender: string) => {
        if (gender === 'M' || gender === 'male') return t('administration.users.gender.male');
        if (gender === 'F' || gender === 'female') return t('administration.users.gender.female');
        if (gender === 'O' || gender === 'other') return t('administration.users.gender.other');
        return gender;
    };

    const formatDate = (date: string | null) => {
        if (!date) return t('administration.users.show.not_provided');
        return new Date(date).toLocaleDateString(dateLocale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <AppLayout>
            <Head title={`${user.firstname} ${user.lastname}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.get(route('users.index'))}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
                                <UserIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">
                                    {user.firstname} {user.lastname}
                                </h1>
                                {user.natricule && (
                                    <span className="inline-block mt-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                                        {user.natricule}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <Button
                        onClick={() => router.get(route('users.edit', user.id))}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {t('administration.users.show.edit')}
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Colonne 1 & 2: Informations */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Informations personnelles */}
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <UserIcon className="w-5 h-5 text-blue-600" />
                                {t('administration.users.show.personal_info')}
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">{t('administration.users.show.firstname')}</p>
                                    <p className="font-medium text-gray-900 mt-1">{user.firstname}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t('administration.users.show.lastname')}</p>
                                    <p className="font-medium text-gray-900 mt-1">{user.lastname}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t('administration.users.show.gender')}</p>
                                    <p className="font-medium text-gray-900 mt-1">
                                        {formatGender(user.gender)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {t('administration.users.show.birth_date')}
                                    </p>
                                    <p className="font-medium text-gray-900 mt-1">{formatDate(user.birth_date)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Coordonnées */}
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Mail className="w-5 h-5 text-blue-600" />
                                {t('administration.users.show.contact')}
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                        <Mail className="w-4 h-4" />
                                        {t('administration.users.show.email')}
                                    </p>
                                    <p className="font-medium text-gray-900 mt-1">{user.email}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                        <Phone className="w-4 h-4" />
                                        {t('administration.users.show.phone')}
                                    </p>
                                    <p className="font-medium text-gray-900 mt-1">
                                        {user.telephone || t('administration.users.show.not_provided')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {t('administration.users.show.address')}
                                    </p>
                                    <p className="font-medium text-gray-900 mt-1">
                                        {user.address || t('administration.users.show.not_provided_f')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Paie / RH */}
                        {(canManagePayroll || user.employee_profile) && (
                            <PayrollSection
                                userId={user.id}
                                userName={`${user.firstname} ${user.lastname}`}
                                profile={user.employee_profile}
                                contractTypes={contractTypes}
                                salaryGrades={salaryGrades}
                                canManage={canManagePayroll}
                            />
                        )}

                        {/* Affectations matières */}
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-blue-600" />
                                {t('administration.users.show.assignments', { count: affectations.length })}{yearBadge}
                            </h2>
                            {affectations.length === 0 ? (
                                <p className="text-gray-500 text-sm">{t('administration.users.show.no_assignment')}</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase">
                                                <th className="py-2 pr-4">{t('administration.users.show.col_subject')}</th>
                                                <th className="py-2 pr-4">{t('administration.users.show.col_class')}</th>
                                                <th className="py-2 pr-4">{t('administration.users.show.col_year')}</th>
                                                <th className="py-2">{t('administration.users.show.col_status')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {affectations.map(a => (
                                                <tr key={a.id}>
                                                    <td className="py-2 pr-4 font-medium text-gray-900">{a.subject?.name ?? '—'}</td>
                                                    <td className="py-2 pr-4 text-gray-600">{a.classroom?.name ?? '—'}</td>
                                                    <td className="py-2 pr-4 text-gray-600">{a.academic_year?.year ?? '—'}</td>
                                                    <td className="py-2">
                                                        {a.active
                                                            ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">{t('administration.users.show.active')}</span>
                                                            : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{t('administration.users.show.inactive')}</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Emploi du temps */}
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <CalendarRange className="w-5 h-5 text-blue-600" />
                                {t('administration.users.show.timetable', { count: slots.length })}{yearBadge}
                            </h2>
                            {slots.length === 0 ? (
                                <p className="text-gray-500 text-sm">{t('administration.users.show.no_slot')}</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase">
                                                <th className="py-2 pr-4">{t('administration.users.show.col_day')}</th>
                                                <th className="py-2 pr-4">{t('administration.users.show.col_slot')}</th>
                                                <th className="py-2 pr-4">{t('administration.users.show.col_subject')}</th>
                                                <th className="py-2 pr-4">{t('administration.users.show.col_class')}</th>
                                                <th className="py-2">{t('administration.users.show.col_room')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {slots.map(s => (
                                                <tr key={s.id}>
                                                    <td className="py-2 pr-4 font-medium text-gray-900">{DAYS[s.day_of_week] ?? s.day_of_week}</td>
                                                    <td className="py-2 pr-4 text-gray-600">{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</td>
                                                    <td className="py-2 pr-4 text-gray-600">{s.subject?.name ?? '—'}</td>
                                                    <td className="py-2 pr-4 text-gray-600">{s.classroom?.name ?? '—'}</td>
                                                    <td className="py-2 text-gray-600">{s.room ?? '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Derniers bulletins de paie */}
                        {user.employee_profile && (
                            <div className="bg-white rounded-lg border p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Receipt className="w-5 h-5 text-blue-600" />
                                    {t('administration.users.show.payslips', { count: payslips.length })}
                                </h2>
                                {payslips.length === 0 ? (
                                    <p className="text-gray-500 text-sm">{t('administration.users.show.no_payslip')}</p>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {payslips.map(p => {
                                            const stCls = p.pay_run ? (PAY_STATUS_CLS[p.pay_run.status] ?? PAY_STATUS_CLS.draft) : null;
                                            return (
                                                <div key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-gray-900">
                                                            {p.pay_run ? `${MONTHS_SHORT[p.pay_run.period_month]} ${p.pay_run.period_year}` : p.reference}
                                                        </p>
                                                        <p className="text-xs text-gray-400">{p.reference}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        {stCls && p.pay_run && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stCls}`}>{t('administration.users.pay_status.' + p.pay_run.status)}</span>}
                                                        <span className="font-semibold text-gray-900">{fmt(p.net)}</span>
                                                        <a href={route('payslips.pdf', p.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50" aria-label={t('administration.users.show.download')}>
                                                            <FileDown className="w-4 h-4" />
                                                        </a>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Profil */}
                        {user.profile && (
                            <div className="bg-white rounded-lg border p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('administration.users.show.profile')}</h2>
                                <p className="text-gray-700 whitespace-pre-wrap">{user.profile}</p>
                            </div>
                        )}

                        {/* Timeline */}
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('administration.users.show.history')}</h2>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                                    <div>
                                        <p className="text-sm text-gray-600">{t('administration.users.show.created_on')}</p>
                                        <p className="font-medium text-gray-900">{formatDate(user.created_at)}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
                                    <div>
                                        <p className="text-sm text-gray-600">{t('administration.users.show.updated_on')}</p>
                                        <p className="font-medium text-gray-900">{formatDate(user.updated_at)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Colonne 3: Rôles et Permissions */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Rôles */}
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-600" />
                                {t('administration.users.show.roles', { count: user.roles.length })}
                            </h2>
                            {user.roles.length > 0 ? (
                                <div className="space-y-2">
                                    {user.roles.map((role) => (
                                        <div key={role.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                            <p className="font-medium text-blue-900">{role.name}</p>
                                            {role.description && (
                                                <p className="text-sm text-blue-700 mt-1">{role.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">{t('administration.users.show.no_role')}</p>
                            )}
                        </div>

                        {/* Permissions */}
                        {user.roles.length > 0 && (
                            <div className="bg-white rounded-lg border p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                    {t('administration.users.show.permissions')}
                                </h2>
                                <div className="space-y-4">
                                    {user.roles.map((role) => (
                                        <div key={role.id}>
                                            <p className="text-sm font-medium text-gray-900 mb-2">{role.name}</p>
                                            {role.permissions.length > 0 ? (
                                                <div className="space-y-1">
                                                    {role.permissions.map((permission) => (
                                                        <div key={permission.id} className="flex items-center gap-2 text-sm">
                                                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                                                            <span className="text-gray-700">{permission.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 text-sm ml-4">{t('administration.users.show.no_permission')}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
