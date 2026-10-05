<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Timetable;
use App\Models\TimetableSettings;
use App\Models\Course;
use App\Services\AuditLogService;

class TimetableController extends Controller
{
    private function hasOverlap(string $startA, string $endA, string $startB, string $endB): bool
    {
        return ($startA < $endB) && ($endA > $startB);
    }

    public function index(Request $request)
    {
        $query = Timetable::with([
            'course:id,courseCode,courseName,department,semester,programLevel,discipline,assignedFaculty,assignedFacultyMorning,assignedFacultyEvening',
            'course.faculty.user:id,name',
            'course.facultyMorning.user:id,name',
            'course.facultyEvening.user:id,name',
        ]);

        if ($request->has('day')) {
            $query->where('day', $request->query('day'));
        }

        if ($request->has('shift')) {
            $query->where('shift', $request->query('shift'));
        }

        if ($request->has('courseId')) {
            $query->where('courseId', $request->query('courseId'));
        }

        if ($dept = $request->query('department')) {
            $query->whereHas('course', fn($q) => $q->where('department', $dept));
        }

        if ($sem = $request->query('semester')) {
            $query->whereHas('course', fn($q) => $q->where('semester', (int) $sem));
        }

        if ($level = $request->query('programLevel')) {
            $query->whereHas('course', fn($q) => $q->where('programLevel', $level));
        }

        $entries = $query->orderBy('day')->orderBy('startTime')->get();

        return response()->json($entries);
    }

    public function store(Request $request)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();

        $validated = $request->validate([
            'courseId' => 'required|string',
            'room' => 'required|string',
            'day' => 'required|string',
            'startTime' => 'required|string|regex:/^([01]\d|2[0-3]):([0-5]\d)$/',
            'endTime' => 'required|string|regex:/^([01]\d|2[0-3]):([0-5]\d)$/',
            'shift' => 'nullable|string|default:Morning',
        ]);

        $course = Course::find($validated['courseId']);
        if (!$course) {
            return response()->json(['error' => 'Course not found'], 404);
        }

        // 1. Room conflict check
        $roomEntries = Timetable::where('room', $validated['room'])
            ->where('day', $validated['day'])
            ->get();

        foreach ($roomEntries as $entry) {
            if ($this->hasOverlap($validated['startTime'], $validated['endTime'], $entry->startTime, $entry->endTime)) {
                return response()->json([
                    'error' => "Room conflict: {$validated['room']} is already booked from {$entry->startTime} to {$entry->endTime} on {$validated['day']}."
                ], 409);
            }
        }

        // 2. Faculty conflict check
        $facultyId = $validated['shift'] === 'Evening'
            ? ($course->assignedFacultyEvening ?: $course->assignedFaculty)
            : ($course->assignedFacultyMorning ?: $course->assignedFaculty);

        if ($facultyId) {
            $facultyEntries = Timetable::where('day', $validated['day'])
                ->whereHas('course', function ($q) use ($facultyId) {
                    $q->where('assignedFaculty', $facultyId)
                      ->orWhere('assignedFacultyMorning', $facultyId)
                      ->orWhere('assignedFacultyEvening', $facultyId);
                })
                ->get();

            foreach ($facultyEntries as $entry) {
                if ($this->hasOverlap($validated['startTime'], $validated['endTime'], $entry->startTime, $entry->endTime)) {
                    return response()->json([
                        'error' => "Teacher conflict: Assigned instructor has another lecture from {$entry->startTime} to {$entry->endTime} on {$validated['day']}."
                    ], 409);
                }
            }
        }

        $timetable = Timetable::create($validated);

        AuditLogService::log(
            'CREATED',
            'Timetable',
            $timetable->id,
            "Scheduled {$course->courseCode} in {$timetable->room} on {$timetable->day} ({$timetable->startTime}-{$timetable->endTime})",
            $admin->clerkId ?? null,
            $admin->name ?? null,
            $course->programLevel ?? 'BS'
        );

        return response()->json($timetable, 201);
    }

    public function update(Request $request, string $id)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();
        $timetable = Timetable::with('course')->find($id);

        if (!$timetable) {
            return response()->json(['error' => 'Timetable entry not found'], 404);
        }

        $validated = $request->validate([
            'room' => 'sometimes|string',
            'day' => 'sometimes|string',
            'startTime' => 'sometimes|string|regex:/^([01]\d|2[0-3]):([0-5]\d)$/',
            'endTime' => 'sometimes|string|regex:/^([01]\d|2[0-3]):([0-5]\d)$/',
            'shift' => 'sometimes|string',
        ]);

        $room = $validated['room'] ?? $timetable->room;
        $day = $validated['day'] ?? $timetable->day;
        $startTime = $validated['startTime'] ?? $timetable->startTime;
        $endTime = $validated['endTime'] ?? $timetable->endTime;

        // Check room conflict
        $conflicting = Timetable::where('room', $room)
            ->where('day', $day)
            ->where('id', '!=', $id)
            ->get();

        foreach ($conflicting as $entry) {
            if ($this->hasOverlap($startTime, $endTime, $entry->startTime, $entry->endTime)) {
                return response()->json([
                    'error' => "Room conflict: {$room} is already booked from {$entry->startTime} to {$entry->endTime} on {$day}."
                ], 409);
            }
        }

        $timetable->update($validated);

        return response()->json($timetable);
    }

    public function destroy(Request $request, string $id)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();
        $timetable = Timetable::with('course')->find($id);

        if (!$timetable) {
            return response()->json(['error' => 'Timetable entry not found'], 404);
        }

        $courseCode = $timetable->course ? $timetable->course->courseCode : '';
        $timetable->delete();

        AuditLogService::log(
            'DELETED',
            'Timetable',
            $id,
            "Deleted timetable entry for {$courseCode} on {$timetable->day}",
            $admin->clerkId ?? null,
            $admin->name ?? null
        );

        return response()->json(['message' => 'Timetable entry deleted successfully']);
    }

    public function getSettings(Request $request)
    {
        $shift = $request->query('shift', 'Morning');
        $settings = TimetableSettings::where('shift', $shift)->first();

        if (!$settings) {
            $settings = [
                'id' => '',
                'shift' => $shift,
                'startTime' => $shift === 'Morning' ? '07:45' : '12:00',
                'duration' => 45,
                'slots' => 7,
            ];
        }

        return response()->json($settings);
    }

    public function saveSettings(Request $request)
    {
        $validated = $request->validate([
            'shift' => 'required|string|in:Morning,Evening',
            'startTime' => 'required|string|regex:/^([01]\d|2[0-3]):([0-5]\d)$/',
            'duration' => 'required|integer|min:20|max:120',
            'slots' => 'required|integer|min:1|max:12',
        ]);

        $settings = TimetableSettings::updateOrCreate(
            ['shift' => $validated['shift']],
            $validated
        );

        return response()->json($settings);
    }
}
