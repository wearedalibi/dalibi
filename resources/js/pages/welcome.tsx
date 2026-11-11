import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle, Archive, ArrowRight, BarChart3, Briefcase, Calendar, CalendarRange, GraduationCap,
    LayoutGrid, Lock, LogIn, LogOut, NotebookPen, Percent, ScanLine, Shield, ShieldCheck,
    UserCheck, Users, Wallet,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { dashboard, login, logout } from '@/routes';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';

interface AuthProps {
    user: { id: string; name?: string } | null;
    permissions?: string[];
}

interface ModuleCard {
    key: string;
    icon: typeof Users;
    href: string;
    permission: string;
    color: string;
}

const modules: ModuleCard[] = [
    { key: 'students', icon: Users, href: route('students.index'), permission: 'view_students', color: 'from-blue-500 to-blue-600' },
    { key: 'bulletins', icon: NotebookPen, href: route('bulletins.index'), permission: 'view_bulletins', color: 'from-violet-500 to-purple-600' },
    { key: 'exams', icon: GraduationCap, href: route('evaluations.index'), permission: 'view_evaluations', color: 'from-indigo-500 to-blue-600' },
    { key: 'attendances', icon: UserCheck, href: route('attendances.index'), permission: 'view_attendances', color: 'from-emerald-500 to-teal-600' },
    { key: 'accounting', icon: Wallet, href: route('accounting.index'), permission: 'view_finances', color: 'from-amber-500 to-orange-600' },
    { key: 'payroll', icon: Briefcase, href: route('payroll.overview'), permission: 'view_payroll', color: 'from-cyan-500 to-sky-600' },
    { key: 'archives', icon: Archive, href: route('archives.index'), permission: 'view_archives', color: 'from-rose-500 to-pink-600' },
    { key: 'statistics', icon: BarChart3, href: route('statistics.index'), permission: 'view_statistics', color: 'from-cyan-500 to-blue-600' },
    { key: 'calendar', icon: Calendar, href: route('calendar.index'), permission: 'view_calendar', color: 'from-fuchsia-500 to-purple-600' },
    { key: 'timetable', icon: CalendarRange, href: route('timetable.index'), permission: 'view_timetable', color: 'from-sky-500 to-cyan-600' },
    { key: 'scholarships', icon: Percent, href: route('student-scholarships.index'), permission: 'view_student_scholarships', color: 'from-lime-500 to-emerald-600' },
    { key: 'note_reclamations', icon: AlertCircle, href: route('note-reclamations.index'), permission: 'view_note_reclamations', color: 'from-orange-500 to-red-500' },
    { key: 'absence_permissions', icon: ShieldCheck, href: route('absence-permissions.index'), permission: 'view_absence_permissions', color: 'from-teal-500 to-emerald-600' },
    { key: 'portal', icon: Lock, href: route('guardians.index'), permission: 'view_portal_accounts', color: 'from-slate-500 to-slate-700' },
    { key: 'users', icon: Shield, href: route('users.index'), permission: 'view_users', color: 'from-indigo-500 to-violet-600' },
    { key: 'audit', icon: ScanLine, href: route('audit-logs.index'), permission: 'view_audit_logs', color: 'from-gray-500 to-gray-700' },
];

export default function Welcome() {
    const { t } = useTranslation();
    const auth = (usePage().props as { auth?: AuthProps }).auth;
    const isAuthed = Boolean(auth?.user);
    const permissions = auth?.permissions ?? [];

    // Connecté : on n'affiche que les modules autorisés. Non connecté : tout,
    // mais le clic renvoie vers la connexion (les routes sont derrière l'auth).
    const visibleModules = modules.filter((m) => !isAuthed || permissions.includes(m.permission));

    return (
        <>
            <Head title={t('welcome.head')} />

            <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#0a0a0a] dark:text-gray-100">
                {/* Barre supérieure */}
                <header className="sticky top-0 z-10 border-b border-gray-200/70 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-[#0a0a0a]/80">
                    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
                        <Link href={isAuthed ? dashboard() : login()} className="flex items-center" aria-label="Dalibi">
                            <AppLogo className="h-8 w-auto fill-blue-600 dark:fill-blue-500" />
                        </Link>

                        {isAuthed ? (
                            <div className="flex items-center gap-2">
                                <Link href={dashboard()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                                    <LayoutGrid className="h-4 w-4" /> {t('welcome.dashboard')}
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => router.post(logout.url())}
                                    title={t('welcome.logout')}
                                    aria-label={t('welcome.logout')}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:hover:bg-red-950/40"
                                >
                                    <LogOut className="h-[18px] w-[18px]" />
                                </button>
                            </div>
                        ) : (
                            <Link href={login()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                                <LogIn className="h-4 w-4" /> {t('welcome.login')}
                            </Link>
                        )}
                    </div>
                </header>

                <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
                    {/* Hero */}
                    <div className="mb-12 text-center">
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                            {isAuthed ? (
                                <>{t('welcome.hello')}{auth?.user?.name ? `, ${auth.user.name}` : ''} 👋</>
                            ) : (
                                <>{t('welcome.welcome_to')} <span className="text-blue-600">Dalibi</span></>
                            )}
                        </h1>
                        <p className="mx-auto mt-3 max-w-2xl text-base text-gray-500 dark:text-gray-400 md:text-lg">
                            {isAuthed
                                ? t('welcome.subtitle_authed')
                                : t('welcome.subtitle_guest')}
                        </p>
                    </div>

                    {/* Cartes des modules */}
                    {visibleModules.length === 0 ? (
                        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-400 dark:border-gray-800 dark:bg-[#161615]">
                            {t('welcome.no_modules')}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {visibleModules.map((m) => (
                                <Link
                                    key={m.key}
                                    href={m.href}
                                    className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg dark:border-gray-800 dark:bg-[#161615] dark:hover:border-blue-900"
                                >
                                    <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br ${m.color} text-white shadow-md`}>
                                        <m.icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-bold">{t(`welcome.modules.${m.key}.title`)}</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t(`welcome.modules.${m.key}.desc`)}</p>
                                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition group-hover:gap-2 dark:text-blue-400">
                                        {isAuthed ? t('welcome.open') : t('welcome.login')} <ArrowRight className="h-4 w-4" />
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </main>

                <footer className="border-t border-gray-200/70 py-8 text-center text-sm text-gray-400 dark:border-gray-800">
                    &copy; {new Date().getFullYear()} {t('welcome.footer')}
                </footer>
            </div>
        </>
    );
}
