<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\FacultyController;
use App\Http\Controllers\Api\AdmissionController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\GradeController;
use App\Http\Controllers\Api\FeeController;
use App\Http\Controllers\Api\TimetableController;
use App\Http\Controllers\Api\QuizController;
use App\Http\Controllers\Api\QuestionController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\FeedbackController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VerifyController;
use App\Http\Controllers\Api\AlumniController;
use App\Http\Controllers\Api\EnrollmentController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\ImportController;

// Public Endpoints
Route::get('/verify/{userId}', [VerifyController::class, 'verify']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

// Authenticated API Surface (Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    // Current User Profile & Logout
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::patch('/me', [AuthController::class, 'updateProfile']);

    // Role-specific Dashboards
    Route::prefix('dashboard')->group(function () {
        Route::get('/admin', [DashboardController::class, 'admin'])->middleware('role:ADMIN');
        Route::get('/faculty', [DashboardController::class, 'faculty'])->middleware('role:FACULTY');
        Route::get('/student', [DashboardController::class, 'student'])->middleware('role:STUDENT');
    });

    // Courses
    Route::get('/courses', [CourseController::class, 'index']);
    Route::post('/courses/import', [ImportController::class, 'importCourses'])->middleware('role:ADMIN');
    Route::get('/courses/{id}', [CourseController::class, 'show']);
    Route::post('/courses', [CourseController::class, 'store'])->middleware('role:ADMIN');
    Route::patch('/courses/{id}', [CourseController::class, 'update'])->middleware('role:ADMIN,FACULTY');
    Route::put('/courses/{id}', [CourseController::class, 'update'])->middleware('role:ADMIN,FACULTY');
    Route::delete('/courses/{id}', [CourseController::class, 'destroy'])->middleware('role:ADMIN');

    // Students
    Route::get('/students', [StudentController::class, 'index'])->middleware('role:ADMIN,FACULTY');
    Route::get('/students/left', [StudentController::class, 'left'])->middleware('role:ADMIN,FACULTY');
    Route::post('/students/left', [StudentController::class, 'updateLeft'])->middleware('role:ADMIN');
    Route::post('/students/promote', [StudentController::class, 'promote'])->middleware('role:ADMIN');
    Route::get('/students/{id}', [StudentController::class, 'show']);
    Route::patch('/students/{id}', [StudentController::class, 'update'])->middleware('role:ADMIN');
    Route::put('/students/{id}', [StudentController::class, 'update'])->middleware('role:ADMIN');
    Route::delete('/students/{id}', [StudentController::class, 'destroy'])->middleware('role:ADMIN');

    // Alumni
    Route::get('/alumni', [AlumniController::class, 'index']);

    // Enrollments
    Route::patch('/enrollments/{id}', [EnrollmentController::class, 'update']);

    // Onboarding
    Route::get('/onboarding', [OnboardingController::class, 'index'])->middleware('role:ADMIN');
    Route::post('/onboarding', [OnboardingController::class, 'store']);
    Route::get('/onboarding/status', [OnboardingController::class, 'status']);
    Route::post('/onboarding/approve', [OnboardingController::class, 'approve'])->middleware('role:ADMIN');

    // Faculty
    Route::get('/faculty', [FacultyController::class, 'index']);
    Route::get('/faculty/attendance', [FacultyController::class, 'attendance']);
    Route::get('/faculty/{id}', [FacultyController::class, 'show']);
    Route::post('/faculty', [FacultyController::class, 'store'])->middleware('role:ADMIN');
    Route::patch('/faculty/{id}', [FacultyController::class, 'update'])->middleware('role:ADMIN');
    Route::delete('/faculty/{id}', [FacultyController::class, 'destroy'])->middleware('role:ADMIN');

    // Admissions
    Route::get('/admissions', [AdmissionController::class, 'index']);
    Route::get('/admissions/my-status', [AdmissionController::class, 'myStatus']);
    Route::post('/admissions/import', [ImportController::class, 'importAdmissions'])->middleware('role:ADMIN');
    Route::get('/admissions/{id}', [AdmissionController::class, 'show']);
    Route::post('/admissions', [AdmissionController::class, 'store']);
    Route::patch('/admissions/{id}', [AdmissionController::class, 'update'])->middleware('role:ADMIN');
    Route::delete('/admissions/{id}', [AdmissionController::class, 'destroy'])->middleware('role:ADMIN');

    // Attendance
    Route::get('/attendance', [AttendanceController::class, 'index']);
    Route::post('/attendance', [AttendanceController::class, 'store'])->middleware('role:ADMIN,FACULTY');
    Route::patch('/attendance/{id}', [AttendanceController::class, 'update'])->middleware('role:ADMIN,FACULTY');
    Route::delete('/attendance/{id}', [AttendanceController::class, 'destroy'])->middleware('role:ADMIN');

    // Grades
    Route::get('/grades', [GradeController::class, 'index']);
    Route::post('/grades', [GradeController::class, 'store'])->middleware('role:ADMIN,FACULTY');
    Route::patch('/grades/{id}', [GradeController::class, 'update'])->middleware('role:ADMIN,FACULTY');
    Route::delete('/grades/{id}', [GradeController::class, 'destroy'])->middleware('role:ADMIN');

    // Fees
    Route::get('/fees', [FeeController::class, 'index']);
    Route::post('/fees', [FeeController::class, 'store'])->middleware('role:ADMIN');
    Route::post('/fees/mark-overdue', [FeeController::class, 'markOverdue'])->middleware('role:ADMIN');
    Route::patch('/fees/{id}', [FeeController::class, 'update'])->middleware('role:ADMIN');
    Route::delete('/fees/{id}', [FeeController::class, 'destroy'])->middleware('role:ADMIN');

    // Timetable
    Route::get('/timetable', [TimetableController::class, 'index']);
    Route::get('/timetable/settings', [TimetableController::class, 'getSettings']);
    Route::post('/timetable/settings', [TimetableController::class, 'saveSettings'])->middleware('role:ADMIN');
    Route::post('/timetable', [TimetableController::class, 'store'])->middleware('role:ADMIN');
    Route::patch('/timetable/{id}', [TimetableController::class, 'update'])->middleware('role:ADMIN');
    Route::delete('/timetable/{id}', [TimetableController::class, 'destroy'])->middleware('role:ADMIN');

    // Quizzes & Questions
    Route::get('/quizzes', [QuizController::class, 'index']);
    Route::get('/quizzes/my-attempts', [QuizController::class, 'myAttempts']);
    Route::get('/quizzes/{id}', [QuizController::class, 'show']);
    Route::post('/quizzes', [QuizController::class, 'store'])->middleware('role:ADMIN,FACULTY');
    Route::patch('/quizzes/{id}', [QuizController::class, 'update'])->middleware('role:ADMIN,FACULTY');
    Route::delete('/quizzes/{id}', [QuizController::class, 'destroy'])->middleware('role:ADMIN,FACULTY');
    Route::post('/quizzes/{id}/submit', [QuizController::class, 'submit']);

    Route::get('/questions', [QuestionController::class, 'index']);
    Route::post('/questions', [QuestionController::class, 'store'])->middleware('role:ADMIN,FACULTY');
    Route::patch('/questions/{id}', [QuestionController::class, 'update'])->middleware('role:ADMIN,FACULTY');
    Route::delete('/questions/{id}', [QuestionController::class, 'destroy'])->middleware('role:ADMIN,FACULTY');

    // Announcements
    Route::get('/announcements', [AnnouncementController::class, 'index']);
    Route::post('/announcements', [AnnouncementController::class, 'store'])->middleware('role:ADMIN');
    Route::patch('/announcements/{id}', [AnnouncementController::class, 'update'])->middleware('role:ADMIN');
    Route::delete('/announcements/{id}', [AnnouncementController::class, 'destroy'])->middleware('role:ADMIN');

    // Feedback
    Route::get('/feedback', [FeedbackController::class, 'index']);
    Route::post('/feedback', [FeedbackController::class, 'store']);
    Route::delete('/feedback/{id}', [FeedbackController::class, 'destroy'])->middleware('role:ADMIN');

    // Audit Logs
    Route::get('/audit-log', [AuditLogController::class, 'index'])->middleware('role:ADMIN');
    Route::get('/audit-logs', [AuditLogController::class, 'index'])->middleware('role:ADMIN');
    Route::post('/audit-logs/cleanup', [AuditLogController::class, 'cleanup'])->middleware('role:ADMIN');

    // Users
    Route::get('/users', [UserController::class, 'index'])->middleware('role:ADMIN');
    Route::get('/users/{id}', [UserController::class, 'show'])->middleware('role:ADMIN');
    Route::patch('/users/{id}', [UserController::class, 'update'])->middleware('role:ADMIN');
    Route::delete('/users/{id}', [UserController::class, 'destroy'])->middleware('role:ADMIN');
});
