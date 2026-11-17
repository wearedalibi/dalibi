import { Check } from 'lucide-react';
import { useTranslation } from '@/helpers/i18n';

const STEPS = ['language', 'school', 'admin', 'security'] as const;

export type InstallStep = (typeof STEPS)[number];

export default function InstallStepper({ current }: Readonly<{ current: InstallStep }>) {
    const { t } = useTranslation();
    const currentIndex = STEPS.indexOf(current);

    return (
        <ol className="flex items-center justify-center gap-2 sm:gap-3">
            {STEPS.map((step, index) => {
                const done = index < currentIndex;
                const active = index === currentIndex;

                return (
                    <li key={step} className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-2">
                            <span
                                className={[
                                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition',
                                    done
                                        ? 'bg-blue-600 text-white'
                                        : active
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
                                ].join(' ')}
                            >
                                {done ? <Check className="h-4 w-4" /> : index + 1}
                            </span>
                            <span
                                className={[
                                    'hidden text-sm sm:inline',
                                    active ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400',
                                ].join(' ')}
                            >
                                {t(`install.steps.${step}`)}
                            </span>
                        </div>
                        {index < STEPS.length - 1 && (
                            <span className="h-px w-4 bg-gray-300 sm:w-6 dark:bg-gray-700" aria-hidden="true" />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
