<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Student;

class AlumniController extends Controller
{
    public function index(Request $request)
    {
        $query = Student::with('user:id,name,email,avatar');

        $programLevel = $request->query('programLevel', 'BS');
        if ($programLevel === 'INTERMEDIATE') {
            $query->whereIn('status', ['HSSC Completed', 'Graduated'])
                  ->where('programLevel', 'INTERMEDIATE');
        } else {
            $query->where('status', 'Graduated')
                  ->where('programLevel', 'BS');
        }

        if ($dept = $request->query('department')) {
            if ($dept !== 'all') {
                $query->where('department', $dept);
            }
        }

        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('rollNo', 'ilike', "%{$search}%")
                  ->orWhere('department', 'ilike', "%{$search}%")
                  ->orWhereHas('user', fn($uq) => $uq->where('name', 'ilike', "%{$search}%")->orWhere('email', 'ilike', "%{$search}%"));
            });
        }

        $alumni = $query->orderBy('enrollmentDate', 'desc')->get();

        $result = $alumni->map(function ($s) {
            return [
                'id' => $s->id,
                'rollNo' => $s->rollNo,
                'department' => $s->department,
                'semester' => $s->semester,
                'status' => $s->status,
                'cgpa' => $s->cgpa,
                'avatar' => $s->avatar,
                'shift' => $s->shift,
                'enrollmentDate' => $s->enrollmentDate ? $s->enrollmentDate->toIso8601String() : null,
                'graduationDate' => $s->graduationDate ? $s->graduationDate->toIso8601String() : null,
                'gradesheetUrl' => $s->gradesheetUrl,
                'user' => $s->user ? [
                    'id' => $s->user->id,
                    'name' => $s->user->name,
                    'email' => $s->user->email,
                    'avatar' => $s->user->avatar,
                ] : null,
            ];
        });

        return response()->json($result);
    }
}
