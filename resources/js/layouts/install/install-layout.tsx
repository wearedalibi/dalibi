import DalibiLogo from '@/components/dalibi-logo';
import InstallStepper, { type InstallStep } from '@/components/install-stepper';
import { useTranslation } from '@/helpers/i18n';

/**
 * Layout de l'assistant d'installation — reprend la mise en page de la page de
 * connexion (image à gauche, contenu à droite) et ajoute le fil des étapes.
 */
export default function InstallLayout({
    children,
    title,
    description,
    step,
}: Readonly<{
    children: React.ReactNode;
    title: string;
    description: string;
    step?: InstallStep;
}>) {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-svh bg-background">
            {/* Section image - 50% */}
            <div className="relative hidden w-1/2 overflow-hidden lg:block">
                <img src="/images/login-hero.jpg" alt="Dalibi" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute right-10 bottom-10 left-10 text-white">
                    <h2 className="mb-2 text-3xl font-bold">{t('install.hero_title')}</h2>
                    <p className="text-lg text-blue-100">{t('install.hero_subtitle')}</p>
                </div>
            </div>

            {/* Section formulaire - 50% */}
            <div className="flex w-full flex-col items-center justify-center p-6 md:p-10 lg:w-1/2">
                <div className="w-full max-w-md">
                    <div className="flex flex-col gap-8">
                        <div className="flex flex-col items-center gap-6">
                            <DalibiLogo className="h-9 w-auto" />
                            {step && <InstallStepper current={step} />}
                            <div className="space-y-2 text-center">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
                                <p className="text-center text-sm text-gray-600 dark:text-gray-400">{description}</p>
                            </div>
                        </div>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
