<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Quiz;
use App\Models\Question;
use App\Models\QuizAttempt;
use App\Models\Course;
use App\Services\AuditLogService;

class QuizController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $query = Quiz::with(['course:id,courseCode,courseName'])
            ->withCount('questions')
            ->withCount('attempts');

        if ($request->has('courseId')) {
            $query->where('courseId', $request->query('courseId'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($user->role === 'STUDENT' && $user->student) {
            $studentId = $user->student->id;
            $query->whereHas('course.enrollments', function ($q) use ($studentId) {
                $q->where('studentId', $studentId);
            });
        }

        $quizzes = $query->orderBy('dueDate', 'desc')->get();

        return response()->json($quizzes);
    }

    public function show(string $id)
    {
        $quiz = Quiz::with(['questions', 'course:id,courseCode,courseName'])->find($id);

        if (!$quiz) {
            return response()->json(['error' => 'Quiz not found'], 404);
        }

        return response()->json($quiz);
    }

    public function store(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();

        $validated = $request->validate([
            'title' => 'required|string',
            'courseId' => 'required|string',
            'duration' => 'required|integer',
            'totalMarks' => 'nullable|integer',
            'status' => 'nullable|string',
            'dueDate' => 'required|date',
            'questionIds' => 'nullable|array',
        ]);

        $validated['totalMarks'] = $validated['totalMarks'] ?? 10;
        $validated['status'] = $validated['status'] ?? 'Draft';

        $quiz = Quiz::create([
            'title' => $validated['title'],
            'courseId' => $validated['courseId'],
            'createdBy' => $user->clerkId ?: $user->id,
            'duration' => $validated['duration'],
            'totalMarks' => $validated['totalMarks'] ?? 10,
            'status' => $validated['status'] ?? 'Draft',
            'dueDate' => $validated['dueDate'],
        ]);

        if (!empty($validated['questionIds'])) {
            Question::whereIn('id', $validated['questionIds'])->update(['quizId' => $quiz->id]);
        }

        AuditLogService::log(
            'CREATED',
            'Quiz',
            $quiz->id,
            "Created quiz {$quiz->title}",
            $user->clerkId ?? null,
            $user->name ?? null
        );

        return response()->json($quiz, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        $quiz = Quiz::find($id);

        if (!$quiz) {
            return response()->json(['error' => 'Quiz not found'], 404);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string',
            'status' => 'sometimes|string',
            'duration' => 'sometimes|integer',
            'totalMarks' => 'sometimes|integer',
            'dueDate' => 'sometimes|date',
        ]);

        $quiz->update($validated);

        return response()->json($quiz);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        $quiz = Quiz::find($id);

        if (!$quiz) {
            return response()->json(['error' => 'Quiz not found'], 404);
        }

        $title = $quiz->title;
        $quiz->delete();

        AuditLogService::log(
            'DELETED',
            'Quiz',
            $id,
            "Deleted quiz {$title}",
            $user->clerkId ?? null,
            $user->name ?? null
        );

        return response()->json(['message' => 'Quiz deleted successfully']);
    }

    public function submit(Request $request, string $id)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $quiz = Quiz::with('questions', 'course')->find($id);
        if (!$quiz) {
            return response()->json(['error' => 'Quiz not found'], 404);
        }

        $targetStudentId = $user->student ? $user->student->id : $request->input('studentId');
        if (!$targetStudentId) {
            return response()->json(['error' => 'Student not specified'], 400);
        }

        $answers = $request->input('answers', []);
        $calculatedScore = 0;
        $answersArray = [];

        if (!empty($answers) && $quiz->questions->count() > 0) {
            $defaultMarksPerQ = $quiz->totalMarks / $quiz->questions->count();
            $answerMap = [];

            if (is_array($answers) && isset($answers[0]) && is_array($answers[0])) {
                foreach ($answers as $a) {
                    $answerMap[$a['questionId']] = $a['selectedOption'];
                    $answersArray[] = $a['selectedOption'];
                }
            } elseif (is_array($answers)) {
                $answerMap = $answers;
                $answersArray = array_values($answers);
            }

            foreach ($quiz->questions as $q) {
                if (isset($answerMap[$q->id]) && (int)$answerMap[$q->id] === (int)$q->correctOption) {
                    $calculatedScore += $q->marks ?: $defaultMarksPerQ;
                }
            }
        }

        $attempt = QuizAttempt::create([
            'quizId' => $quiz->id,
            'studentId' => $targetStudentId,
            'score' => (int) round($calculatedScore),
            'totalMarks' => $quiz->totalMarks,
            'answers' => $answersArray,
            'quizTitle' => $quiz->title,
            'courseCode' => $quiz->course ? $quiz->course->courseCode : null,
        ]);

        return response()->json($attempt, 201);
    }

    public function myAttempts(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user || !$user->student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $attempts = QuizAttempt::where('studentId', $user->student->id)
            ->with('quiz:id,title,totalMarks,duration,dueDate')
            ->orderBy('submittedAt', 'desc')
            ->get();

        return response()->json($attempts);
    }
}
