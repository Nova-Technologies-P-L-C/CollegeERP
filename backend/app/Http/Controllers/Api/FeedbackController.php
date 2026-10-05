<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Feedback;
use App\Models\Student;

class FeedbackController extends Controller
{
    public function index(Request $request)
    {
        $query = Feedback::with('student.user:id,name,email');

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($targetId = $request->query('targetId')) {
            $query->where('targetId', $targetId);
        }

        $feedbacks = $query->orderBy('date', 'desc')->get();

        return response()->json($feedbacks);
    }

    public function store(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user || !$user->student) {
            return response()->json(['error' => 'Only enrolled students can submit feedback'], 403);
        }

        $validated = $request->validate([
            'type' => 'required|string|in:Faculty,Course',
            'targetId' => 'required|string',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|max:1000',
        ]);

        $feedback = Feedback::updateOrCreate(
            [
                'studentId' => $user->student->id,
                'targetId' => $validated['targetId'],
                'type' => $validated['type'],
            ],
            [
                'rating' => $validated['rating'],
                'comment' => $validated['comment'],
                'date' => now(),
            ]
        );

        return response()->json($feedback, 201);
    }

    public function destroy(string $id)
    {
        $feedback = Feedback::find($id);
        if (!$feedback) {
            return response()->json(['error' => 'Feedback not found'], 404);
        }

        $feedback->delete();
        return response()->json(['message' => 'Feedback deleted successfully']);
    }
}
