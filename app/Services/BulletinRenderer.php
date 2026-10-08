<?php

namespace App\Services;

use App\Models\BulletinTemplate;
use App\Models\ClassSubject;
use App\Models\ReportCard;
use App\Models\School;

/**
 * Rend un bulletin scolaire à partir d'un modèle de colonnes configurable
 * (figé dans le snapshot {@see ReportCard}), coiffé de l'en-tête et du filigrane configurables.
 */
class BulletinRenderer
{
    public function __construct(private readonly DocumentRenderer $documents) {}

    public function render(ReportCard $reportCard, School $school): string
    {
        $css = $this->css();
        $body = $this->documentBody($reportCard, $school);

        return <<<HTML
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="utf-8"><style>{$css}</style></head>
        <body>{$body}</body>
        </html>
        HTML;
    }

    /**
     * Rendu groupé : tous les bulletins fournis dans un seul PDF, un par page.
     *
     * @param  iterable<int, ReportCard>  $cards
     */
    public function renderClass(iterable $cards, School $school): string
    {
        $css = $this->css();
        $pages = [];
        foreach ($cards as $card) {
            $pages[] = '<div class="bul-page">'.$this->documentBody($card, $school).'</div>';
        }
        $content = implode("\n", $pages);

        return <<<HTML
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="utf-8"><style>{$css} .bul-page{page-break-after:always;} .bul-page:last-child{page-break-after:auto;}</style></head>
        <body>{$content}</body>
        </html>
        HTML;
    }

    /** Contenu d'un bulletin (hors &lt;html&gt;/&lt;head&gt;) : filigrane, en-tête, tableau, pied. */
    private function documentBody(ReportCard $reportCard, School $school): string
    {
        $p = $reportCard->payload;
        $columns = $p['template']['columns'] ?? BulletinTemplate::defaultColumns();
        $options = $p['template']['options'] ?? BulletinTemplate::defaultOptions();
        $periodLb = ($p['period']['system'] ?? 'trimestre') === 'semestre' ? 'Sem.' : 'Trim.';

        $variables = $this->documents->resolveVariables($school, $reportCard->student);
        $header = $this->documents->headerHtml($school, $variables);
        $watermark = $this->documents->watermarkHtml($school, $variables);

        $head = '';
        foreach ($columns as $col) {
            $label = e(str_replace('{periode}', $periodLb, $col['label'] ?? ''));
            $align = $this->isLeft($col) ? 'left' : 'center';
            $width = isset($col['width']) ? 'width:'.(float) $col['width'].'%;' : '';
            $head .= "<th class=\"{$align}\" style=\"{$width}\">{$label}</th>";
        }

        $body = $this->bodyRows($columns, $p);
        $info = $this->infoBlock($p);
        $foot = $this->footBlock($p, $options);
        $title = e(mb_strtoupper('Bulletin — '.($p['period']['name'] ?? '')));

        return <<<HTML
            {$watermark}
            {$header}
            <div class="bul-title">{$title}</div>
            {$info}
            <table class="bul-table">
                <thead><tr>{$head}</tr></thead>
                <tbody>{$body}</tbody>
            </table>
            {$foot}
        HTML;
    }

    /** Corps du tableau, regroupé par groupe de matières (TOTAL par groupe si plusieurs). */
    private function bodyRows(array $columns, array $p): string
    {
        $grouped = [];
        foreach ($p['lines'] ?? [] as $line) {
            $grouped[$line['group'] ?? 'obligatoire'][] = $line;
        }

        $keys = array_values(array_filter(['obligatoire', 'facultatif'], fn ($g) => ! empty($grouped[$g])));
        foreach (array_keys($grouped) as $g) {
            if (! in_array($g, $keys, true)) {
                $keys[] = $g;
            }
        }

        $multi = count($keys) > 1;
        $colspan = count($columns);
        $html = '';

        foreach ($keys as $g) {
            if ($multi) {
                $label = e(ClassSubject::GROUPS[$g] ?? ucfirst($g));
                $html .= "<tr class=\"bul-group\"><td class=\"left\" colspan=\"{$colspan}\">{$label}</td></tr>";
            }

            $tc = 0.0;
            $tp = 0.0;
            $lastParent = null;
            foreach ($grouped[$g] as $line) {
                $parent = $line['parent'] ?? null;
                if ($parent && $parent !== $lastParent) {
                    $html .= "<tr class=\"bul-subhead\"><td class=\"left\" colspan=\"{$colspan}\">".e($parent).'</td></tr>';
                }
                $lastParent = $parent;

                $html .= '<tr>'.$this->cells($columns, $line).'</tr>';
                $tc += (float) ($line['coefficient'] ?? 0);
                $tp += (float) ($line['definitive'] ?? 0);
            }

            $totalLabel = $multi ? 'TOTAL '.($g === 'facultatif' ? '(facult.)' : '(oblig.)') : 'TOTAL';
            $html .= $this->totalRow($columns, $tc, $tp, $totalLabel);
        }

        return $html;
    }

    private function cells(array $columns, array $line): string
    {
        $cells = '';
        foreach ($columns as $col) {
            $align = $this->isLeft($col) ? 'left' : 'center';
            $strong = ($col['type'] ?? '') === 'note' && ($col['source'] ?? '') === 'moyenne' ? ' strong' : '';
            $small = in_array($col['type'] ?? '', ['appreciation', 'teacher'], true) ? ' small' : '';
            $cells .= "<td class=\"{$align}{$strong}{$small}\">".$this->cell($line, $col).'</td>';
        }

        return $cells;
    }

    private function totalRow(array $columns, float $totalCoeff, float $totalPoints, string $label): string
    {
        $cells = '';
        $first = true;
        foreach ($columns as $col) {
            if ($first) {
                $cells .= '<td class="left strong">'.e($label).'</td>';
                $first = false;

                continue;
            }
            $value = match ($col['type'] ?? '') {
                'coefficient' => $this->num($totalCoeff),
                'definitive' => $this->num($totalPoints),
                default => '',
            };
            $cells .= '<td class="center strong">'.$value.'</td>';
        }

        return "<tr class=\"bul-total-row\">{$cells}</tr>";
    }

    private function isLeft(array $col): bool
    {
        return in_array($col['type'] ?? '', ['subject', 'appreciation', 'teacher', 'text'], true);
    }

    private function cell(array $line, array $col): string
    {
        $type = $col['type'] ?? 'text';
        $source = $col['source'] ?? null;

        return match ($type) {
            'subject' => (! empty($line['parent']) ? '» ' : '').e($line['subject'] ?? ''),
            'coefficient' => $this->num($line['coefficient'] ?? null),
            'definitive' => $this->num($line['definitive'] ?? null),
            'rang' => $line['rang'] !== null ? e($this->ordinal((int) $line['rang'])) : '',
            'appreciation' => e($line['appreciation'] ?? ''),
            'teacher' => e($line['teacher'] ?? ''),
            'signature', 'text' => '',
            'note' => $this->noteValue($line, $source),
            default => '',
        };
    }

    private function noteValue(array $line, ?string $source): string
    {
        if ($source === null) {
            return '';
        }
        if (str_starts_with($source, 'type:')) {
            return $this->num($line['by_type'][substr($source, 5)] ?? null);
        }

        // La source « composition » (NOTE_SOURCES / colonnes) correspond à la clé
        // « compo » du snapshot : sans cet alias la colonne Compo reste toujours vide.
        $key = $source === 'composition' ? 'compo' : $source;

        return $this->num($line[$key] ?? null);
    }

    private function infoBlock(array $p): string
    {
        $eleve = e($p['student']['name'] ?? '');
        $classe = e($p['class']['name'] ?? '');
        $effectif = e((string) ($p['effectif'] ?? ''));
        $annee = e($p['year'] ?? '');

        return <<<HTML
        <table class="bul-info">
            <tr>
                <td><strong>Nom de l'élève :</strong> {$eleve}</td>
                <td><strong>Classe :</strong> {$classe}</td>
                <td><strong>Effectif :</strong> {$effectif}</td>
                <td><strong>Année :</strong> {$annee}</td>
            </tr>
        </table>
        HTML;
    }

    private function footBlock(array $p, array $options): string
    {
        $average = $this->num($p['average'] ?? null);
        $rank = isset($p['rank']) && $p['rank'] !== null ? e($this->ordinal((int) $p['rank'])) : '—';
        $effectif = e((string) ($p['effectif'] ?? ''));
        $mention = e($p['mention'] ?? '—');
        $obs = e($p['observations'] ?? '');
        $nb = e($options['nb_text'] ?? '');
        $titulaire = e($options['signataire_titulaire'] ?? 'Le Titulaire');
        $chef = e($options['signataire_chef'] ?? "Le Chef d'Établissement");

        $stats = '';
        if (! empty($options['show_class_stats']) && ! empty($p['class_stats'])) {
            $cs = $p['class_stats'];
            $stats = '<div class="bul-stats">Moyenne la plus forte : <strong>'.$this->num($cs['highest'] ?? null).'/20</strong>'
                .' — la plus faible : <strong>'.$this->num($cs['lowest'] ?? null).'/20</strong>'
                .' — moyenne de la classe : <strong>'.$this->num($cs['average'] ?? null).'/20</strong></div>';
        }

        $discipline = ! empty($options['show_discipline']) ? $this->disciplineBlock($p) : '';
        $recap = ! empty($options['show_period_recap']) ? $this->recapBlock($p) : '';
        $nbHtml = $nb !== '' ? '<div class="bul-nb">N.B. : '.$nb.'</div>' : '';

        return <<<HTML
        <table class="bul-summary">
            <tr>
                <td><strong>Moyenne générale :</strong> <span class="big">{$average}/20</span></td>
                <td><strong>Rang :</strong> {$rank} sur {$effectif}</td>
                <td><strong>Mention :</strong> {$mention}</td>
            </tr>
        </table>
        {$stats}
        {$recap}
        {$discipline}

        <div class="bul-obs"><strong>Observations du Chef d'Établissement :</strong> {$obs}</div>

        <table class="bul-sign">
            <tr>
                <td>{$titulaire}<div class="sign-space"></div></td>
                <td>{$chef}<div class="sign-space"></div></td>
            </tr>
        </table>

        {$nbHtml}
        HTML;
    }

    private function disciplineBlock(array $p): string
    {
        $retards = e((string) ($p['retards'] ?? 0));
        $absences = e((string) ($p['absences'] ?? 0));
        $punitions = e((string) ($p['punitions'] ?? 0));
        $exclusions = e((string) ($p['exclusions'] ?? 0));
        $decision = e(($p['decision'] ?? '') ?: ($p['mention'] ?? '—'));

        return <<<HTML
        <table class="bul-disc">
            <tr>
                <td><strong>Retards :</strong> {$retards}</td>
                <td><strong>Absences :</strong> {$absences}</td>
                <td><strong>Punitions :</strong> {$punitions}</td>
                <td><strong>Exclusions :</strong> {$exclusions}</td>
            </tr>
            <tr>
                <td colspan="4"><strong>Décision du conseil :</strong> {$decision}</td>
            </tr>
        </table>
        HTML;
    }

    private function recapBlock(array $p): string
    {
        $recap = $p['recap'] ?? null;
        if (! $recap) {
            return '';
        }

        $rows = '';
        foreach ($recap['periods'] ?? [] as $period) {
            $rows .= '<tr><td class="left">'.e($period['name'] ?? '').'</td>'
                .'<td>'.$this->num($period['average'] ?? null).'/20</td>'
                .'<td>'.($period['rank'] !== null ? e($this->ordinal((int) $period['rank'])) : '—').'</td></tr>';
        }
        $annual = $recap['annual'] ?? ['average' => null, 'rank' => null];
        $rows .= '<tr class="bul-total-row"><td class="left strong">Moyenne annuelle</td>'
            .'<td class="strong">'.$this->num($annual['average'] ?? null).'/20</td>'
            .'<td class="strong">'.($annual['rank'] !== null ? e($this->ordinal((int) $annual['rank'])) : '—').'</td></tr>';

        return <<<HTML
        <table class="bul-recap">
            <thead><tr><th class="left">Période</th><th>Moyenne</th><th>Rang</th></tr></thead>
            <tbody>{$rows}</tbody>
        </table>
        HTML;
    }

    private function num(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        return rtrim(rtrim(number_format((float) $value, 2, ',', ''), '0'), ',');
    }

    private function ordinal(int $rank): string
    {
        return $rank === 1 ? '1er' : $rank.'e';
    }

    private function css(): string
    {
        // L'en-tête ministériel est rendu par DocumentRenderer mais ses styles
        // (dont le plafond de taille du logo) ne sont pas dans le baseCss du bulletin :
        // sans eux le logo s'affiche à sa taille naturelle et écrase l'en-tête.
        return $this->documents->headerCss().<<<'CSS'
        * { box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; color: #1a1a1a; font-size: 11px; margin: 0; }
        .bul-title { text-align: center; font-weight: bold; font-size: 14px; text-transform: uppercase; margin: 6px 0 10px; }
        .bul-info { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .bul-info td { padding: 2px 4px; font-size: 11px; }
        .bul-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .bul-table th, .bul-table td { border: 1px solid #333; padding: 3px 4px; text-align: center; word-wrap: break-word; }
        .bul-table th { background: #eee; font-size: 10px; }
        .bul-table td.left, .bul-table th.left { text-align: left; }
        .bul-table td.center { text-align: center; }
        .bul-table td.small { font-size: 9px; font-style: italic; color: #444; }
        .bul-table td.strong, .strong { font-weight: bold; }
        .bul-group td { background: #e9eef5; font-weight: bold; text-transform: uppercase; font-size: 10px; }
        .bul-subhead td { background: #f7f9fc; font-weight: bold; font-size: 10px; }
        .bul-total-row td { background: #f4f4f4; }
        .bul-summary { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .bul-summary td { padding: 4px; font-size: 12px; }
        .bul-summary .big { font-size: 16px; font-weight: bold; }
        .bul-stats { margin-top: 6px; font-size: 11px; }
        .bul-recap { width: 60%; border-collapse: collapse; margin-top: 10px; }
        .bul-recap th, .bul-recap td { border: 1px solid #333; padding: 3px 5px; text-align: center; font-size: 10px; }
        .bul-recap th.left, .bul-recap td.left { text-align: left; }
        .bul-disc { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .bul-disc td { border: 1px solid #ccc; padding: 4px 6px; font-size: 11px; }
        .bul-obs { margin-top: 12px; min-height: 28px; }
        .bul-sign { width: 100%; margin-top: 24px; }
        .bul-sign td { width: 50%; text-align: center; vertical-align: top; }
        .sign-space { height: 60px; }
        .bul-nb { margin-top: 16px; font-style: italic; font-size: 10px; }
        CSS;
    }
}
