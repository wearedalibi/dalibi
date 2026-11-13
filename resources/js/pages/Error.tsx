import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, LayoutGrid } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { ErrorArt } from '@/components/error-art';
import { useTranslation } from '@/helpers/i18n';
import { dashboard } from '@/routes';

interface AuthProps {
    user: { id: string } | null;
}

const KNOWN_STATUSES = [403, 404, 419, 429, 500, 503];

export default function ErrorPage({ status }: Readonly<{ status: number }>) {
    const { t } = useTranslation();
    const auth = (usePage().props as { auth?: AuthProps }).auth;
    const isAuthed = Boolean(auth?.user);
    const group = KNOWN_STATUSES.includes(status) ? String(status) : 'fallback';
    const info = {
        title: t(`errors.${group}.title`),
        message: t(`errors.${group}.message`),
    };

    return (
        <>
            <Head title={`${status} — ${info.title}`} />

            <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900 dark:bg-[#0a0a0a] dark:text-gray-100">
                <header className="border-b border-gray-200/70 dark:border-gray-800">
                    <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6 lg:px-8">
                        <Link href="/" aria-label="Dalibi" className="flex items-center">
                            <AppLogo className="h-8 w-auto fill-gray-900 dark:fill-white" />
                        </Link>
                    </div>
                </header>

                <main className="flex flex-1 items-center justify-center px-4 py-12">
                    <div className="w-full max-w-md text-center">
                        <div className="mb-6">
                            <ErrorArt status={status} />
                        </div>

                        <p className="text-5xl font-bold tracking-tight text-gray-300 dark:text-gray-700">{status}</p>
                        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{info.title}</h1>
                        <p className="mx-auto mt-3 max-w-sm text-gray-500 dark:text-gray-400">{info.message}</p>

                        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                            <Link
                                href={isAuthed ? dashboard() : '/'}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                            >
                                <LayoutGrid className="h-4 w-4" /> {isAuthed ? t('errors.dashboard') : t('errors.home')}
                            </Link>
                            <button
                                type="button"
                                onClick={() => window.history.back()}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                <ArrowLeft className="h-4 w-4" /> {t('errors.previous')}
                            </button>
                        </div>
                    </div>
                </main>

                <footer className="border-t border-gray-200/70 py-6 text-center text-sm text-gray-400 dark:border-gray-800">
                    &copy; {new Date().getFullYear()} Dalibi
                </footer>
            </div>
        </>
    );
}
