import { Link } from '@inertiajs/react';
import { User, Lock, Shield, Palette } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/helpers/i18n';
import { toPath, useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { show } from '@/routes/two-factor';
import { edit as editPassword } from '@/routes/user-password';
import type { NavItem } from '@/types';

export default function SettingsLayout({ children, bare = false }: Readonly<PropsWithChildren<{ bare?: boolean }>>) {
    const { t } = useTranslation();

    const sidebarNavItems: NavItem[] = [
        { title: t('settings.profile.title'), href: edit(), icon: User },
        { title: t('settings.password.title'), href: editPassword(), icon: Lock },
        { title: t('settings.two_factor.title'), href: show(), icon: Shield },
        { title: t('settings.appearance.title'), href: editAppearance(), icon: Palette },
    ];

    // Le lien le plus spécifique gagne, et une sous-page reste rattachée à son onglet.
    const activeHref = useCurrentUrl().findActiveHref(sidebarNavItems.map((i) => i.href));

    // When server-side rendering, we only render the layout on the client...
    if (globalThis.window === undefined) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="px-4 py-6">
                <Heading
                    title={t('settings.account')}
                    description={t('settings.account_desc')}
                />

                <div className="flex flex-col lg:flex-row lg:gap-6 mt-6">
                    <aside className="w-full lg:w-64">
                        <div className="bg-card rounded-xl shadow-sm border border-border p-3">
                            <nav
                                className="flex flex-col space-y-1"
                                aria-label="Settings"
                            >
                                {sidebarNavItems.map((item, index) => (
                                    <Link
                                        key={`${toUrl(item.href)}-${index}`}
                                        href={item.href}
                                        className={cn(
                                            'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                                            toPath(item.href) === activeHref
                                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        )}
                                    >
                                        {item.icon && (
                                            <item.icon className="h-5 w-5" />
                                        )}
                                        {item.title}
                                    </Link>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    <Separator className="my-6 lg:hidden" />

                    <div className={cn('flex-1 min-w-0', !bare && 'max-w-3xl')}>
                        {bare ? (
                            children
                        ) : (
                            <div className="bg-card rounded-xl shadow-sm border border-border">
                                <section className="p-6 space-y-8">
                                    {children}
                                </section>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
