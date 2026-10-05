<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Faculty;
use App\Models\FacultyAttendance;
use App\Models\User;
use App\Services\AuditLogService;
use Carbon\Carbon;

class FacultyController extends Controller
{
    public function index()
    {
        $faculty = Faculty::with([
            'user:id,name,email,avatar',
            'teaches:id,courseCode,courseName,department,assignedFaculty',
        ])->get();

        $result = $faculty->map(function ($f) {
            return [
                'id' => $f->id,
                'userId' => $f->userId,
                'user' => [
                    'name' => $f->user->name ?? null,
                    'email' => $f->user->email ?? null,
                ],
                'phone' => $f->phone,
                'department' => $f->department,
                'specialization' => $f->specialization,
                'joinDate' => $f->joinDate ? $f->joinDate->toIso8601String() : null,
                'avatar' => $f->avatar,
                'teaches' => $f->teaches,
            ];
        });

        return response()->json($result);
    }

    public function show(string $id)
    {
        $faculty = Faculty::with([
            'user:id,name,email,avatar',
            'teaches',
            'teachesMorning',
            'teachesEvening',
            'attendances',
        ])->find($id);

        if (!$faculty) {
            return response()->json(['error' => 'Faculty not found'], 404);
        }

        return response()->json($faculty);
    }

    public function store(Request $request)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();

        $validated = $request->validate([
            'userId' => 'required|string',
            'phone' => 'nullable|string',
            'department' => 'required|string',
            'specialization' => 'required|string',
        ]);

        $user = User::find($validated['userId']);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $user->role = 'FACULTY';
        $user->save();

        $faculty = Faculty::create($validated);

        AuditLogService::log(
            'CREATED',
            'Faculty',
            $faculty->id,
            "Created faculty profile for {$user->name} ({$faculty->department})",
            $admin->clerkId ?? null,
            $admin->name ?? null
        );

        return response()->json($faculty, 201);
    }

    public function update(Request $request, string $id)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();
        $faculty = Faculty::with('user')->find($id);

        if (!$faculty) {
            return response()->json(['error' => 'Faculty not found'], 404);
        }

        $validated = $request->validate([
            'phone' => 'nullable|string',
            'department' => 'sometimes|string',
            'specialization' => 'sometimes|string',
        ]);

        $faculty->update($validated);

        AuditLogService::log(
            'UPDATED',
            'Faculty',
            $faculty->id,
            "Updated faculty profile for {$faculty->user->name}",
            $admin->clerkId ?? null,
            $admin->name ?? null
        );

        return response()->json($faculty);
    }

    public function destroy(Request $request, string $id)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();
        $faculty = Faculty::with('user')->find($id);

        if (!$faculty) {
            return response()->json(['error' => 'Faculty not found'], 404);
        }

        $name = $faculty->user ? $faculty->user->name : $id;
        $faculty->delete();

        AuditLogService::log(
            'DELETED',
            'Faculty',
            $id,
            "Deleted faculty {$name}",
            $admin->clerkId ?? null,
            $admin->name ?? null
        );

        return response()->json(['message' => 'Faculty deleted successfully']);
    }

    public function attendance(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $dateParam = $request->query('date');
        $targetDate = $dateParam ? Carbon::parse($dateParam)->startOfDay() : Carbon::today();

        if ($user->role === 'FACULTY') {
            if (!$user->faculty) {
                return response()->json(['error' => 'Faculty record not found'], 403);
            }

            $facultyId = $user->faculty->id;

            $records = FacultyAttendance::where('facultyId', $facultyId)
                ->when($dateParam, fn($q) => $q->whereDate('date', $targetDate))
                ->orderBy('date', 'desc')
                ->limit(30)
                ->get();

            $todayRecord = FacultyAttendance::where('facultyId', $facultyId)
                ->whereDate('date', Carbon::today())
                ->first();

            return response()->json([
                'todayRecord' => $todayRecord,
                'history' => $records,
            ]);
        }

        if ($user->role === 'ADMIN') {
            $deptParam = $request->query('department');

            $allFaculty = Faculty::query()
                ->when($deptParam && $deptParam !== 'ALL', fn($q) => $q->where('department', $deptParam))
                ->with(['user:id,name,email,avatar', 'attendances' => function ($q) use ($targetDate) {
                    $q->whereDate('date', $targetDate)->orderBy('date', 'desc');
                }])
                ->get();

            $facultyStatusList = $allFaculty->map(function ($fac) {
                $attendance = $fac->attendances->first();
                return [
                    'facultyId' => $fac->id,
                    'name' => $fac->user ? ($fac->user->name ?? $fac->user->email) : 'Unknown',
                    'email' => $fac->user ? $fac->user->email : null,
                    'avatar' => $fac->user ? $fac->user->avatar : null,
                    'department' => $fac->department,
                    'specialization' => $fac->specialization,
                    'status' => $attendance ? $attendance->status : 'Absent',
                    'checkInTime' => $attendance ? $attendance->checkInTime : null,
                    'checkOutTime' => $attendance ? $attendance->checkOutTime : null,
                    'notes' => $attendance ? $attendance->notes : null,
                ];
            });

            return response()->json($facultyStatusList);
        }

        return response()->json(['error' => 'Forbidden'], 403);
    }
}
