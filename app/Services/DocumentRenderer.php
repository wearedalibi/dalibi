<?php

namespace App\Services;

use App\Models\DocumentHeader;
use App\Models\DocumentTemplate;
use App\Models\School;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

final class DocumentRenderer
{
    /**
     * Catalogue des variables disponibles, pour l'éditeur (UI).
     *
     * @return array<string, array{label: string, variables: array<string, string>}>
     */
    public static function variableCatalog(): array
    {
        return [
            'ecole' => [
                'label' => 'École',
                'variables' => [
                    'ecole.nom' => 'Nom de l\'école',
                    'ecole.ministere' => 'Ministère de tutelle',
                    'ecole.terme' => 'Terme (ex. République Togolaise)',
                    'ecole.devise' => 'Devise',
                    'ecole.bp' => 'Boîte postale',
                    'ecole.ville' => 'Ville',
                    'ecole.telephone' => 'Téléphone',
                    'ecole.email' => 'E-mail',
                ],
            ],
            'eleve' => [
                'label' => 'Élève',
                'variables' => [
                    'eleve.nom_complet' => 'Nom complet',
                    'eleve.nom' => 'Nom',
                    'eleve.prenom' => 'Prénom(s)',
                    'eleve.matricule' => 'Matricule',
                    'eleve.date_naissance' => 'Date de naissance',
                    'eleve.lieu_naissance' => 'Lieu de naissance',
                    'eleve.sexe' => 'Sexe',
                    'eleve.nationalite' => 'Nationalité',
                ],
            ],
            'scolarite' => [
                'label' => 'Scolarité',
                'variables' => [
                    'classe.nom' => 'Classe',
                    'annee_scolaire' => 'Année scolaire',
                ],
            ],
            'document' => [
                'label' => 'Document',
                'variables' => [
                    'date.aujourdhui' => 'Date du jour',
                    'date.lieu' => 'Fait à (ville)',
                    'document.reference' => 'N° de référence',
                    'signataire.titre' => 'Titre du signataire',
                ],
            ],
        ];
    }

    /**
     * Construit la table des valeurs pour un élève donné.
     *
     * @return array<string, string>
     */
    public function resolveVariables(
        School $school,
        ?Student $student = null,
        array $extra = []
    ): array {
        $vars = [
            'ecole.nom' => $school->name ?? '',
            'ecole.ministere' => $school->ministry ?? 'Ministère des Enseignements Primaire, Secondaire et Technique',
            'ecole.terme' => $school->terme ?? 'République Togolaise',
            'ecole.devise' => $school->devise ?? '',
            'ecole.bp' => $school->po_box ?? '',
            'ecole.ville' => $school->city ?? '',
            'ecole.telephone' => $school->phone ?? '',
            'ecole.email' => $school->email ?? '',
            'date.aujourdhui' => Carbon::now()->locale('fr')->isoFormat('D MMMM YYYY'),
            'date.lieu' => $school->city ?? '',
        ];

        if ($student) {
            $vars += [
                'eleve.nom_complet' => trim(($student->lastname ?? '').' '.($student->firstname ?? '')),
                'eleve.nom' => $student->lastname ?? '',
                'eleve.prenom' => $student->firstname ?? '',
                'eleve.matricule' => $student->matricule ?? '',
                'eleve.date_naissance' => $student->birth_date
                    ? Carbon::parse($student->birth_date)->locale('fr')->isoFormat('D MMMM YYYY')
                    : '',
                'eleve.lieu_naissance' => $student->place_of_birth ?? '',
                'eleve.sexe' => match ($student->gender) {
                    'male' => 'Masculin',
                    'female' => 'Féminin',
                    default => '',
                },
                'eleve.nationalite' => $student->nationality ?? '',
            ];
        }

        return array_merge($vars, $extra);
    }

    /**
     * Remplace les variables {{ ... }} dans un contenu.
     *
     * @param  bool  $escapeValues  échappe les valeurs (HTML) avant injection — à activer
     *                              lorsque le contenu est du HTML rendu tel quel (corps de document).
     */
    public function interpolate(string $content, array $variables, bool $escapeValues = false): string
    {
        return preg_replace_callback('/\{\{\s*([\w.]+)\s*\}\}/', function ($m) use ($variables, $escapeValues) {
            $value = (string) ($variables[$m[1]] ?? '');

            return $escapeValues ? e($value) : $value;
        }, $content);
    }

    /**
     * Rend le document complet (en-tête + corps + signature) en HTML prêt pour le PDF.
     */
    public function render(DocumentTemplate $template, array $variables): string
    {
        $body = $this->renderBody($template, $variables);
        $header = $template->header_enabled ? $this->renderHeader($template, $variables) : '';
        $signature = $template->show_signature ? $this->renderSignature($template, $variables) : '';
        $watermark = $this->renderWatermark($template->school, $variables);

        $css = $this->baseCss();

        return <<<HTML
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="utf-8"><style>{$css}</style></head>
        <body>
            {$watermark}
            {$header}
            <main class="doc-body">{$body}</main>
            {$signature}
        </body>
        </html>
        HTML;
    }

    /**
     * Corps du document selon la source :
     *  - `blade` : mise en page prédéfinie (liste blanche) rendue via une vue Blade.
     *              Blade échappe automatiquement `{{ }}`, donc pas de pré-échappement.
     *  - sinon   : HTML saisi via l'éditeur ; les VALEURS de variables sont échappées
     *              pour empêcher toute injection HTML dans le PDF.
     */
    protected function renderBody(DocumentTemplate $template, array $variables): string
    {
        if ($template->source === 'blade' && $this->isValidLayout($template->layout)) {
            return view("documents.{$template->layout}", ['v' => $variables])->render();
        }

        return $this->interpolate($template->content ?? '', $variables, true);
    }

    /** Le layout demandé fait-il partie de la liste blanche ET la vue existe-t-elle ? */
    protected function isValidLayout(?string $layout): bool
    {
        return $layout !== null
            && array_key_exists($layout, DocumentTemplate::LAYOUTS)
            && view()->exists("documents.{$layout}");
    }

    /** En-tête configurable réutilisable (ex. bulletins), pour une école donnée. */
    public function headerHtml(School $school, array $variables): string
    {
        $template = new DocumentTemplate(['header_enabled' => true]);
        $template->setRelation('school', $school);

        return $this->renderHeader($template, $variables);
    }

    /** Filigrane configurable réutilisable, pour une école donnée. */
    public function watermarkHtml(?School $school, array $variables): string
    {
        return $this->renderWatermark($school, $variables);
    }

    /**
     * En-tête : disposition personnalisée (drag-and-drop) si l'école en a une,
     * sinon l'en-tête classique par défaut (rétro-compatibilité).
     */
    protected function renderHeader(DocumentTemplate $template, array $variables): string
    {
        $header = $template->school?->documentHeader;
        $preset = $header?->preset ?? 'ministeriel';

        // Préréglage « personnalisé » : canevas glisser-déposer (si des éléments existent).
        // Sinon on rend le gabarit officiel ministériel (défaut).
        if ($preset !== 'personnalise' || empty($header->layout['elements'])) {
            return $this->renderMinisterialHeader($template, $variables);
        }

        $layout = $header->layout;
        $width = (int) ($layout['width'] ?? DocumentHeader::CANVAS_WIDTH);
        $height = (int) ($layout['height'] ?? 130);

        $inner = '';
        foreach ($layout['elements'] as $element) {
            $inner .= $this->renderElement((array) $element, $template, $variables);
        }

        return <<<HTML
        <div class="doc-header-canvas" style="position:relative;width:{$width}px;height:{$height}px;margin:0 auto 18px;">
            {$inner}
        </div>
        HTML;
    }

    /** Rend un bloc positionné de l'en-tête (texte interpolé ou logo). */
    protected function renderElement(array $el, DocumentTemplate $template, array $variables): string
    {
        $x = (int) ($el['x'] ?? 0);
        $y = (int) ($el['y'] ?? 0);
        $w = (int) ($el['w'] ?? 200);
        $align = in_array($el['align'] ?? 'left', ['left', 'center', 'right'], true) ? $el['align'] : 'left';
        $base = "position:absolute;left:{$x}px;top:{$y}px;width:{$w}px;text-align:{$align};";

        if (($el['type'] ?? 'text') === 'logo') {
            $logo = $this->logoDataUri($template->school);
            if (! $logo) {
                return '';
            }

            return '<div style="'.$base.'"><img src="'.$logo.'" style="max-width:'.$w.'px;max-height:'.$w.'px;object-fit:contain;" alt="logo"></div>';
        }

        $content = e($this->interpolate((string) ($el['content'] ?? ''), $variables));
        if (trim(strip_tags($content)) === '') {
            return '';
        }

        $size = (int) ($el['fontSize'] ?? 12);
        $weight = ! empty($el['bold']) ? 'bold' : 'normal';
        $italic = ! empty($el['italic']) ? 'italic' : 'normal';
        $color = $this->cssColor($el['color'] ?? null);

        return '<div style="'.$base."font-size:{$size}px;font-weight:{$weight};font-style:{$italic};color:{$color};line-height:1.3;\">".$content.'</div>';
    }

    /** Filigrane (texte ou image) répété sur chaque page. */
    protected function renderWatermark(?School $school, array $variables): string
    {
        $wm = $school?->documentHeader?->watermark;
        if (! $wm || empty($wm['enabled'])) {
            return '';
        }

        $opacity = max(0, min(100, (int) ($wm['opacity'] ?? 8))) / 100;
        $rotation = (int) ($wm['rotation'] ?? -30);
        $size = (int) ($wm['size'] ?? 60);

        if (($wm['type'] ?? 'text') === 'image' && ! empty($wm['image_path']) && Storage::disk('media')->exists($wm['image_path'])) {
            $mime = Storage::disk('media')->mimeType($wm['image_path']) ?: 'image/png';
            $data = 'data:'.$mime.';base64,'.base64_encode(Storage::disk('media')->get($wm['image_path']));
            $content = '<img src="'.$data.'" style="width:'.($size * 6).'px;max-width:90%;">';
        } else {
            $text = e($this->interpolate((string) ($wm['text'] ?? ''), $variables));
            if (trim($text) === '') {
                return '';
            }
            $color = $this->cssColor($wm['color'] ?? null);
            $content = '<div style="font-size:'.$size.'px;font-weight:bold;color:'.$color.';white-space:nowrap;">'.$text.'</div>';
        }

        return <<<HTML
        <div style="position:fixed;top:38%;left:0;width:100%;text-align:center;opacity:{$opacity};transform:rotate({$rotation}deg);">
            {$content}
        </div>
        HTML;
    }

    /**
     * En-tête officiel togolais (préréglage « ministériel ») : trois colonnes —
     * Ministère + établissement à gauche, logo au centre, République + devise à droite,
     * avec filets de séparation. Rendu via un tableau pour une fidélité PDF fiable.
     */
    protected function renderMinisterialHeader(DocumentTemplate $template, array $variables): string
    {
        $ministere = e($variables['ecole.ministere'] ?? '');
        $nom = e($variables['ecole.nom'] ?? '');
        $terme = e($variables['ecole.terme'] ?? '');
        $devise = e($variables['ecole.devise'] ?? '');

        // Coordonnées : « B.P. … – Tél. : … » puis la ville.
        $ligne1 = collect([
            ! empty($variables['ecole.bp']) ? 'B.P. '.$variables['ecole.bp'] : null,
            ! empty($variables['ecole.telephone']) ? 'Tél. : '.$variables['ecole.telephone'] : null,
        ])->filter()->implode(' – ');
        $ligne2 = $variables['ecole.ville'] ?? '';
        $info = e($ligne1).($ligne1 && $ligne2 ? '<br>' : '').e($ligne2);

        $sep = '<div class="mh-sep"></div>';
        $left = <<<HTML
            <div class="mh-ministere">{$ministere}</div>
            {$sep}
            <div class="mh-school">{$nom}</div>
            <div class="mh-info">{$info}</div>
        HTML;
        $right = <<<HTML
            <div class="mh-republic">{$terme}</div>
            <div class="mh-motto">{$devise}</div>
            {$sep}
        HTML;

        // Colonne logo au centre uniquement si un logo est disponible.
        $logo = $this->logoDataUri($template->school);
        if ($logo) {
            $center = '<td class="mh-col mh-logo"><img class="mh-logo-img" src="'.$logo.'" alt="logo"></td>';
            $cols = "<td class=\"mh-col mh-side\" style=\"width:38%\">{$left}</td>{$center}<td class=\"mh-col mh-side\" style=\"width:38%\">{$right}</td>";
        } else {
            $cols = "<td class=\"mh-col mh-side\" style=\"width:50%\">{$left}</td><td class=\"mh-col mh-side\" style=\"width:50%\">{$right}</td>";
        }

        return <<<HTML
        <header class="doc-mheader">
            <table class="mh-table"><tr>{$cols}</tr></table>
        </header>
        HTML;
    }

    /**
     * N'autorise qu'une couleur hexadécimale (#rgb…#rrggbbaa) dans les attributs `style`,
     * sinon couleur par défaut — empêche toute injection HTML via le champ couleur.
     */
    protected function cssColor(?string $color): string
    {
        return preg_match('/^#[0-9a-fA-F]{3,8}$/', (string) $color) === 1 ? $color : '#1a1a1a';
    }

    /** Logo de l'école embarqué en data-URI (compatible dompdf, tout disque). */
    protected function logoDataUri(?School $school): ?string
    {
        $logoPath = $school?->logo;
        if ($logoPath && Storage::disk('media')->exists($logoPath)) {
            $mime = Storage::disk('media')->mimeType($logoPath) ?: 'image/png';

            return 'data:'.$mime.';base64,'.base64_encode(Storage::disk('media')->get($logoPath));
        }

        return null;
    }

    protected function renderSignature(DocumentTemplate $template, array $variables): string
    {
        $lieu = e($variables['date.lieu'] ?? '');
        $date = e($variables['date.aujourdhui'] ?? '');
        $titre = e($template->signatory_title ?: ($variables['signataire.titre'] ?? 'Le Directeur'));

        return <<<HTML
        <footer class="doc-signature">
            <div class="doc-sign-place">Fait à {$lieu}, le {$date}</div>
            <div class="doc-sign-title">{$titre}</div>
            <div class="doc-sign-space"></div>
        </footer>
        HTML;
    }

    /**
     * CSS de l'en-tête officiel (ministériel + logo). **Source unique** : tous les
     * documents (bulletin, bulletin de paie, export statistiques, certificats et
     * attestations) partagent exactement cette en-tête. Ne pas redéfinir les
     * règles `.mh-*` ou `.doc-mheader` ailleurs — {@see baseCss()} la compose.
     */
    public function headerCss(): string
    {
        return <<<'CSS'
        .doc-mheader { margin-bottom: 20px; border-bottom: 1px solid #000; padding-bottom: 10px;
            font-family: 'DejaVu Serif', 'Times New Roman', serif; color: #1a1a1a; }
        .mh-table { width: 100%; border-collapse: collapse; }
        .mh-col { vertical-align: middle; text-align: center; padding: 0 6px; }
        .mh-logo { width: 20%; }
        .mh-logo-img { max-width: 68px; max-height: 68px; object-fit: contain; }
        .mh-ministere { font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.4px; }
        .mh-school { font-size: 15px; font-weight: bold; text-transform: uppercase; margin: 3px 0; }
        .mh-info { font-size: 10.5px; }
        .mh-republic { font-size: 12.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; }
        .mh-motto { font-size: 11px; font-style: italic; font-weight: bold; margin-top: 2px; }
        .mh-sep { width: 50px; height: 1px; background: #000; margin: 4px auto; }
        CSS;
    }

    protected function baseCss(): string
    {
        // L'en-tête ministérielle (règles .mh-* / .doc-mheader) vient d'une source
        // unique — headerCss() — pour que les documents officiels partagent
        // exactement l'en-tête du bulletin. Ici, seuls le corps et la signature.
        return $this->headerCss().<<<'CSS'
        * { box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.6; margin: 0; }
        .doc-body { margin: 28px 0; }
        .doc-body h1, .doc-body h2 { text-align: center; text-transform: uppercase; }
        .doc-signature { margin-top: 48px; text-align: right; }
        .doc-sign-place { margin-bottom: 6px; }
        .doc-sign-title { font-weight: bold; }
        .doc-sign-space { height: 70px; }
        CSS;
    }
}
