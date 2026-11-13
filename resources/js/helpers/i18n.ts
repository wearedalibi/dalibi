import { usePage } from '@inertiajs/react';

type Translations = Record<string, unknown>;

export interface LocaleOption {
    code: string;
    label: string;
    flag: string;
}

interface SharedI18n {
    translations?: Translations;
    locale?: string;
    locales?: LocaleOption[];
}

/** Résout une clé pointée (« menu.dashboard ») dans le dictionnaire imbriqué. */
function resolve(dict: Translations, key: string): string | undefined {
    const value = key.split('.').reduce<unknown>((acc, part) => {
        if (acc && typeof acc === 'object') {
            return (acc as Record<string, unknown>)[part];
        }
        return undefined;
    }, dict);

    return typeof value === 'string' ? value : undefined;
}

/** Remplace les jetons `:param` par leur valeur. */
function interpolate(text: string, params?: Record<string, string | number>): string {
    if (!params) {
        return text;
    }
    return text.replace(/:(\w+)/g, (match, name) => (name in params ? String(params[name]) : match));
}

/**
 * Traduction côté front, alimentée par les fichiers de langue Laravel partagés
 * via Inertia. `t('menu.dashboard')` ; interpolation : `t('x', { name })`.
 * Clé absente → repli sur la langue par défaut (fusionnée côté serveur) puis sur la clé.
 */
export function useTranslation() {
    const props = usePage().props as unknown as SharedI18n;
    const translations = props.translations ?? {};
    const locale = props.locale ?? 'fr';
    const locales = props.locales ?? [];

    const t = (key: string, params?: Record<string, string | number>): string =>
        interpolate(resolve(translations, key) ?? key, params);

    return { t, locale, locales };
}
