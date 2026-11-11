import { Head } from '@inertiajs/react';
import {
    BadgeCheck, BookOpen, CalendarRange, ClipboardList, DatabaseBackup, ExternalLink,
    FileBadge, GraduationCap, Info, Scale, Server, Wallet, Globe, FileCode2, ScrollText, Users, Heart,
} from 'lucide-react';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Props {
    app: { name: string; version: string; laravel: string; php: string; environment: string };
}

const GITHUB = 'https://github.com/wearedalibi/dalibi';
const SITE = 'https://dalibi.wearekarfi.dev';

/** Modules couverts par l'application (résumé). */
const MODULES: { icon: React.ElementType; key: string }[] = [
    { icon: Users, key: 'students' },
    { icon: FileBadge, key: 'grades' },
    { icon: ClipboardList, key: 'attendance' },
    { icon: GraduationCap, key: 'exams' },
    { icon: Wallet, key: 'finance' },
    { icon: BadgeCheck, key: 'payroll' },
    { icon: CalendarRange, key: 'timetable' },
    { icon: DatabaseBackup, key: 'backups' },
];

const LINKS: { icon: React.ElementType; key: string; href: string }[] = [
    { icon: BookOpen, key: 'docs', href: `${SITE}/documentation` },
    { icon: Globe, key: 'website', href: SITE },
    { icon: FileCode2, key: 'source', href: GITHUB },
    { icon: ScrollText, key: 'changelog', href: `${GITHUB}/blob/main/CHANGELOG.md` },
];

function Card({ children }: { children: React.ReactNode }) {
    return <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-card p-5 shadow-sm">{children}</div>;
}

export default function About({ app }: Readonly<Props>) {
    const { t } = useTranslation();
    const brand = app.name ? app.name.charAt(0).toUpperCase() + app.name.slice(1) : 'Dalibi';

    return (
        <AppLayout>
            <Head title={t('parametres.about.head')} />
            <div className="w-full max-w-5xl mx-auto space-y-6 p-1">

                {/* En-tête : logo officiel Dalibi (version blanche en mode sombre) + version */}
                <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-card p-6 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="sr-only">{brand}</h1>
                        <img src="/svgs/dalibi.svg" alt={brand} className="h-11 w-auto dark:hidden" />
                        <img src="/svgs/dalibi-blanc.svg" alt={brand} className="h-11 w-auto hidden dark:block" />
                        <a href={`${GITHUB}/releases/tag/v${app.version}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                            v{app.version}
                        </a>
                    </div>
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        {t('parametres.about.intro')}
                    </p>
                </div>

                {/* Liens utiles */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {LINKS.map((l) => {
                        const Icon = l.icon;
                        return (
                            <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer"
                                className="group rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-card p-4 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                                <div className="flex items-center justify-between">
                                    <Icon className="w-5 h-5 text-blue-600" />
                                    <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500" />
                                </div>
                                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{t(`parametres.about.links.${l.key}.title`)}</p>
                                <p className="text-xs text-gray-400">{t(`parametres.about.links.${l.key}.sub`)}</p>
                            </a>
                        );
                    })}
                </div>

                {/* Ce que fait l'application */}
                <Card>
                    <div className="flex items-center gap-2 mb-4"><Info className="w-4 h-4 text-gray-400" /><h2 className="font-semibold text-sm text-gray-900 dark:text-white">{t('parametres.about.section_covers')}</h2></div>
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                        {MODULES.map((m) => {
                            const Icon = m.icon;
                            return (
                                <div key={m.key} className="flex gap-3">
                                    <div className="rounded-lg bg-blue-50 dark:bg-gray-700 p-2 h-fit"><Icon className="w-4 h-4 text-blue-600 dark:text-blue-300" /></div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{t(`parametres.about.modules.${m.key}.title`)}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t(`parametres.about.modules.${m.key}.desc`)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                <div className="grid lg:grid-cols-2 gap-4">
                    {/* Éditeur & licence */}
                    <Card>
                        <div className="flex items-center gap-2 mb-4"><Scale className="w-4 h-4 text-gray-400" /><h2 className="font-semibold text-sm text-gray-900 dark:text-white">{t('parametres.about.section_license')}</h2></div>
                        <dl className="space-y-3 text-sm">
                            <div className="flex justify-between gap-4">
                                <dt className="text-gray-500 dark:text-gray-400">{t('parametres.about.edited_by')}</dt>
                                <dd className="font-medium text-gray-900 dark:text-white text-right">Kudayah Sassou Horacio Herve</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-gray-500 dark:text-gray-400">{t('parametres.about.license')}</dt>
                                <dd className="font-medium text-gray-900 dark:text-white text-right">{t('parametres.about.license_value')}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-gray-500 dark:text-gray-400">{t('parametres.about.rights')}</dt>
                                <dd className="font-medium text-gray-900 dark:text-white text-right">© {new Date().getFullYear()} {brand}</dd>
                            </div>
                        </dl>
                        <p className="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
                            <Heart className="w-3.5 h-3.5 text-rose-400" /> {t('parametres.about.license_note')}
                        </p>
                    </Card>

                    {/* Informations techniques */}
                    <Card>
                        <div className="flex items-center gap-2 mb-4"><Server className="w-4 h-4 text-gray-400" /><h2 className="font-semibold text-sm text-gray-900 dark:text-white">{t('parametres.about.section_tech')}</h2></div>
                        <dl className="space-y-3 text-sm">
                            <div className="flex justify-between gap-4"><dt className="text-gray-500 dark:text-gray-400">{t('parametres.about.app_version')}</dt><dd className="font-mono font-medium text-gray-900 dark:text-white">v{app.version}</dd></div>
                            <div className="flex justify-between gap-4"><dt className="text-gray-500 dark:text-gray-400">Laravel</dt><dd className="font-mono font-medium text-gray-900 dark:text-white">{app.laravel}</dd></div>
                            <div className="flex justify-between gap-4"><dt className="text-gray-500 dark:text-gray-400">PHP</dt><dd className="font-mono font-medium text-gray-900 dark:text-white">{app.php}</dd></div>
                            <div className="flex justify-between gap-4"><dt className="text-gray-500 dark:text-gray-400">{t('parametres.about.environment')}</dt><dd className="font-mono font-medium text-gray-900 dark:text-white">{app.environment}</dd></div>
                        </dl>
                    </Card>
                </div>

                {/* Support */}
                <Card>
                    <div className="flex items-center gap-2 mb-2"><Info className="w-4 h-4 text-gray-400" /><h2 className="font-semibold text-sm text-gray-900 dark:text-white">{t('parametres.about.section_support')}</h2></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('parametres.about.support_before')} <a href={`${SITE}/documentation`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{t('parametres.about.link_docs')}</a>{t('parametres.about.support_middle')} <a href={`${GITHUB}/issues`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{t('parametres.about.link_repo')}</a>.
                    </p>
                </Card>
            </div>
        </AppLayout>
    );
}
