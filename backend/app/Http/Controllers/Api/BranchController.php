<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Branch;
use App\Services\AuditLogService;

class BranchController extends Controller
{
    public function index(Request $request)
    {
        $query = Branch::query()
            ->with(['parent', 'subBranches'])
            ->withCount(['subBranches', 'students', 'faculty', 'courses']);

        if ($request->has('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        if ($request->has('parentId')) {
            $parentId = $request->query('parentId');
            if ($parentId === 'null' || $parentId === '') {
                $query->whereNull('parentId');
            } else {
                $query->where('parentId', $parentId);
            }
        }

        $branches = $query->orderBy('createdAt', 'desc')->get();

        return response()->json($branches);
    }

    public function show($id)
    {
        $branch = Branch::with(['parent', 'subBranches', 'admins.user'])
            ->withCount(['subBranches', 'students', 'faculty', 'courses'])
            ->findOrFail($id);

        return response()->json($branch);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:Branch,code',
            'city' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:150',
            'parentId' => 'nullable|string|exists:Branch,id',
            'isHead' => 'nullable|boolean',
            'status' => 'nullable|in:PENDING_APPROVAL,APPROVED,REJECTED,SUSPENDED',
        ]);

        $user = $request->attributes->get('user') ?? auth()->user();

        // If a parentId is provided (e.g. Branch Admin A creating sub-branch A1 or A2),
        // sub-branches created by an approved parent branch are automatically APPROVED.
        // If it is a new independent client institution registering for the ERP, it defaults to PENDING_APPROVAL.
        $status = $validated['status'] ?? ($request->filled('parentId') ? 'APPROVED' : 'PENDING_APPROVAL');

        $branch = Branch::create([
            'name' => $validated['name'],
            'code' => strtoupper(trim($validated['code'])),
            'city' => $validated['city'] ?? null,
            'address' => $validated['address'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'parentId' => $validated['parentId'] ?? null,
            'isHead' => $validated['isHead'] ?? (empty($validated['parentId'])),
            'status' => $status,
            'approvedAt' => $status === 'APPROVED' ? now() : null,
            'approvedBy' => $status === 'APPROVED' ? ($user->name ?? 'Branch Admin') : null,
        ]);

        AuditLogService::log(
            'CREATE',
            'Branch',
            $branch->id,
            "Created branch/campus {$branch->name} ({$branch->code}) with status {$branch->status}",
            $user->clerkId ?? null,
            $user->name ?? 'Branch Admin'
        );

        return response()->json($branch->load(['parent', 'subBranches']), 201);
    }

    public function approve(Request $request, $id)
    {
        $branch = Branch::findOrFail($id);
        $user = $request->attributes->get('user') ?? auth()->user();

        $branch->update([
            'status' => 'APPROVED',
            'approvedAt' => now(),
            'approvedBy' => $user->name ?? 'Platform Admin (Nova Tech)',
        ]);

        AuditLogService::log(
            'APPROVE',
            'Branch',
            $branch->id,
            "Platform Admin approved ERP campus license for {$branch->name} ({$branch->code})",
            $user->clerkId ?? null,
            $user->name ?? 'Platform Admin'
        );

        return response()->json([
            'message' => 'Branch approved successfully and ERP access granted.',
            'branch' => $branch->fresh(['parent', 'subBranches']),
        ]);
    }

    public function reject(Request $request, $id)
    {
        $branch = Branch::findOrFail($id);
        $user = $request->attributes->get('user') ?? auth()->user();

        $branch->update([
            'status' => 'REJECTED',
        ]);

        AuditLogService::log(
            'REJECT',
            'Branch',
            $branch->id,
            "Platform Admin rejected ERP onboarding request for {$branch->name} ({$branch->code})",
            $user->clerkId ?? null,
            $user->name ?? 'Platform Admin'
        );

        return response()->json([
            'message' => 'Branch rejected.',
            'branch' => $branch->fresh(),
        ]);
    }

    public function update(Request $request, $id)
    {
        $branch = Branch::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:Branch,code,' . $id,
            'city' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:150',
            'status' => 'sometimes|in:PENDING_APPROVAL,APPROVED,REJECTED,SUSPENDED',
        ]);

        $branch->update($validated);

        return response()->json($branch->fresh(['parent', 'subBranches']));
    }

    public function destroy($id)
    {
        $branch = Branch::findOrFail($id);
        $user = auth()->user();

        AuditLogService::log(
            'DELETE',
            'Branch',
            $branch->id,
            "Deleted branch {$branch->name} ({$branch->code})",
            $user->clerkId ?? null,
            $user->name ?? 'Admin'
        );

        $branch->delete();

        return response()->json(['message' => 'Branch deleted successfully.']);
    }
}
