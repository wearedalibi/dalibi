/**
 * En-tête officielle partagée par les documents imprimables (reçu, facture).
 *
 * Le HTML et le CSS proviennent du serveur (`DocumentRenderer::headerHtml()` /
 * `headerCss()`) : c'est la **même source unique** que les bulletins, la paie et
 * les certificats. On l'injecte tel quel pour garantir un rendu strictement
 * identique — logo, ministère, établissement, République et devise.
 */
interface OfficialHeaderProps {
    header?: string | null;
    headerCss?: string | null;
}

export function OfficialHeader({ header, headerCss }: Readonly<OfficialHeaderProps>) {
    if (!header) {
        return null;
    }

    return (
        <>
            {headerCss ? <style dangerouslySetInnerHTML={{ __html: headerCss }} /> : null}
            <div className="official-header text-black" dangerouslySetInnerHTML={{ __html: header }} />
        </>
    );
}
