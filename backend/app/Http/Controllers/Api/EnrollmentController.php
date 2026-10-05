<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Enrollment;

class EnrollmentController extends Controller
{
    public function update(Request $request, string $id)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $enrollment = Enrollment::with(['course', 'student.user'])->find($id);
        if (!$enrollment) {
            return response()->json(['error' => 'Enrollment record not found'], 404);
        }

        $validated = $request->validate([
            'blocked' => 'nullable|boolean',
            'readmitRequested' => 'nullable|boolean',
        ]);

        if (array_key_exists('blocked', $validated)) {
            $enrollment->blocked = $validated['blocked'];
            if (!$validated['blocked']) {
                $enrollment->readmitRequested = false;
            }
        }

        if (array_key_exists('readmitRequested', $validated)) {
            $enrollment->readmitRequested = $validated['readmitRequested'];
        }

        $enrollment->save();

        return response()->json($enrollment);
    }
}
