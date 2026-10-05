<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Course;
use App\Models\Faculty;
use App\Services\AuditLogService;

class CourseController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        $query = Course::query()->with([
            'faculty.user:id,name',
            'facultyMorning.user:id,name',
            'facultyEvening.user:id,name',
        ])->withCount('enrollments');

        if ($request->has('programLevel')) {
            $query->where('programLevel', $request->query('programLevel'));
        }

        if ($request->has('department')) {
            $query->where('department', $request->query('department'));
        }

        if ($request->has('semester')) {
            $query->where('semester', (int) $request->query('semester'));
        }

        if ($request->has('discipline')) {
            $query->where('discipline', $request->query('discipline'));
        }

        if ($request->has('shift')) {
            $query->where('shift', $request->query('shift'));
        }

        // If faculty, optionally filter to their assigned courses
        if ($user && $user->role === 'FACULTY' && $user->faculty) {
            $facultyId = $user->faculty->id;
            if ($request->boolean('assignedOnly')) {
                $query->where(function ($q) use ($facultyId) {
                    $q->where('assignedFaculty', $facultyId)
                      ->orWhere('assignedFacultyMorning', $facultyId)
                      ->orWhere('assignedFacultyEvening', $facultyId);
                });
            }
        }

        // If student, can filter to their department/semester
        if ($user && $user->role === 'STUDENT' && $user->student && $request->boolean('enrolledOnly')) {
            $studentId = $user->student->id;
            $query->whereHas('enrollments', function ($q) use ($studentId) {
                $q->where('studentId', $studentId);
            });
        }

        $courses = $query->orderBy('courseCode')->get();

        return response()->json($courses);
    }

    public function show(string $id)
    {
        $course = Course::with([
            'faculty.user:id,name',
            'facultyMorning.user:id,name',
            'facultyEvening.user:id,name',
            'timetables',
            'enrollments.student.user:id,name',
        ])->find($id);

        if (!$course) {
            return response()->json(['error' => 'Course not found'], 404);
        }

        return response()->json($course);
    }

    public function store(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();

        $validated = $request->validate([
            'courseCode' => 'required|string',
            'courseName' => 'required|string',
            'creditHours' => 'required|integer|min:1',
            'totalMarks' => 'nullable|integer',
            'department' => 'required|string',
            'semester' => 'nullable|integer|default:1',
            'programLevel' => 'nullable|string|in:BS,INTERMEDIATE',
            'discipline' => 'nullable|string',
            'part' => 'nullable|integer',
            'subjectSet' => 'nullable|string',
            'assignedFaculty' => 'nullable|string',
            'assignedFacultyMorning' => 'nullable|string',
            'assignedFacultyEvening' => 'nullable|string',
            'shift' => 'nullable|string|default:Morning',
        ]);

        $course = Course::create($validated);

        AuditLogService::log(
            'CREATED',
            'Course',
            $course->id,
            "Created course {$course->courseName} ({$course->courseCode})",
            $user->clerkId ?? null,
            $user->name ?? null,
            $course->programLevel ?? 'BS'
        );

        return response()->json($course, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        $course = Course::find($id);

        if (!$course) {
            return response()->json(['error' => 'Course not found'], 404);
        }

        $validated = $request->validate([
            'courseCode' => 'sometimes|string',
            'courseName' => 'sometimes|string',
            'creditHours' => 'sometimes|integer|min:1',
            'totalMarks' => 'nullable|integer',
            'department' => 'sometimes|string',
            'semester' => 'sometimes|integer',
            'programLevel' => 'sometimes|string|in:BS,INTERMEDIATE',
            'discipline' => 'nullable|string',
            'part' => 'nullable|integer',
            'subjectSet' => 'nullable|string',
            'assignedFaculty' => 'nullable|string',
            'assignedFacultyMorning' => 'nullable|string',
            'assignedFacultyEvening' => 'nullable|string',
            'shift' => 'sometimes|string',
        ]);

        $course->update($validated);

        AuditLogService::log(
            'UPDATED',
            'Course',
            $course->id,
            "Updated course {$course->courseName} ({$course->courseCode})",
            $user->clerkId ?? null,
            $user->name ?? null,
            $course->programLevel ?? 'BS'
        );

        return response()->json($course);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        $course = Course::find($id);

        if (!$course) {
            return response()->json(['error' => 'Course not found'], 404);
        }

        $courseCode = $course->courseCode;
        $courseName = $course->courseName;
        $level = $course->programLevel ?? 'BS';

        $course->delete();

        AuditLogService::log(
            'DELETED',
            'Course',
            $id,
            "Deleted course {$courseName} ({$courseCode})",
            $user->clerkId ?? null,
            $user->name ?? null,
            $level
        );

        return response()->json(['message' => 'Course deleted successfully']);
    }
}
