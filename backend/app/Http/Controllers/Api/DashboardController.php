<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Student;
use App\Models\Faculty;
use App\Models\Course;
use App\Models\Admission;
use App\Models\Fee;
use App\Models\Attendance;
use App\Models\Announcement;
use App\Models\AuditLog;
use App\Models\Feedback;
use App\Models\Grade;
use App\Models\Timetable;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function admin(Request $request)
    {
        $programLevel = $request->query('programLevel', 'BS') === 'INTERMEDIATE' ? 'INTERMEDIATE' : 'BS';

        $totalStudents = Student::where('status', '!=', 'Graduated')
            ->where('programLevel', $programLevel)
            ->count();

        $totalFaculty = Faculty::count();

        $activeCourses = Course::where('programLevel', $programLevel)->count();

        $pendingAdmissions = Admission::where('status', 'Pending')
            ->where('programLevel', $programLevel)
            ->count();

        // Fees
        $fees = Fee::whereHas('student', function ($q) use ($programLevel) {
            $q->where('programLevel', $programLevel);
        })
        ->select('status', DB::raw('SUM(amount) as total'))
        ->groupBy('status')
        ->get();

        $totalFeeCollected = (float) ($fees->firstWhere('status', 'Paid')->total ?? 0);
        $totalFeePending = (float) $fees->where('status', '!=', 'Paid')->sum('total');

        // Attendance
        $attendances = Attendance::whereHas('student', function ($q) use ($programLevel) {
            $q->where('programLevel', $programLevel);
        })
        ->select('status', DB::raw('COUNT(*) as count'))
        ->groupBy('status')
        ->get();

        $attendanceMap = [];
        $totalAttendance = 0;
        foreach ($attendances as $row) {
            $attendanceMap[$row->status] = (int) $row->count;
            $totalAttendance += (int) $row->count;
        }

        $presentCount = ($attendanceMap['Present'] ?? 0) + ($attendanceMap['Late'] ?? 0);
        $attendanceRate = $totalAttendance > 0 ? (int) round(($presentCount / $totalAttendance) * 100) : 0;

        $attendanceOverview = [
            ['name' => 'Present', 'value' => $attendanceMap['Present'] ?? 0],
            ['name' => 'Absent', 'value' => $attendanceMap['Absent'] ?? 0],
            ['name' => 'Late', 'value' => $attendanceMap['Late'] ?? 0],
        ];

        // Students per department
        $studentsByDept = Student::where('status', '!=', 'Graduated')
            ->where('programLevel', $programLevel)
            ->select('department', DB::raw('COUNT(*) as students'))
            ->groupBy('department')
            ->get();

        // Recent announcements
        $recentAnnouncements = Announcement::where('programLevel', $programLevel)
            ->orderBy('date', 'desc')
            ->limit(5)
            ->get(['id', 'title', 'priority', 'date']);

        // Recent audit logs
        $recentAuditLogs = AuditLog::where('programLevel', $programLevel)
            ->orderBy('createdAt', 'desc')
            ->limit(10)
            ->get(['id', 'action', 'entity', 'entityId', 'description', 'adminId', 'adminName', 'createdAt']);

        return response()->json([
            'stats' => [
                'totalStudents' => $totalStudents,
                'totalFaculty' => $totalFaculty,
                'activeCourses' => $activeCourses,
                'pendingAdmissions' => $pendingAdmissions,
                'totalFeeCollected' => $totalFeeCollected,
                'totalFeePending' => $totalFeePending,
                'attendanceRate' => $attendanceRate,
            ],
            'studentsPerDepartment' => $studentsByDept,
            'attendanceOverview' => $attendanceOverview,
            'recentAnnouncements' => $recentAnnouncements,
            'recentAuditLogs' => $recentAuditLogs,
        ]);
    }

    public function faculty(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user || !$user->faculty) {
            return response()->json(['error' => 'Faculty profile not found'], 404);
        }

        $faculty = $user->faculty;
        $programLevel = $request->query('programLevel', 'BS') === 'INTERMEDIATE' ? 'INTERMEDIATE' : 'BS';

        $courses = Course::where(function ($q) use ($faculty) {
            $q->where('assignedFaculty', $faculty->id)
              ->orWhere('assignedFacultyMorning', $faculty->id)
              ->orWhere('assignedFacultyEvening', $faculty->id);
        })
        ->where('programLevel', $programLevel)
        ->with(['enrollments', 'timetables'])
        ->withCount(['quizzes' => function ($q) {
            $q->where('status', 'Published');
        }])
        ->get();

        $courseIds = $courses->pluck('id')->toArray();

        $uniqueStudentIds = [];
        $courseData = [];
        $timetableData = [];

        foreach ($courses as $c) {
            $studentIds = $c->enrollments->pluck('studentId')->toArray();
            $uniqueStudentIds = array_unique(array_merge($uniqueStudentIds, $studentIds));

            $courseData[] = [
                'id' => $c->id,
                'courseCode' => $c->courseCode,
                'courseName' => $c->courseName,
                'enrolledCount' => count($studentIds),
            ];

            foreach ($c->timetables as $t) {
                $timetableData[] = [
                    'id' => $t->id,
                    'day' => $t->day,
                    'courseCode' => $c->courseCode,
                    'courseName' => $c->courseName,
                    'startTime' => $t->startTime,
                    'endTime' => $t->endTime,
                    'room' => $t->room,
                ];
            }
        }

        $avgRating = (float) (Feedback::where('targetId', $faculty->id)->where('type', 'Faculty')->avg('rating') ?? 0);
        $avgGpa = (float) (Grade::whereIn('courseId', $courseIds)->avg('gpa') ?? 0);

        // Attendance overview for courses taught
        $attendances = Attendance::whereIn('courseId', $courseIds)
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->get();

        $attendanceOverview = [
            ['name' => 'Present', 'value' => (int) ($attendances->firstWhere('status', 'Present')->count ?? 0)],
            ['name' => 'Absent', 'value' => (int) ($attendances->firstWhere('status', 'Absent')->count ?? 0)],
            ['name' => 'Late', 'value' => (int) ($attendances->firstWhere('status', 'Late')->count ?? 0)],
        ];

        $announcements = Announcement::where('programLevel', $programLevel)
            ->orderBy('date', 'desc')
            ->limit(5)
            ->get(['id', 'title', 'priority', 'date']);

        return response()->json([
            'stats' => [
                'totalCourses' => count($courses),
                'totalStudents' => count($uniqueStudentIds),
                'avgRating' => round($avgRating, 1),
                'pendingQuizReviews' => 0,
                'avgStudentGpa' => round($avgGpa, 2),
            ],
            'courses' => $courseData,
            'timetable' => $timetableData,
            'announcements' => $announcements,
            'attendanceOverview' => $attendanceOverview,
        ]);
    }

    public function student(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user || !$user->student) {
            return response()->json(['error' => 'Student profile not found'], 404);
        }

        $student = $user->student;
        $student->load(['enrollments.course.faculty', 'grades.course', 'attendances', 'fees', 'quizAttempts']);

        $grades = $student->grades;
        $totalGpa = $grades->count() > 0 ? (float) $grades->avg('gpa') : 0.0;

        $totalClasses = $student->attendances->count();
        $presentClasses = $student->attendances->whereIn('status', ['Present', 'Late'])->count();
        $attendanceRate = $totalClasses > 0 ? round(($presentClasses / $totalClasses) * 100) : 0;

        $courses = $student->enrollments->map(function ($e) {
            return [
                'id' => $e->course->id,
                'courseCode' => $e->course->courseCode,
                'courseName' => $e->course->courseName,
                'creditHours' => $e->course->creditHours,
                'faculty' => $e->course->faculty ? $e->course->faculty->user->name ?? null : null,
            ];
        });

        $courseIds = $courses->pluck('id')->toArray();
        $timetables = Timetable::whereIn('courseId', $courseIds)->with('course')->get();

        $announcements = Announcement::where('programLevel', $student->programLevel)
            ->orderBy('date', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'student' => $student,
            'gpa' => round($totalGpa, 2),
            'attendanceRate' => $attendanceRate,
            'courses' => $courses,
            'grades' => $grades,
            'timetable' => $timetables,
            'fees' => $student->fees,
            'announcements' => $announcements,
            'quizAttempts' => $student->quizAttempts,
        ]);
    }
}
