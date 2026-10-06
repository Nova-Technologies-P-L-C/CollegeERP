<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Student;
use App\Models\Faculty;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\Http;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with(['student', 'faculty', 'admin']);

        $role = $request->query('role');
        if ($role && $role !== 'ALL') {
            $query->where('role', strtoupper($role));
        }

        $level = $request->query('programLevel');
        if ($level) {
            if ($role === 'STUDENT') {
                if ($level === 'INTERMEDIATE') {
                    $query->whereHas('student', fn($sq) => $sq->where('programLevel', 'INTERMEDIATE'));
                } else {
                    $query->whereHas('student', fn($sq) => $sq->where('programLevel', 'BS')->orWhereNull('programLevel'));
                }
            } else {
                $query->where(function ($q) use ($level) {
                    if ($level === 'INTERMEDIATE') {
                        $q->whereHas('student', fn($sq) => $sq->where('programLevel', 'INTERMEDIATE'))
                          ->orWhereHas('faculty')
                          ->orWhereHas('admin');
                    } else {
                        $q->whereHas('student', fn($sq) => $sq->where('programLevel', 'BS')->orWhereNull('programLevel'))
                          ->orWhereHas('faculty')
                          ->orWhereHas('admin');
                    }
                });
            }
        }

        if ($dept = $request->query('department')) {
            if ($dept !== 'ALL' && $dept !== 'all') {
                $query->where(function ($q) use ($dept) {
                    $q->whereHas('student', function ($sq) use ($dept) {
                        $sq->where('department', $dept)
                           ->orWhere('discipline', $dept);
                    })->orWhereHas('faculty', function ($fq) use ($dept) {
                        $fq->where('department', $dept);
                    });
                });
            }
        }

        if ($sem = $request->query('semester')) {
            if ($sem !== 'ALL' && $sem !== 'all') {
                $semInt = (int)$sem;
                $query->whereHas('student', function ($sq) use ($semInt) {
                    $sq->where('semester', $semInt)
                       ->orWhere('part', $semInt);
                });
            }
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhereHas('student', fn($sq) => $sq->where('rollNo', 'ilike', "%{$search}%"));
            });
        }

        $users = $query->orderBy('createdAt', 'desc')->get();

        return response()->json($users);
    }

    public function show(string $id)
    {
        $user = User::with(['student', 'faculty', 'admin'])->find($id);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        return response()->json($user);
    }

    public function update(Request $request, string $id)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();
        $targetUser = User::find($id);

        if (!$targetUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        if ($admin && $targetUser->id === $admin->id) {
            return response()->json(['error' => 'You cannot change your own role'], 403);
        }

        $validated = $request->validate([
            'role' => 'sometimes|string|in:ADMIN,FACULTY,STUDENT',
            'name' => 'sometimes|string',
        ]);

        $prevRole = $targetUser->role;
        $targetUser->update($validated);

        // Sync role to Clerk metadata if secret key is configured
        if (!empty($validated['role']) && $targetUser->clerkId && config('services.clerk.secret_key')) {
            try {
                Http::withToken(config('services.clerk.secret_key'))
                    ->patch("https://api.clerk.com/v1/users/{$targetUser->clerkId}/metadata", [
                        'public_metadata' => ['role' => strtolower($validated['role'])],
                    ]);
            } catch (\Exception $e) {
                // Ignore remote sync error
            }
        }

        AuditLogService::log(
            'UPDATED',
            'User',
            $targetUser->id,
            "Updated user {$targetUser->email} (Role changed from {$prevRole} to {$targetUser->role})",
            $admin->clerkId ?? null,
            $admin->name ?? null
        );

        return response()->json($targetUser);
    }

    public function destroy(Request $request, string $id)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();
        $targetUser = User::find($id);

        if (!$targetUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        if ($admin && $targetUser->id === $admin->id) {
            return response()->json(['error' => 'You cannot delete yourself'], 403);
        }

        $email = $targetUser->email;
        $targetUser->delete();

        AuditLogService::log(
            'DELETED',
            'User',
            $id,
            "Deleted user account {$email}",
            $admin->clerkId ?? null,
            $admin->name ?? null
        );

        return response()->json(['message' => 'User deleted successfully']);
    }
}
