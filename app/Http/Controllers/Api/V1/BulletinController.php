<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\Api\ReportCardResource;
use App\Models\ReportCard;
use App\Models\School;
use App\Services\BulletinRenderer;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class BulletinController extends ApiController
{
    public function index(Request $request, string $student): AnonymousResourceCollection
    {
        $studentModel = $this->resolveStudent($request, $student);

        $cards = ReportCard::where('student_id', $studentModel->id)
            ->orderByDesc('locked_at')
            ->get();

        return ReportCardResource::collection($cards);
    }

    public function pdf(Request $request, string $student, string $reportCard)
    {
        $studentModel = $this->resolveStudent($request, $student);

        $card = ReportCard::with('student')
            ->where('student_id', $studentModel->id)   // garantit l'appartenance
            ->where('id', $reportCard)
            ->firstOrFail();

        $school = School::query()->first() ?? new School;
        $html = app(BulletinRenderer::class)->render($card, $school);

        $filename = Str::slug('bulletin-'.$studentModel->lastname.'-'.($card->payload['period']['name'] ?? '')).'.pdf';

        return Pdf::loadHTML($html)->setPaper('a4', 'portrait')->download($filename);
    }
}
