import { usePage } from '@inertiajs/react';
import { Fragment, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserMenuContent } from '@/components/user-menu-content';
import { useTranslation } from '@/helpers/i18n';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { getFullName } from '@/hooks/use-initials';
import { mainNavItems } from '@/types';

export function AppSidebarHeader() {
    const { auth } = usePage().props;
    const { currentUrl, findActiveKey } = useCurrentUrl();
    const { t } = useTranslation();

    const fullName = getFullName(auth.user.firstname, auth.user.lastname);
    const initials = `${auth.user.firstname?.[0] ?? ''}${auth.user.lastname?.[0] ?? ''}`.toUpperCase();

    // Fil d'Ariane dérivé du menu selon l'URL courante : [Section, Page] ou [Page].
    const trail = useMemo<string[]>(() => {
        // Même règle que la navigation : le lien le plus spécifique gagne, et une
        // sous-page (/students/12/edit) reste rattachée à son entrée de menu.
        const active = findActiveKey(
            mainNavItems
                .flatMap((item) => (item.items ? item.items : [item]))
                .map((entry) => ({ key: entry, hrefs: [entry.href, ...(entry.match ?? [])] })),
        );

        if (!active) return [];

        for (const item of mainNavItems) {
            if (item.items) {
                if (item.items.includes(active)) return [item.title, active.title];
            } else if (item === active) {
                return [item.title];
            }
        }
        return [];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUrl]);

    return (
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 bg-background border-b border-border px-6 transition-colors">
            <div className="flex items-center gap-3">
                <SidebarTrigger className="-ml-1" />
                {trail.length > 0 && (
                    <Breadcrumb>
                        <BreadcrumbList>
                            {trail.map((label, i) => (
                                <Fragment key={label}>
                                    {i > 0 && <BreadcrumbSeparator />}
                                    <BreadcrumbItem>
                                        {i === trail.length - 1 ? (
                                            <BreadcrumbPage className="font-medium">{t(label)}</BreadcrumbPage>
                                        ) : (
                                            <span>{t(label)}</span>
                                        )}
                                    </BreadcrumbItem>
                                </Fragment>
                            ))}
                        </BreadcrumbList>
                    </Breadcrumb>
                )}
            </div>

            <div className="flex items-center gap-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="relative h-10 w-10 rounded-full"
                            aria-label={`Menu de ${fullName}`}
                        >
                            <Avatar className="h-10 w-10">
                                <AvatarImage
                                    src={auth.user.avatar}
                                    alt={fullName}
                                />
                                <AvatarFallback className="bg-blue-600 text-white">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end">
                        <UserMenuContent user={auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
