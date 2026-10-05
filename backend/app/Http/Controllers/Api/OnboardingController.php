<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\OnboardingRequest;
use App\Models\User;
use App\Models\Faculty;
use App\Models\Admin;
use App\Services\AuditLogService;

class OnboardingController extends Controller
{
    public function index(Request $request)
    {
        $query = OnboardingRequest::query();
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        return response()->json($query->orderBy('createdAt', 'desc')->get());
    }

    public function store(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'role' => 'required|string|in:FACULTY,ADMIN',
            'phone' => 'required|string',
            'department' => 'nullable|string',
            'specialization' => 'nullable|string',
            'discipline' => 'nullable|string',
            'part' => 'nullable|integer',
            'subjectSet' => 'nullable|string',
            'programLevel' => 'nullable|string|in:BS,INTERMEDIATE',
        ]);

        $existing = OnboardingRequest::where('email', $user->email)->first();
        if ($existing) {
            $existing->update([
                'name' => $user->name ?: 'User',
                'role' => $validated['role'],
                'phone' => $validated['phone'],
                'department' => $validated['department'] ?? null,
                'specialization' => $validated['specialization'] ?? null,
                'status' => 'Pending',
            ]);
            return response()->json($existing);
        }

        $req = OnboardingRequest::create([
            'email' => $user->email,
            'name' => $user->name ?: 'User',
            'role' => $validated['role'],
            'phone' => $validated['phone'],
            'department' => $validated['department'] ?? null,
            'specialization' => $validated['specialization'] ?? null,
            'discipline' => $validated['discipline'] ?? null,
            'part' => $validated['part'] ?? null,
            'subjectSet' => $validated['subjectSet'] ?? null,
            'programLevel' => $validated['programLevel'] ?? 'BS',
            'status' => 'Pending',
        ]);

        return response()->json($req, 201);
    }

    public function status(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $req = OnboardingRequest::where('email', $user->email)->latest('createdAt')->first();
        return response()->json($req);
    }

    public function approve(Request $request)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();
        $validated = $request->validate([
            'requestId' => 'required|string',
            'action' => 'required|string|in:approve,reject',
        ]);

        $req = OnboardingRequest::find($validated['requestId']);
        if (!$req) {
            return response()->json(['error' => 'Request not found'], 404);
        }

        if ($validated['action'] === 'approve') {
            $req->update(['status' => 'Approved']);

            $user = User::where('email', $req->email)->first();
            if ($user) {
                $user->role = $req->role;
                $user->save();

                if ($req->role === 'FACULTY') {
                    Faculty::updateOrCreate(
                        ['userId' => $user->id],
                        [
                            'department' => $req->department ?: 'General',
                            'specialization' => $req->specialization ?: 'General',
                            'phone' => $req->phone,
                        ]
                    );
                } elseif ($req->role === 'ADMIN') {
                    Admin::firstOrCreate(['userId' => $user->id]);
                }
            }

            AuditLogService::log(
                'UPDATED',
                'OnboardingRequest',
                $req->id,
                "Approved staff onboarding for {$req->name} as {$req->role}",
                $admin->clerkId ?? null,
                $admin->name ?? null
            );
        } else {
            $req->update(['status' => 'Rejected']);
        }

        return response()->json($req);
    }
}
