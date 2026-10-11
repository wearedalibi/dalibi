<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\CalendarEventResource;
use App\Models\AcademicYear;
use App\Models\CalendarEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $year = AcademicYear::where('active', true)->first(['id', 'year']);

        $events = CalendarEvent::query()
            ->when($year, fn ($q) => $q->where('academic_year_id', $year->id))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->orderBy('start_date')->orderBy('start_time')
            ->get();

        return CalendarEventResource::collection($events)->response();
    }
}
