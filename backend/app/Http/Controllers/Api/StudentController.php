<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\User;
use App\Services\AuditLogService;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user || !in_array($user->role, ['ADMIN', 'FACULTY'])) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $query = Student::query()->with([
            'user:id,name,email',
            'enrollments:id,studentId,courseId,blocked,readmitRequested',
        ])->withCount('enrollments');

        if (!$request->boolean('includeGraduated')) {
            $query->where('status', '!=', 'Graduated');
        }

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

        if ($request->has('part')) {
            $query->where('part', (int) $request->query('part'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('rollNo', 'ilike', "%{$search}%")
                  ->orWhere('department', 'ilike', "%{$search}%")
                  ->orWhere('discipline', 'ilike', "%{$search}%")
                  ->orWhere('phone', 'ilike', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'ilike', "%{$search}%")
                         ->orWhere('email', 'ilike', "%{$search}%");
                  });
            });
        }

        if ($courseId = $request->query('courseId')) {
            $query->whereHas('enrollments', function ($q) use ($courseId) {
                $q->where('courseId', $courseId);
            });
        }

        $students = $query->orderBy('rollNo', 'asc')->get();

        $result = $students->map(function ($s) {
            return [
                'id' => $s->id,
                'userId' => $s->userId,
                'rollNo' => $s->rollNo,
                'phone' => $s->phone,
                'programLevel' => $s->programLevel,
                'department' => $s->department,
                'semester' => $s->semester,
                'discipline' => $s->discipline,
                'part' => $s->part,
                'subjectSet' => $s->subjectSet,
                'shift' => $s->shift,
                'blocked' => (bool) $s->blocked,
                'readmitRequested' => (bool) $s->readmitRequested,
                'status' => $s->status,
                'cgpa' => (float) $s->cgpa,
                'obtainedMarks' => $s->obtainedMarks,
                'totalMarks' => $s->totalMarks,
                'percentage' => $s->percentage,
                'grade' => $s->grade,
                'enrollmentDate' => $s->enrollmentDate ? $s->enrollmentDate->toIso8601String() : null,
                'user' => $s->user ? [
                    'name' => $s->user->name,
                    'email' => $s->user->email,
                ] : null,
                'enrollments' => $s->enrollments,
                'enrollmentsCount' => $s->enrollments_count ?? count($s->enrollments),
            ];
        });

        return response()->json($result);
    }

    public function show(string $id)
    {
        $student = Student::with([
            'user',
            'enrollments.course.faculty.user',
            'grades.course',
            'attendances.course',
            'fees',
        ])->find($id);

        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        return response()->json($student);
    }

    public function update(Request $request, string $id)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();
        $student = Student::with('user')->find($id);

        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $validated = $request->validate([
            'rollNo' => 'sometimes|string',
            'department' => 'sometimes|string',
            'semester' => 'sometimes|integer',
            'programLevel' => 'sometimes|string|in:BS,INTERMEDIATE',
            'discipline' => 'nullable|string',
            'part' => 'nullable|integer',
            'subjectSet' => 'nullable|string',
            'shift' => 'sometimes|string',
            'phone' => 'nullable|string',
            'status' => 'sometimes|string',
            'blocked' => 'sometimes|boolean',
            'readmitRequested' => 'sometimes|boolean',
            'cgpa' => 'sometimes|numeric',
        ]);

        $student->update($validated);

        AuditLogService::log(
            'UPDATED',
            'Student',
            $student->id,
            "Updated student profile {$student->rollNo}",
            $admin->clerkId ?? null,
            $admin->name ?? null,
            $student->programLevel ?? 'BS'
        );

        return response()->json($student);
    }

    public function destroy(Request $request, string $id)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();
        $student = Student::find($id);

        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $rollNo = $student->rollNo;
        $level = $student->programLevel ?? 'BS';

        $student->delete();

        AuditLogService::log(
            'DELETED',
            'Student',
            $id,
            "Deleted student {$rollNo}",
            $admin->clerkId ?? null,
            $admin->name ?? null,
            $level
        );

        return response()->json(['message' => 'Student deleted successfully']);
    }

    public function left(Request $request)
    {
        $query = Student::whereIn('status', ['Left', 'Dropped Out', 'Struck Off'])
            ->with('user:id,name,email,avatar');

        if ($dept = $request->query('department')) {
            if ($dept !== 'all') {
                $query->where('department', $dept);
            }
        }

        $programLevel = $request->query('programLevel', 'BS');
        $query->where('programLevel', $programLevel === 'INTERMEDIATE' ? 'INTERMEDIATE' : 'BS');

        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('rollNo', 'ilike', "%{$search}%")
                  ->orWhere('department', 'ilike', "%{$search}%")
                  ->orWhereHas('user', fn($uq) => $uq->where('name', 'ilike', "%{$search}%")->orWhere('email', 'ilike', "%{$search}%"));
            });
        }

        $leftStudents = $query->orderBy('leftDate', 'desc')->get();

        $formatted = $leftStudents->map(function ($s) {
            return [
                'id' => $s->id,
                'rollNo' => $s->rollNo,
                'name' => $s->user ? $s->user->name : null,
                'email' => $s->user ? $s->user->email : null,
                'department' => $s->department,
                'discipline' => $s->discipline,
                'programLevel' => $s->programLevel,
                'semester' => $s->semester,
                'part' => $s->part,
                'shift' => $s->shift,
                'cgpa' => $s->cgpa,
                'status' => $s->status,
                'leftReason' => $s->leftReason ?: 'Journey left midway',
                'leftDate' => $s->leftDate ? $s->leftDate->toIso8601String() : ($s->enrollmentDate ? $s->enrollmentDate->toIso8601String() : null),
                'readmitRequested' => (bool) $s->readmitRequested,
            ];
        });

        return response()->json($formatted);
    }

    public function updateLeft(Request $request)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();
        $validated = $request->validate([
            'studentId' => 'required|string',
            'action' => 'required|string|in:mark_left,readmit',
            'reason' => 'nullable|string',
        ]);

        $student = Student::with('user')->find($validated['studentId']);
        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        if ($validated['action'] === 'mark_left') {
            $student->update([
                'status' => 'Left',
                'leftReason' => $validated['reason'] ?: 'Left studies midway',
                'leftDate' => now(),
            ]);

            AuditLogService::log(
                'UPDATED',
                'Student',
                $student->id,
                "Marked student {$student->rollNo} as Left/Dropped Out. Reason: " . ($validated['reason'] ?: 'N/A'),
                $admin->clerkId ?? null,
                $admin->name ?? null,
                $student->programLevel ?? 'BS'
            );
        } elseif ($validated['action'] === 'readmit') {
            $student->update([
                'status' => 'Active',
                'leftReason' => null,
                'leftDate' => null,
                'readmitRequested' => false,
            ]);

            AuditLogService::log(
                'UPDATED',
                'Student',
                $student->id,
                "Re-admitted student {$student->rollNo} back to active roster",
                $admin->clerkId ?? null,
                $admin->name ?? null,
                $student->programLevel ?? 'BS'
            );
        }

        return response()->json($student);
    }

    public function promote(Request $request)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();

        $validated = $request->validate([
            'studentIds' => 'nullable|array',
            'department' => 'nullable|string',
            'semester' => 'nullable|integer',
            'targetSemester' => 'required|integer|min:1|max:10',
            'gradesheetUrl' => 'nullable|string',
            'totalMarks' => 'nullable|numeric',
            'obtainedMarks' => 'nullable|numeric',
            'percentage' => 'nullable|numeric',
            'grade' => 'nullable|string',
            'dropOffReason' => 'nullable|string',
        ]);

        $targetSemester = (int) $validated['targetSemester'];
        $isGraduating = $targetSemester === 9;
        $isDroppingOff = $targetSemester === 10;

        $studentIds = $validated['studentIds'] ?? [];
        if (empty($studentIds) && !empty($validated['department']) && !empty($validated['semester'])) {
            $studentIds = Student::where('department', $validated['department'])
                ->where('semester', $validated['semester'])
                ->where('status', 'Active')
                ->pluck('id')
                ->toArray();
        }

        if (empty($studentIds)) {
            return response()->json(['error' => 'No matching students found to promote'], 400);
        }

        $students = Student::whereIn('id', $studentIds)->get();

        foreach ($students as $student) {
            if ($isGraduating) {
                $student->update([
                    'status' => 'Graduated',
                    'graduationDate' => now(),
                    'gradesheetUrl' => $validated['gradesheetUrl'] ?? null,
                    'totalMarks' => $validated['totalMarks'] ?? null,
                    'obtainedMarks' => $validated['obtainedMarks'] ?? null,
                    'percentage' => $validated['percentage'] ?? null,
                    'grade' => $validated['grade'] ?? null,
                ]);
            } elseif ($isDroppingOff) {
                $student->update([
                    'status' => 'Left',
                    'leftReason' => $validated['dropOffReason'] ?: 'Dropped off during promotion',
                    'leftDate' => now(),
                ]);
            } else {
                $student->update([
                    'semester' => $targetSemester,
                    'part' => $targetSemester > 1 ? 2 : 1,
                ]);
            }
        }

        AuditLogService::log(
            'UPDATED',
            'Student',
            'bulk_promotion',
            "Promoted " . count($students) . " students to " . ($isGraduating ? 'Graduated' : ($isDroppingOff ? 'Dropped' : "Semester {$targetSemester}")),
            $admin->clerkId ?? null,
            $admin->name ?? null
        );

        return response()->json([
            'message' => 'Promotion completed successfully',
            'promotedCount' => count($students),
        ]);
    }
}
