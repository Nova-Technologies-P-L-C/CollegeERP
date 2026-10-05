<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;

class VerifyController extends Controller
{
    public function verify(string $userId)
    {
        $user = User::with([
            'student.fees' => function ($q) {
                $q->whereIn('status', ['Unpaid', 'Overdue']);
            },
            'faculty',
            'admin',
        ])->find($userId);

        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $duesStatus = null;
        if ($user->student) {
            $hasUnpaid = $user->student->fees->isNotEmpty();
            $duesStatus = $hasUnpaid ? 'Outstanding' : 'Clear';
        }

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'role' => $user->role,
            'verified' => true,
            'institutionName' => 'Nova Technology College',
            'department' => $user->student ? $user->student->department : ($user->faculty ? $user->faculty->department : 'Administration'),
            'student' => $user->student ? [
                'rollNo' => $user->student->rollNo,
                'department' => $user->student->department,
                'semester' => $user->student->semester,
                'duesStatus' => $duesStatus,
                'enrollmentDate' => $user->student->enrollmentDate ? $user->student->enrollmentDate->toIso8601String() : null,
            ] : null,
            'faculty' => $user->faculty ? [
                'department' => $user->faculty->department,
                'specialization' => $user->faculty->specialization,
                'joinDate' => $user->faculty->joinDate ? $user->faculty->joinDate->toIso8601String() : null,
            ] : null,
        ]);
    }
}
