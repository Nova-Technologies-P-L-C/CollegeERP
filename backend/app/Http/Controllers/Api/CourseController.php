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
            $dept = $request->query('department');
            if ($dept !== 'all') {
                if ($request->query('programLevel') === 'INTERMEDIATE') {
                    $query->where(function ($q) use ($dept) {
                        $q->where('discipline', $dept)
                          ->orWhere('department', $dept);
                    });
                } else {
                    $query->where('department', $dept);
                }
            }
        }

        if ($request->has('semester')) {
            $sem = (int) $request->query('semester');
            if ($request->query('programLevel') === 'INTERMEDIATE') {
                $query->where(function ($q) use ($sem) {
                    $q->where('part', $sem)
                      ->orWhere('semester', $sem);
                });
            } else {
                $query->where('semester', $sem);
            }
        }

        if ($request->has('discipline')) {
            $disc = $request->query('discipline');
            $query->where(function ($q) use ($disc) {
                $q->where('discipline', $disc)
                  ->orWhere('department', $disc);
            });
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
            'creditHours' => 'nullable|integer|min:1',
            'totalMarks' => 'nullable|integer',
            'department' => 'required|string',
            'semester' => 'nullable|integer',
            'programLevel' => 'nullable|string|in:BS,INTERMEDIATE',
            'discipline' => 'nullable|string',
            'part' => 'nullable|integer',
            'subjectSet' => 'nullable|string',
            'assignedFaculty' => 'nullable|string',
            'assignedFacultyMorning' => 'nullable|string',
            'assignedFacultyEvening' => 'nullable|string',
            'shift' => 'nullable|string',
        ]);

        $validated['courseCode'] = strtoupper(trim($validated['courseCode']));
        $validated['courseName'] = trim($validated['courseName']);
        $validated['department'] = trim($validated['department']);
        $validated['creditHours'] = !empty($validated['creditHours']) ? (int) $validated['creditHours'] : 3;
        $validated['totalMarks'] = !empty($validated['totalMarks']) ? (int) $validated['totalMarks'] : 100;
        $validated['semester'] = $validated['semester'] ?? 1;
        $validated['shift'] = $validated['shift'] ?? 'Morning';

        if (($validated['programLevel'] ?? 'BS') === 'INTERMEDIATE') {
            if (empty($validated['discipline'])) {
                $validated['discipline'] = $validated['department'];
            }
            if (empty($validated['part'])) {
                $validated['part'] = $validated['semester'] ?? 1;
            }
        }

        // Duplicate guard for courseCode in the department/discipline
        $existing = Course::where('courseCode', $validated['courseCode'])
            ->where(function ($q) use ($validated) {
                $q->where('department', $validated['department']);
                if (!empty($validated['discipline'])) {
                    $q->orWhere('discipline', $validated['discipline']);
                }
            })
            ->first();

        if ($existing) {
            return response()->json([
                'error' => "Course code '{$validated['courseCode']}' already exists in {$validated['department']}."
            ], 422);
        }

        try {
            $course = Course::create($validated);
        } catch (\Illuminate\Database\QueryException $e) {
            if (str_contains($e->getMessage(), 'unique') || str_contains($e->getMessage(), '23505')) {
                return response()->json([
                    'error' => "Course code '{$validated['courseCode']}' already exists in {$validated['department']}."
                ], 422);
            }
            throw $e;
        }

        $course->load([
            'faculty.user:id,name',
            'facultyMorning.user:id,name',
            'facultyEvening.user:id,name',
        ])->loadCount('enrollments');

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
            'creditHours' => 'nullable|integer|min:1',
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

        if (isset($validated['courseCode'])) {
            $validated['courseCode'] = strtoupper(trim($validated['courseCode']));
        }
        if (isset($validated['courseName'])) {
            $validated['courseName'] = trim($validated['courseName']);
        }
        if (isset($validated['department'])) {
            $validated['department'] = trim($validated['department']);
        }

        if (($validated['programLevel'] ?? $course->programLevel) === 'INTERMEDIATE') {
            if (isset($validated['department']) && empty($validated['discipline'])) {
                $validated['discipline'] = $validated['department'];
            }
            if (isset($validated['semester']) && empty($validated['part'])) {
                $validated['part'] = $validated['semester'];
            }
        }

        try {
            $course->update($validated);
        } catch (\Illuminate\Database\QueryException $e) {
            if (str_contains($e->getMessage(), 'unique') || str_contains($e->getMessage(), '23505')) {
                return response()->json([
                    'error' => "Course code already exists in this department."
                ], 422);
            }
            throw $e;
        }

        $course->load([
            'faculty.user:id,name',
            'facultyMorning.user:id,name',
            'facultyEvening.user:id,name',
        ])->loadCount('enrollments');

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
