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

            return response()->json([
                'faculty' => $facultyStatusList,
            ]);
        }

        return response()->json(['error' => 'Forbidden'], 403);
    }

    public function recordAttendance(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $faculty = $user->faculty ?: Faculty::where('userId', $user->id)->first();
        if (!$faculty) {
            // If admin or test user without direct faculty link, pick first faculty profile
            $faculty = Faculty::first();
            if (!$faculty) {
                return response()->json(['error' => 'No faculty record found to record attendance.'], 404);
            }
        }

        $action = $request->input('action', 'CHECK_IN');
        $today = Carbon::today();

        if ($action === 'CHECK_IN') {
            $record = FacultyAttendance::updateOrCreate(
                [
                    'facultyId' => $faculty->id,
                    'date' => $today,
                ],
                [
                    'status' => 'Present',
                    'checkInTime' => Carbon::now(),
                    'markedBy' => 'SELF',
                ]
            );
        } else {
            $record = FacultyAttendance::where('facultyId', $faculty->id)
                ->whereDate('date', $today)
                ->first();

            if ($record) {
                $record->checkOutTime = Carbon::now();
                $record->save();
            } else {
                $record = FacultyAttendance::create([
                    'facultyId' => $faculty->id,
                    'date' => $today,
                    'status' => 'Present',
                    'checkOutTime' => Carbon::now(),
                    'markedBy' => 'SELF',
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'record' => $record,
        ]);
    }

    public function attendanceHistory(Request $request)
    {
        $facultyId = $request->query('facultyId');
        if (!$facultyId) {
            $user = $request->attributes->get('user') ?? auth()->user();
            $facultyId = $user?->faculty?->id;
        }

        if (!$facultyId) {
            $firstFac = Faculty::first();
            $facultyId = $firstFac?->id;
        }

        if (!$facultyId) {
            return response()->json([]);
        }

        $records = FacultyAttendance::where('facultyId', $facultyId)
            ->orderBy('date', 'desc')
            ->limit(90)
            ->get();

        $formatted = $records->map(function ($r) {
            return [
                'id' => $r->id,
                'date' => $r->date ? $r->date->format('Y-m-d') : null,
                'status' => $r->status,
                'checkInTime' => $r->checkInTime ? $r->checkInTime->format('H:i') : null,
                'checkOutTime' => $r->checkOutTime ? $r->checkOutTime->format('H:i') : null,
            ];
        });

        return response()->json($formatted);
    }

    public function overrideAttendance(Request $request)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();

        $validated = $request->validate([
            'facultyId' => 'required|string',
            'status' => 'required|in:Present,Absent,Late,Leave,On_Duty',
            'date' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $faculty = Faculty::with('user')->find($validated['facultyId']);
        if (!$faculty) {
            return response()->json(['error' => 'Faculty member not found'], 404);
        }

        $targetDate = !empty($validated['date'])
            ? Carbon::parse($validated['date'])->startOfDay()
            : Carbon::today();

        $record = FacultyAttendance::updateOrCreate(
            [
                'facultyId' => $faculty->id,
                'date' => $targetDate,
            ],
            [
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? null,
                'markedBy' => $admin->id ?? null,
            ]
        );

        $facultyName = $faculty->user->name ?? $faculty->id;
        $dateStr = $targetDate->format('Y-m-d');
        AuditLogService::log(
            'UPDATED',
            'FacultyAttendance',
            $record->id,
            "Updated faculty attendance for {$facultyName} on {$dateStr} to {$validated['status']}",
            $admin->clerkId ?? null,
            $admin->name ?? null
        );

        return response()->json([
            'success' => true,
            'record' => $record,
        ]);
    }
}

