/**
 * Illustrations SVG inline pour les pages d'erreur (theme-aware via les
 * utilitaires Tailwind fill et stroke). Une illustration par statut HTTP.
 */

import { useTranslation } from '@/helpers/i18n';

const wrap = 'w-full max-w-[240px] mx-auto h-auto';

function NotFound({ label }: Readonly<{ label: string }>) {
    return (
        <svg viewBox="0 0 220 170" className={wrap} role="img" aria-label={label} fill="none">
            <ellipse cx="110" cy="150" rx="72" ry="10" className="fill-blue-100 dark:fill-blue-950/50" />
            <circle cx="104" cy="70" r="54" className="fill-blue-50 dark:fill-blue-950/40" />
            <circle cx="96" cy="66" r="34" className="fill-white dark:fill-[#161615] stroke-blue-500 dark:stroke-blue-400" strokeWidth="7" />
            <text x="96" y="79" textAnchor="middle" className="fill-blue-500 dark:fill-blue-400" fontSize="36" fontWeight="800">?</text>
            <line x1="120" y1="92" x2="150" y2="122" className="stroke-blue-500 dark:stroke-blue-400" strokeWidth="10" strokeLinecap="round" />
        </svg>
    );
}

function Forbidden({ label }: Readonly<{ label: string }>) {
    return (
        <svg viewBox="0 0 220 170" className={wrap} role="img" aria-label={label} fill="none">
            <ellipse cx="110" cy="150" rx="72" ry="10" className="fill-amber-100 dark:fill-amber-950/50" />
            <circle cx="110" cy="70" r="54" className="fill-amber-50 dark:fill-amber-950/40" />
            <path d="M92 66 v-13 a18 18 0 0 1 36 0 v13" className="fill-none stroke-amber-500 dark:stroke-amber-400" strokeWidth="8" strokeLinecap="round" />
            <rect x="82" y="62" width="56" height="48" rx="11" className="fill-amber-500 dark:fill-amber-400" />
            <circle cx="110" cy="82" r="7" className="fill-white dark:fill-[#161615]" />
            <rect x="107" y="86" width="6" height="14" rx="3" className="fill-white dark:fill-[#161615]" />
        </svg>
    );
}

function Expired({ label }: Readonly<{ label: string }>) {
    return (
        <svg viewBox="0 0 220 170" className={wrap} role="img" aria-label={label} fill="none">
            <ellipse cx="110" cy="150" rx="72" ry="10" className="fill-violet-100 dark:fill-violet-950/50" />
            <circle cx="110" cy="72" r="54" className="fill-violet-50 dark:fill-violet-950/40" />
            <circle cx="110" cy="72" r="40" className="fill-white dark:fill-[#161615] stroke-violet-500 dark:stroke-violet-400" strokeWidth="7" />
            <line x1="110" y1="72" x2="110" y2="48" className="stroke-violet-500 dark:stroke-violet-400" strokeWidth="6" strokeLinecap="round" />
            <line x1="110" y1="72" x2="128" y2="80" className="stroke-violet-500 dark:stroke-violet-400" strokeWidth="6" strokeLinecap="round" />
            <circle cx="110" cy="72" r="4.5" className="fill-violet-500 dark:fill-violet-400" />
        </svg>
    );
}

function TooMany({ label }: Readonly<{ label: string }>) {
    return (
        <svg viewBox="0 0 220 170" className={wrap} role="img" aria-label={label} fill="none">
            <ellipse cx="110" cy="150" rx="72" ry="10" className="fill-orange-100 dark:fill-orange-950/50" />
            <circle cx="110" cy="72" r="54" className="fill-orange-50 dark:fill-orange-950/40" />
            <line x1="70" y1="66" x2="150" y2="66" className="stroke-orange-300 dark:stroke-orange-800" strokeWidth="3" strokeDasharray="4 6" />
            {[0, 1, 2, 3, 4].map((i) => (
                <rect key={i} x={72 + i * 16} y={104 - (i + 1) * 12} width="10" height={(i + 1) * 12} rx="3" className="fill-orange-500 dark:fill-orange-400" />
            ))}
        </svg>
    );
}

function ServerError({ label }: Readonly<{ label: string }>) {
    return (
        <svg viewBox="0 0 220 170" className={wrap} role="img" aria-label={label} fill="none">
            <ellipse cx="110" cy="150" rx="72" ry="10" className="fill-red-100 dark:fill-red-950/50" />
            <circle cx="104" cy="72" r="54" className="fill-red-50 dark:fill-red-950/40" />
            <rect x="70" y="44" width="76" height="34" rx="7" className="fill-white dark:fill-[#161615] stroke-red-500 dark:stroke-red-400" strokeWidth="5" />
            <rect x="70" y="84" width="76" height="34" rx="7" className="fill-white dark:fill-[#161615] stroke-red-500 dark:stroke-red-400" strokeWidth="5" />
            <circle cx="84" cy="61" r="4" className="fill-red-500 dark:fill-red-400" />
            <circle cx="84" cy="101" r="4" className="fill-red-500 dark:fill-red-400" />
            <line x1="100" y1="61" x2="132" y2="61" className="stroke-red-200 dark:stroke-red-800" strokeWidth="5" strokeLinecap="round" />
            <line x1="100" y1="101" x2="132" y2="101" className="stroke-red-200 dark:stroke-red-800" strokeWidth="5" strokeLinecap="round" />
            <path d="M150 92 l18 32 h-36 z" className="fill-red-500 dark:fill-red-400" />
            <rect x="147" y="104" width="6" height="12" rx="3" className="fill-white" />
            <circle cx="150" cy="120" r="3" className="fill-white" />
        </svg>
    );
}

function Maintenance({ label }: Readonly<{ label: string }>) {
    return (
        <svg viewBox="0 0 220 170" className={wrap} role="img" aria-label={label} fill="none">
            <ellipse cx="110" cy="150" rx="72" ry="10" className="fill-teal-100 dark:fill-teal-950/50" />
            <circle cx="110" cy="72" r="54" className="fill-teal-50 dark:fill-teal-950/40" />
            <g className="fill-teal-500 dark:fill-teal-400">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                    <rect key={a} x="104" y="34" width="12" height="14" rx="3" transform={`rotate(${a} 110 72)`} />
                ))}
            </g>
            <circle cx="110" cy="72" r="30" className="fill-teal-500 dark:fill-teal-400" />
            <circle cx="110" cy="72" r="14" className="fill-white dark:fill-[#161615]" />
        </svg>
    );
}

function Generic({ label }: Readonly<{ label: string }>) {
    return (
        <svg viewBox="0 0 220 170" className={wrap} role="img" aria-label={label} fill="none">
            <ellipse cx="110" cy="150" rx="72" ry="10" className="fill-gray-200 dark:fill-gray-800" />
            <circle cx="110" cy="72" r="54" className="fill-gray-100 dark:fill-gray-800/60" />
            <path d="M110 38 l40 70 h-80 z" className="fill-none stroke-gray-500 dark:stroke-gray-400" strokeWidth="7" strokeLinejoin="round" />
            <rect x="106" y="64" width="8" height="24" rx="4" className="fill-gray-500 dark:fill-gray-400" />
            <circle cx="110" cy="98" r="4.5" className="fill-gray-500 dark:fill-gray-400" />
        </svg>
    );
}

export function ErrorArt({ status }: Readonly<{ status: number }>) {
    const { t } = useTranslation();
    switch (status) {
        case 403: return <Forbidden label={t('errors.403.title')} />;
        case 404: return <NotFound label={t('errors.404.title')} />;
        case 419: return <Expired label={t('errors.419.title')} />;
        case 429: return <TooMany label={t('errors.429.title')} />;
        case 500: return <ServerError label={t('errors.500.title')} />;
        case 503: return <Maintenance label={t('errors.503.title')} />;
        default: return <Generic label={t('errors.fallback.title')} />;
    }
}
