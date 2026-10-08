<?php

namespace App\Http\Controllers;

use App\Http\Requests\CalendarEventRequest;
use App\Models\AcademicYear;
use App\Models\CalendarEvent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CalendarEventController extends Controller
{
    public function index(Request $request): Response
    {
        $activeYear = AcademicYear::where('active', true)->first(['id', 'year']);
        $yearId = $request->string('academic_year_id')->toString() ?: $activeYear?->id;
        $type = (string) $request->query('type', '');

        $events = CalendarEvent::query()
            ->when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))
            ->when($type !== '', fn ($q) => $q->where('type', $type))
            ->orderBy('start_date')->orderBy('start_time')
            ->get()
            ->map(fn (CalendarEvent $e) => [
                'id' => $e->id,
                'title' => $e->title,
                'description' => $e->description,
                'type' => $e->type,
                'start_date' => $e->start_date?->format('Y-m-d'),
                'end_date' => $e->end_date?->format('Y-m-d'),
                'all_day' => $e->all_day,
                'start_time' => $e->start_time,
                'end_time' => $e->end_time,
                'color' => $e->color,
            ]);

        return Inertia::render('Calendar/Index', [
            'events' => $events,
            'types' => CalendarEvent::TYPES,
            'academicYears' => AcademicYear::orderByDesc('start_date')->get(['id', 'year']),
            'activeYear' => $activeYear,
            'filters' => ['academic_year_id' => $yearId, 'type' => $type],
        ]);
    }

    public function store(CalendarEventRequest $request): RedirectResponse
    {
        CalendarEvent::create($this->payload($request));

        return back()->with('message', 'Événement ajouté au calendrier.');
    }

    public function update(CalendarEventRequest $request, CalendarEvent $calendarEvent): RedirectResponse
    {
        $calendarEvent->update($this->payload($request));

        return back()->with('message', 'Événement mis à jour.');
    }

    public function destroy(CalendarEvent $calendarEvent): RedirectResponse
    {
        $calendarEvent->delete();

        return back()->with('message', 'Événement supprimé.');
    }

    private function payload(CalendarEventRequest $request): array
    {
        $data = $request->validated();
        $data['all_day'] = (bool) ($data['all_day'] ?? true);

        if ($data['all_day']) {
            $data['start_time'] = null;
            $data['end_time'] = null;
        }

        $data['academic_year_id'] ??= AcademicYear::where('active', true)->value('id');
        $data['created_by'] = $request->user()->id;

        return $data;
    }
}
