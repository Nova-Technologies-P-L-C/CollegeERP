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
                if ($programLevel === 'INTERMEDIATE') {
                    $query->where(function ($q) use ($dept) {
                        $q->where('discipline', $dept)
                          ->orWhere('department', $dept);
                    });
                } else {
                    $query->where('department', $dept);
                }
            }
        }

        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('rollNo', 'ilike', "%{$search}%")
                  ->orWhere('department', 'ilike', "%{$search}%")
                  ->orWhere('discipline', 'ilike', "%{$search}%")
                  ->orWhereHas('user', fn($uq) => $uq->where('name', 'ilike', "%{$search}%")->orWhere('email', 'ilike', "%{$search}%"));
            });
        }

        $alumni = $query->orderBy('enrollmentDate', 'desc')->get();

        $result = $alumni->map(function ($s) {
            $gradYear = $s->graduationDate
                ? (int) $s->graduationDate->format('Y')
                : ($s->enrollmentDate ? (int) $s->enrollmentDate->format('Y') + 4 : (int) date('Y'));

            return [
                'id' => $s->id,
                'rollNo' => $s->rollNo,
                'name' => $s->user ? ($s->user->name ?? $s->rollNo) : $s->rollNo,
                'email' => $s->user ? ($s->user->email ?? '') : '',
                'avatar' => $s->avatar ?: ($s->user ? $s->user->avatar : null),
                'department' => $s->programLevel === 'INTERMEDIATE' ? ($s->discipline ?: $s->department) : $s->department,
                'discipline' => $s->discipline,
                'part' => $s->part,
                'semester' => $s->semester,
                'programLevel' => $s->programLevel,
                'status' => $s->status,
                'cgpa' => $s->cgpa,
                'shift' => $s->shift,
                'graduationYear' => $gradYear,
                'batch' => $s->programLevel === 'INTERMEDIATE' ? "HSSC Passed {$gradYear}" : "Batch " . ($gradYear - 4) . "-" . substr((string)$gradYear, -2),
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
