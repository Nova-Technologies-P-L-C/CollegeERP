<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Attendance;
use App\Models\Course;
use App\Models\Student;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $query = Attendance::with(['student.user:id,name,email', 'course:id,courseCode,courseName']);

        if ($user->role === 'STUDENT') {
            if (!$user->student) {
                return response()->json(['error' => 'Student not found'], 403);
            }
            $query->where('studentId', $user->student->id);
        } elseif ($request->has('studentId')) {
            $query->where('studentId', $request->query('studentId'));
        }

        if ($courseId = $request->query('courseId')) {
            $query->where('courseId', $courseId);
        }

        if ($date = $request->query('date')) {
            $query->whereDate('date', Carbon::parse($date)->toDateString());
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $attendances = $query->orderBy('date', 'desc')->get();

        return response()->json($attendances);
    }

    public function store(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user || !in_array($user->role, ['ADMIN', 'FACULTY'])) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'courseId' => 'required|string',
            'date' => 'required|date',
            'records' => 'required|array|min:1',
            'records.*.studentId' => 'required|string',
            'records.*.status' => 'required|string|in:Present,Absent,Late',
        ]);

        $courseId = $validated['courseId'];
        $date = Carbon::parse($validated['date'])->startOfDay();

        $saved = [];
        foreach ($validated['records'] as $rec) {
            $attendance = Attendance::updateOrCreate(
                [
                    'studentId' => $rec['studentId'],
                    'courseId' => $courseId,
                    'date' => $date,
                ],
                [
                    'status' => $rec['status'],
                    'markedBy' => $user->name ?: ($user->email ?: 'FACULTY'),
                ]
            );
            $saved[] = $attendance;
        }

        return response()->json(['message' => 'Attendance recorded successfully', 'count' => count($saved)], 201);
    }

    public function update(Request $request, string $id)
    {
        $attendance = Attendance::find($id);
        if (!$attendance) {
            return response()->json(['error' => 'Attendance record not found'], 404);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:Present,Absent,Late',
        ]);

        $attendance->update($validated);

        return response()->json($attendance);
    }

    public function destroy(string $id)
    {
        $attendance = Attendance::find($id);
        if (!$attendance) {
            return response()->json(['error' => 'Attendance record not found'], 404);
        }

        $attendance->delete();
        return response()->json(['message' => 'Attendance deleted successfully']);
    }
}
