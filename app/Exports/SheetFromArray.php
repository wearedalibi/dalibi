<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

/** Feuille Excel générique (titre + en-têtes + lignes). */
class SheetFromArray implements FromArray, ShouldAutoSize, WithHeadings, WithTitle
{
    public function __construct(
        private readonly string $title,
        private readonly array $headings,
        private readonly array $rows,
    ) {}

    public function array(): array
    {
        return $this->rows;
    }

    public function headings(): array
    {
        return $this->headings;
    }

    public function title(): string
    {
        // Excel limite les titres d'onglet à 31 caractères.
        return mb_substr($this->title, 0, 31);
    }
}
