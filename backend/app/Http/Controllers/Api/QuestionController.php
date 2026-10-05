<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Question;

class QuestionController extends Controller
{
    public function index(Request $request)
    {
        $query = Question::with('course:id,courseCode,courseName');

        if ($courseId = $request->query('courseId')) {
            $query->where('courseId', $courseId);
        }

        if ($quizId = $request->query('quizId')) {
            $query->where('quizId', $quizId);
        }

        $questions = $query->orderBy('createdAt', 'desc')->get();

        return response()->json($questions);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'courseId' => 'required|string',
            'text' => 'required|string',
            'type' => 'nullable|string|default:MCQ',
            'options' => 'required|array',
            'correctOption' => 'nullable|integer',
            'sampleAnswer' => 'nullable|string',
            'marks' => 'nullable|integer|default:1',
            'quizId' => 'nullable|string',
        ]);

        $question = Question::create($validated);

        return response()->json($question, 201);
    }

    public function update(Request $request, string $id)
    {
        $question = Question::find($id);
        if (!$question) {
            return response()->json(['error' => 'Question not found'], 404);
        }

        $validated = $request->validate([
            'text' => 'sometimes|string',
            'type' => 'sometimes|string',
            'options' => 'sometimes|array',
            'correctOption' => 'nullable|integer',
            'sampleAnswer' => 'nullable|string',
            'marks' => 'sometimes|integer',
            'quizId' => 'nullable|string',
        ]);

        $question->update($validated);

        return response()->json($question);
    }

    public function destroy(string $id)
    {
        $question = Question::find($id);
        if (!$question) {
            return response()->json(['error' => 'Question not found'], 404);
        }

        $question->delete();

        return response()->json(['message' => 'Question deleted successfully']);
    }
}
