<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Announcement;
use App\Services\AuditLogService;

class AnnouncementController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $query = Announcement::query();

        $allowedAudiences = ['All'];
        if ($user->role === 'STUDENT') {
            $allowedAudiences[] = 'Students';
        } elseif ($user->role === 'FACULTY') {
            $allowedAudiences[] = 'Faculty';
        } elseif ($user->role === 'ADMIN') {
            $allowedAudiences = ['All', 'Students', 'Faculty'];
        }

        $query->whereIn('audience', $allowedAudiences);

        $level = $request->query('programLevel');
        if ($user->role === 'STUDENT') {
            $student = $user->student;
            $studentLevel = $student?->programLevel ?? $level ?? 'BS';
            if ($studentLevel === 'INTERMEDIATE') {
                $query->where('programLevel', 'INTERMEDIATE');
            } else {
                $query->where(function ($q) {
                    $q->where('programLevel', 'BS')
                      ->orWhereNull('programLevel');
                });
            }

            if ($student) {
                $query->where(function ($q) use ($student) {
                    $q->whereNull('targetDepartment')
                      ->orWhere('targetDepartment', '')
                      ->orWhere('targetDepartment', $student->department)
                      ->orWhere('targetDepartment', $student->discipline);
                });
                $sem = $student->part ?: $student->semester;
                if ($sem) {
                    $query->where(function ($q) use ($sem, $student) {
                        $q->whereNull('targetSemester')
                          ->orWhere('targetSemester', $student->semester)
                          ->orWhere('targetSemester', $student->part);
                    });
                }
            }
        } elseif ($level) {
            if ($level === 'INTERMEDIATE') {
                $query->where('programLevel', 'INTERMEDIATE');
            } else {
                $query->where(function ($q) {
                    $q->where('programLevel', 'BS')
                      ->orWhereNull('programLevel');
                });
            }
        }

        if ($aud = $request->query('audience')) {
            if (in_array($aud, $allowedAudiences)) {
                $query->where('audience', $aud);
            }
        }

        $announcements = $query->orderBy('date', 'desc')->get();

        return response()->json($announcements);
    }

    public function store(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();

        $validated = $request->validate([
            'title' => 'required|string',
            'content' => 'required|string',
            'audience' => 'required|string|in:All,Students,Faculty',
            'priority' => 'nullable|string|in:High,Medium,Low',
            'programLevel' => 'nullable|string|in:BS,INTERMEDIATE',
            'targetDepartment' => 'nullable|string',
            'targetSemester' => 'nullable|integer',
        ]);

        $announcement = Announcement::create([
            'title' => $validated['title'],
            'content' => $validated['content'],
            'author' => $user->name ?: ($user->email ?: 'Admin'),
            'audience' => $validated['audience'],
            'priority' => $validated['priority'] ?? 'Medium',
            'programLevel' => $validated['programLevel'] ?? 'BS',
            'targetDepartment' => $validated['targetDepartment'] ?? null,
            'targetSemester' => $validated['targetSemester'] ?? null,
            'date' => now(),
        ]);

        AuditLogService::log(
            'CREATED',
            'Announcement',
            $announcement->id,
            "Published announcement: {$announcement->title}",
            $user->clerkId ?? null,
            $user->name ?? null,
            $announcement->programLevel ?? 'BS'
        );

        return response()->json($announcement, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        $announcement = Announcement::find($id);

        if (!$announcement) {
            return response()->json(['error' => 'Announcement not found'], 404);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string',
            'content' => 'sometimes|string',
            'audience' => 'sometimes|string|in:All,Students,Faculty',
            'priority' => 'sometimes|string|in:High,Medium,Low',
            'programLevel' => 'sometimes|string|in:BS,INTERMEDIATE',
            'targetDepartment' => 'nullable|string',
            'targetSemester' => 'nullable|integer',
        ]);

        $announcement->update($validated);

        return response()->json($announcement);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        $announcement = Announcement::find($id);

        if (!$announcement) {
            return response()->json(['error' => 'Announcement not found'], 404);
        }

        $title = $announcement->title;
        $level = $announcement->programLevel ?? 'BS';
        $announcement->delete();

        AuditLogService::log(
            'DELETED',
            'Announcement',
            $id,
            "Deleted announcement: {$title}",
            $user->clerkId ?? null,
            $user->name ?? null,
            $level
        );

        return response()->json(['message' => 'Announcement deleted successfully']);
    }
}
