<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Fee;
use App\Models\Student;
use App\Services\AuditLogService;
use Carbon\Carbon;

class FeeController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $query = Fee::with(['student.user:id,name,email']);

        if ($user->role === 'STUDENT') {
            if (!$user->student) {
                return response()->json(['error' => 'Student not found'], 403);
            }
            $query->where('studentId', $user->student->id);
        } elseif ($request->has('studentId')) {
            $query->where('studentId', $request->query('studentId'));
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($semester = $request->query('semester')) {
            $query->where('semester', (int) $semester);
        }

        if ($programLevel = $request->query('programLevel')) {
            $query->whereHas('student', function ($q) use ($programLevel) {
                $q->where('programLevel', $programLevel);
            });
        }

        $fees = $query->orderBy('dueDate', 'desc')->get();

        return response()->json($fees);
    }

    public function store(Request $request)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();

        $validated = $request->validate([
            'isBulk' => 'nullable|boolean',
            'studentId' => 'nullable|string',
            'department' => 'nullable|string',
            'shift' => 'nullable|string',
            'type' => 'required|string',
            'amount' => 'required|numeric|min:1',
            'dueDate' => 'required|date',
            'semester' => 'required|integer',
        ]);

        $dueDate = Carbon::parse($validated['dueDate']);

        if (!empty($validated['isBulk'])) {
            $studentQuery = Student::where('status', 'Active');
            $dept = $validated['department'] ?? '';
            $sem = (int) ($validated['semester'] ?? 1);
            $programLevel = $request->input('programLevel');

            if ($programLevel === 'INTERMEDIATE') {
                $normDept = $dept;
                if (str_contains($dept, 'I.Com')) $normDept = 'I.Com';
                elseif (str_contains($dept, 'ICS')) $normDept = 'ICS';
                elseif (str_contains($dept, 'Pre-Engineering')) $normDept = 'F.Sc Pre-Engineering';
                elseif (str_contains($dept, 'Pre-Medical')) $normDept = 'F.Sc Pre-Medical';
                elseif (str_contains($dept, 'Home Economics')) $normDept = 'Home Economics';
                elseif (str_contains($dept, 'FA IT')) $normDept = 'FA IT';
                elseif (str_starts_with($dept, 'FA')) $normDept = 'FA';

                $studentQuery->where('programLevel', 'INTERMEDIATE')
                    ->where(function ($q) use ($dept, $normDept) {
                        $q->where('discipline', $dept)
                          ->orWhere('discipline', $normDept)
                          ->orWhere('department', $dept)
                          ->orWhere('department', $normDept)
                          ->orWhere('discipline', 'like', "{$normDept}%")
                          ->orWhere('department', 'like', "{$normDept}%");
                    })
                    ->where(function ($q) use ($sem) {
                        $q->where('part', $sem)->orWhere('semester', $sem);
                    });
            } else {
                $studentQuery->where('department', $dept)
                    ->where('semester', $sem);
                if (!empty($validated['shift'])) {
                    $studentQuery->where('shift', $validated['shift']);
                }
            }

            $students = $studentQuery->get();

            if ($students->isEmpty()) {
                $levelLabel = $programLevel === 'INTERMEDIATE' ? "Part {$sem}" : "Semester {$sem}";
                $shiftLabel = (!empty($validated['shift']) && $programLevel !== 'INTERMEDIATE') ? " ({$validated['shift']} Shift)" : "";
                return response()->json([
                    'error' => "No active students found in {$dept} {$levelLabel}{$shiftLabel} to assign dues."
                ], 422);
            }

            $created = [];
            foreach ($students as $s) {
                // Prevent duplicate assignment of identical unpaid fee for this semester
                $existing = Fee::where('studentId', $s->id)
                    ->where('type', $validated['type'])
                    ->where('semester', $validated['semester'])
                    ->where('status', 'Unpaid')
                    ->first();

                if (!$existing) {
                    $created[] = Fee::create([
                        'studentId' => $s->id,
                        'type' => $validated['type'],
                        'amount' => $validated['amount'],
                        'dueDate' => $dueDate,
                        'semester' => $validated['semester'],
                        'status' => 'Unpaid',
                    ]);
                }
            }

            if (empty($created)) {
                return response()->json([
                    'message' => 'All active students in this class already have this unpaid fee assigned.',
                    'count' => 0
                ], 200);
            }

            AuditLogService::log(
                'CREATED',
                'Fee',
                'bulk',
                "Bulk assigned {$validated['type']} fee of {$validated['amount']} to " . count($created) . " students",
                $admin->clerkId ?? null,
                $admin->name ?? null,
                $programLevel === 'INTERMEDIATE' ? 'INTERMEDIATE' : 'BS'
            );

            return response()->json([
                'message' => 'Fees assigned successfully',
                'count' => count($created)
            ], 201);
        }

        $fee = Fee::create([
            'studentId' => $validated['studentId'],
            'type' => $validated['type'],
            'amount' => $validated['amount'],
            'dueDate' => $dueDate,
            'semester' => $validated['semester'],
            'status' => 'Unpaid',
        ]);

        AuditLogService::log(
            'CREATED',
            'Fee',
            $fee->id,
            "Assigned fee {$fee->type} ({$fee->amount})",
            $admin->clerkId ?? null,
            $admin->name ?? null
        );

        return response()->json($fee, 201);
    }

    public function update(Request $request, string $id)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();
        $fee = Fee::with('student')->find($id);

        if (!$fee) {
            return response()->json(['error' => 'Fee record not found'], 404);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:Paid,Unpaid,Overdue',
            'paidDate' => 'nullable|date',
        ]);

        $fee->status = $validated['status'];
        if ($validated['status'] === 'Paid') {
            $fee->paidDate = !empty($validated['paidDate']) ? Carbon::parse($validated['paidDate']) : Carbon::now();
        } else {
            $fee->paidDate = null;
        }
        $fee->save();

        AuditLogService::log(
            'UPDATED',
            'Fee',
            $fee->id,
            "Updated fee status to {$fee->status} for student {$fee->student->rollNo}",
            $admin->clerkId ?? null,
            $admin->name ?? null,
            $fee->student->programLevel ?? 'BS'
        );

        return response()->json($fee);
    }

    public function destroy(Request $request, string $id)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();
        $fee = Fee::find($id);

        if (!$fee) {
            return response()->json(['error' => 'Fee record not found'], 404);
        }

        $fee->delete();

        AuditLogService::log(
            'DELETED',
            'Fee',
            $id,
            "Deleted fee record {$id}",
            $admin->clerkId ?? null,
            $admin->name ?? null
        );

        return response()->json(['message' => 'Fee record deleted successfully']);
    }

    public function markOverdue()
    {
        $count = Fee::where('status', 'Unpaid')
            ->where('dueDate', '<', Carbon::now())
            ->update(['status' => 'Overdue']);

        return response()->json(['message' => 'Overdue fees updated', 'updatedCount' => $count]);
    }
}
