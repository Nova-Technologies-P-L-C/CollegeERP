<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Grade;
use App\Models\Course;
use App\Models\Student;
use App\Services\AuditLogService;

class GradeController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $query = Grade::with([
            'student:id,rollNo,userId',
            'student.user:id,name',
            'course:id,courseCode,courseName,semester',
        ]);

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

        $grades = $query->get();

        return response()->json($grades);
    }

    public function store(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user || !in_array($user->role, ['ADMIN', 'FACULTY'])) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'studentId' => 'required|string',
            'courseId' => 'required|string',
            'quizMarks' => 'required|numeric|min:0',
            'assignmentMarks' => 'required|numeric|min:0',
            'midMarks' => 'required|numeric|min:0',
            'finalMarks' => 'required|numeric|min:0',
            'cgpa' => 'nullable|numeric|min:0|max:4',
        ]);

        $existing = Grade::where('studentId', $validated['studentId'])
            ->where('courseId', $validated['courseId'])
            ->first();

        if ($existing && $existing->locked) {
            return response()->json(['error' => 'Grade is locked and cannot be modified'], 403);
        }

        $total = $validated['quizMarks'] + $validated['assignmentMarks'] + $validated['midMarks'] + $validated['finalMarks'];
        $MAX_MARKS = 40;
        $gpa = round(min(4.0, ($total / $MAX_MARKS) * 4.0), 2);

        $gradeData = [
            'studentId' => $validated['studentId'],
            'courseId' => $validated['courseId'],
            'quizMarks' => $validated['quizMarks'],
            'assignmentMarks' => $validated['assignmentMarks'],
            'midMarks' => $validated['midMarks'],
            'finalMarks' => $validated['finalMarks'],
            'total' => $total,
            'gpa' => $gpa,
        ];

        if (!empty($validated['cgpa'])) {
            Student::where('id', $validated['studentId'])->update(['cgpa' => $validated['cgpa']]);
        }

        if ($existing) {
            $existing->update($gradeData);
            $grade = $existing;
        } else {
            $grade = Grade::create($gradeData);
        }

        return response()->json($grade, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        $grade = Grade::with(['student.user', 'course'])->find($id);

        if (!$grade) {
            return response()->json(['error' => 'Grade not found'], 404);
        }

        $validated = $request->validate([
            'locked' => 'nullable|boolean',
            'quizMarks' => 'nullable|numeric|min:0',
            'assignmentMarks' => 'nullable|numeric|min:0',
            'midMarks' => 'nullable|numeric|min:0',
            'finalMarks' => 'nullable|numeric|min:0',
        ]);

        // Lock toggle (only admin or assigned faculty)
        if (array_key_exists('locked', $validated)) {
            $grade->locked = $validated['locked'];
            $grade->save();

            AuditLogService::log(
                'UPDATED',
                'Grade',
                $grade->id,
                ($grade->locked ? "Locked" : "Unlocked") . " grade for {$grade->student->rollNo} in {$grade->course->courseCode}",
                $user->clerkId ?? null,
                $user->name ?? null
            );

            return response()->json($grade);
        }

        if ($grade->locked) {
            return response()->json(['error' => 'Grade is locked and cannot be edited'], 403);
        }

        $quizMarks = $validated['quizMarks'] ?? $grade->quizMarks;
        $assignmentMarks = $validated['assignmentMarks'] ?? $grade->assignmentMarks;
        $midMarks = $validated['midMarks'] ?? $grade->midMarks;
        $finalMarks = $validated['finalMarks'] ?? $grade->finalMarks;

        $total = $quizMarks + $assignmentMarks + $midMarks + $finalMarks;
        $MAX_MARKS = 40;
        $gpa = round(min(4.0, ($total / $MAX_MARKS) * 4.0), 2);

        $grade->update([
            'quizMarks' => $quizMarks,
            'assignmentMarks' => $assignmentMarks,
            'midMarks' => $midMarks,
            'finalMarks' => $finalMarks,
            'total' => $total,
            'gpa' => $gpa,
        ]);

        return response()->json($grade);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        $grade = Grade::find($id);

        if (!$grade) {
            return response()->json(['error' => 'Grade not found'], 404);
        }

        $grade->delete();

        return response()->json(['message' => 'Grade deleted successfully']);
    }
}
