<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

/** Construit un classeur Excel multi-feuilles à partir des données d'une section. */
class StatisticsExport implements WithMultipleSheets
{
    private const METHOD_LABELS = [
        'CASH' => 'Espèces',
        'MOBILE_MONEY' => 'Mobile Money',
        'BANK_TRANSFER' => 'Virement',
        'CHEQUE' => 'Chèque',
    ];

    public function __construct(
        private readonly string $section,
        private readonly array $data,
    ) {}

    public function sheets(): array
    {
        return match ($this->section) {
            'finances' => $this->finance(),
            'reussite' => $this->success(),
            'encadrement' => $this->resources(),
            'assiduite' => $this->attendance(),
            'comparaisons' => $this->trends(),
            'geographie' => $this->geography(),
            default => $this->enrollment(),
        };
    }

    private function rows(mixed $items, callable $map): array
    {
        return Collection::make($items)->map($map)->values()->all();
    }

    private function enrollment(): array
    {
        $d = $this->data;

        return [
            new SheetFromArray('Synthèse', ['Indicateur', 'Valeur'], [
                ['Effectif total', $d['total']],
                ['Garçons', $d['gender']['male']],
                ['Filles', $d['gender']['female']],
                ['IPS (filles/garçons)', $d['ips']],
                ['Part des filles (%)', $d['part_filles']],
                ['Taux de promotion (%)', $d['rates']['promotion']],
                ['Taux de redoublement (%)', $d['rates']['redoublement']],
                ["Taux d'abandon (%)", $d['rates']['abandon']],
                ['Âge moyen', $d['age_moyen']],
                ['Taux de sur-âge (%)', $d['over_age']['evaluated'] ? $d['over_age']['rate'] : null],
                ['Élèves en sur-âge', $d['over_age']['count']],
            ]),
            new SheetFromArray('Effectifs par classe', ['Classe', 'Garçons', 'Filles', 'Total'],
                $this->rows($d['by_class'], fn ($c) => [$c['name'], $c['male'], $c['female'], $c['total']])),
            new SheetFromArray('Origine (villes)', ['Ville', 'Garçons', 'Filles', 'Total'],
                $this->rows($d['by_city'], fn ($c) => [$c['city'], $c['male'], $c['female'], $c['total']])),
        ];
    }

    private function finance(): array
    {
        $d = $this->data;

        return [
            new SheetFromArray('Synthèse', ['Indicateur', 'Valeur'], [
                ['Total facturé', $d['billed']],
                ['Total encaissé', $d['collected']],
                ['Reste à recouvrer', $d['remaining']],
                ['Taux de recouvrement (%)', $d['recovery_rate']],
                ['Factures soldées', $d['paid_count']],
                ['Factures partielles', $d['partial_count']],
                ['Factures impayées', $d['unpaid_count']],
            ]),
            new SheetFromArray('Recouvrement par classe', ['Classe', 'Facturé', 'Encaissé', 'Taux (%)'],
                $this->rows($d['by_class'], fn ($c) => [$c['name'], $c['billed'], $c['collected'], $c['rate']])),
            new SheetFromArray('Modes de paiement', ['Mode', 'Montant', 'Opérations'],
                $this->rows($d['by_method'], fn ($m) => [self::METHOD_LABELS[$m['method']] ?? $m['method'], $m['total'], $m['count']])),
            new SheetFromArray('Encaissements mensuels', ['Mois', 'Montant'],
                $this->rows($d['monthly'], fn ($m) => [$m['month'], $m['total']])),
        ];
    }

    private function success(): array
    {
        $d = $this->data;

        return [
            new SheetFromArray('Synthèse', ['Indicateur', 'Valeur'], [
                ['Bulletins validés', $d['bulletins']],
                ['Moyenne générale', $d['moyenne_generale']],
                ['Taux de réussite interne (%)', $d['pass_rate']],
                ['Mentions Passable', $d['mentions']['passable']],
                ['Mentions Assez bien', $d['mentions']['assez_bien']],
                ['Mentions Bien', $d['mentions']['bien']],
                ['Mentions Très bien', $d['mentions']['tres_bien']],
                ['Examens off. — inscrits', $d['exams_summary']['registered']],
                ['Examens off. — admis', $d['exams_summary']['admitted']],
                ["Examens off. — taux d'admission (%)", $d['exams_summary']['admission_rate']],
            ]),
            new SheetFromArray('Examens officiels', ['Examen', 'Type', 'Centre', 'Inscrits', 'Admis', 'Échoués', 'Absents', 'Admission (%)', 'Présentation (%)'],
                $this->rows($d['exams'], fn ($e) => [
                    $e['name'], $e['type'], $e['center'], $e['registered'], $e['admitted'],
                    $e['failed'], $e['absent'], $e['admission_rate'], $e['presentation_rate'],
                ])),
        ];
    }

    private function resources(): array
    {
        $d = $this->data;

        return [
            new SheetFromArray('Synthèse', ['Indicateur', 'Valeur'], [
                ['Effectif total', $d['total_students']],
                ['Enseignants affectés', $d['total_teachers']],
                ['Ratio élèves / enseignant (REM)', $d['rem']],
                ['Nombre de classes', $d['class_count']],
                ['Taille moyenne des classes', $d['avg_class_size']],
                ["Classes pléthoriques (> {$d['threshold']})", $d['overcrowded']->count()],
            ]),
            new SheetFromArray('Taille des classes', ['Classe', 'Effectif'],
                $this->rows($d['class_sizes'], fn ($c) => [$c['name'], $c['total']])),
        ];
    }

    private function attendance(): array
    {
        $d = $this->data;

        return [
            new SheetFromArray('Synthèse', ['Indicateur', 'Valeur'], [
                ['Enregistrements', $d['total']],
                ['Taux de présence (%)', $d['presence_rate']],
                ["Taux d'absence (%)", $d['absence_rate']],
                ['Taux de retard (%)', $d['late_rate']],
                ['Présents', $d['present']],
                ['Absents', $d['absent']],
                ['Retards', $d['late']],
                ['Excusés', $d['excused']],
                ["Absentéisme chronique (> {$d['chronic_threshold']} abs.)", $d['chronic_absentees']],
            ]),
            new SheetFromArray('Par période', ['Période', 'Présents', 'Absents', 'Retards'],
                $this->rows($d['by_period'], fn ($p) => [$p['name'], $p['present'], $p['absent'], $p['late']])),
            new SheetFromArray("Taux d'absence par classe", ['Classe', "Taux d'absence (%)"],
                $this->rows($d['by_class'], fn ($c) => [$c['name'], $c['absence_rate']])),
        ];
    }

    private function trends(): array
    {
        $d = $this->data;

        return [
            new SheetFromArray('Comparaison pluriannuelle',
                ['Année', 'Effectif', '% filles', 'Redoublement (%)', 'Abandon (%)', 'Recouvrement (%)', 'Réussite (%)', 'Admission (%)'],
                $this->rows($d['series'], fn ($r) => [
                    $r['year'], $r['effectif'], $r['part_filles'], $r['redoublement'],
                    $r['abandon'], $r['recouvrement'], $r['reussite'], $r['admission'],
                ])),
        ];
    }

    private function geography(): array
    {
        $d = $this->data;

        return [
            new SheetFromArray('Par région', ['Région', 'Élèves'],
                $this->rows($d['by_region'], fn ($r) => [$r['name'], $r['total']])),
            new SheetFromArray('Par préfecture', ['Préfecture', 'Région', 'Élèves'],
                $this->rows($d['by_prefecture'], fn ($p) => [$p['name'], $p['region'], $p['total']])),
        ];
    }
}
