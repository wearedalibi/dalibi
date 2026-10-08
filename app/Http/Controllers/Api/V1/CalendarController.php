<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
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
            ->get()
            ->map(fn (CalendarEvent $e) => [
                'id' => $e->id,
                'title' => $e->title,
                'type' => $e->type,
                'start_date' => $e->start_date?->format('Y-m-d'),
                'end_date' => $e->end_date?->format('Y-m-d'),
                'all_day' => $e->all_day,
                'start_time' => $e->start_time,
                'end_time' => $e->end_time,
            ]);

        return response()->json(['data' => $events]);
    }
}
