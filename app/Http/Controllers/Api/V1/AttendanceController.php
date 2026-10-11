<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Models\AttendanceRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends ApiController
{
    public function index(Request $request, string $student): JsonResponse
    {
        $studentModel = $this->resolveStudent($request, $student);
        $periodId = $request->string('period')->toString();

        $records = AttendanceRecord::where('student_id', $studentModel->id)
            ->whereHas('attendance', fn ($q) => $q->when($periodId !== '', fn ($q) => $q->where('academic_period_id', $periodId)))
            ->get(['status']);

        $counts = $records->countBy('status');

        return response()->json([
            'present' => (int) ($counts['present'] ?? 0),
            'absent' => (int) ($counts['absent'] ?? 0),
            'late' => (int) ($counts['late'] ?? 0),
            'excused' => (int) ($counts['excused'] ?? 0),
            'total' => $records->count(),
        ]);
    }
}
