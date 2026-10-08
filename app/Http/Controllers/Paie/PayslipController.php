<?php

namespace App\Http\Controllers\Paie;

use App\Http\Controllers\Controller;
use App\Models\Payslip;
use App\Models\School;
use App\Services\DocumentRenderer;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Str;

class PayslipController extends Controller
{
    /** Télécharge le bulletin de paie en PDF, avec l'en-tête de l'école. */
    public function pdf(Payslip $payslip)
    {
        $payslip->load('payRun');
        $school = School::query()->first() ?? new School;

        // Même en-tête que les documents administratifs : on résout le jeu de
        // variables standard de l'école (nom, ministère, terme, ville, date…),
        // que ce soit l'en-tête ministériel par défaut ou l'en-tête personnalisé.
        $renderer = app(DocumentRenderer::class);
        $variables = $renderer->resolveVariables($school, null, ['document_title' => 'BULLETIN DE PAIE']);
        $headerHtml = $renderer->headerHtml($school, $variables);
        $watermarkHtml = $renderer->watermarkHtml($school, $variables);

        $html = view('payroll.payslip', [
            'payslip' => $payslip,
            'payRun' => $payslip->payRun,
            'school' => $school,
            'headerHtml' => $headerHtml,
            'headerCss' => $renderer->headerCss(),
            'watermarkHtml' => $watermarkHtml,
            'currency' => $school->currencySymbol(),
        ])->render();

        $name = $payslip->payload['employee']['name'] ?? 'employe';
        $filename = Str::slug('bulletin-paie-'.$name.'-'.$payslip->payRun->reference).'.pdf';

        return Pdf::loadHTML($html)->setPaper('a4', 'portrait')->download($filename);
    }
}
