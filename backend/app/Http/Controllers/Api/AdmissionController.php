<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Admission;
use App\Models\Student;
use App\Models\User;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Fee;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AdmissionController extends Controller
{
    public function index(Request $request)
    {
        $query = Admission::query();

        if ($request->has('programLevel')) {
            $query->where('programLevel', $request->query('programLevel'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->has('department')) {
            $query->where('appliedDepartment', $request->query('department'));
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('studentName', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('phone', 'ilike', "%{$search}%")
                  ->orWhere('appliedDepartment', 'ilike', "%{$search}%");
            });
        }

        $admissions = $query->orderBy('applicationDate', 'desc')->get();

        return response()->json($admissions);
    }

    public function show(string $id)
    {
        $admission = Admission::find($id);
        if (!$admission) {
            return response()->json(['error' => 'Admission application not found'], 404);
        }
        return response()->json($admission);
    }

    public function store(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();

        $validated = $request->validate([
            'studentName' => 'required|string',
            'email' => 'required|email',
            'phone' => 'required|string',
            'appliedDepartment' => 'nullable|string',
            'discipline' => 'nullable|string',
            'fatherName' => 'required|string',
            'cnic' => 'required|string',
            'previousInstitution' => 'required|string',
            'marksObtained' => 'required|numeric',
            'totalMarks' => 'required|numeric',
            'shift' => 'nullable|string',
            'semester' => 'nullable|integer',
            'part' => 'nullable|integer',
            'programLevel' => 'nullable|string|in:BS,INTERMEDIATE',
            'selectedCourses' => 'nullable|array',
        ]);

        $validated['shift'] = $validated['shift'] ?? 'Morning';
        $validated['semester'] = $validated['semester'] ?? 1;
        $validated['part'] = $validated['part'] ?? 1;

        $isStaff = $user && in_array($user->role, ['ADMIN', 'FACULTY']);

        // Check duplicate pending application
        $existing = Admission::where('email', $validated['email'])
            ->where('status', 'Pending')
            ->first();

        if ($existing) {
            return response()->json([
                'error' => 'An active pending application already exists for this email.'
            ], 400);
        }

        $admission = Admission::create($validated);

        if ($isStaff) {
            AuditLogService::log(
                'CREATED',
                'Admission',
                $admission->id,
                "Registrar created admission for {$admission->studentName}",
                $user->clerkId ?? null,
                $user->name ?? null,
                $admission->programLevel ?? 'BS'
            );
        }

        return response()->json($admission, 201);
    }

    public function update(Request $request, string $id)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();
        $admission = Admission::find($id);

        if (!$admission) {
            return response()->json(['error' => 'Admission not found'], 404);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:Approved,Rejected,Pending',
            'paymentMethod' => 'nullable|string',
            'receiptNo' => 'nullable|string',
            'paidAmount' => 'nullable|numeric',
        ]);

        if ($validated['status'] === 'Approved' && $admission->status !== 'Approved') {
            // Strictly require accountant payment verification before admission approval
            if (empty($validated['receiptNo']) || empty($validated['paidAmount']) || (float)$validated['paidAmount'] <= 0) {
                return response()->json([
                    'error' => 'Cannot approve admission before payment verification. The Accountant must verify payment with a valid receipt number and amount at the Accountant Desk before approval.'
                ], 422);
            }

            $createdStudent = null;
            $generatedRollNo = null;

            DB::transaction(function () use ($admission, $validated, $admin, &$createdStudent, &$generatedRollNo) {
                $admission->status = 'Approved';
                $admission->save();

                // Find or create user
                $user = User::where('email', $admission->email)->first();
                if (!$user) {
                    $user = User::create([
                        'email' => $admission->email,
                        'name' => $admission->studentName,
                        'role' => 'STUDENT',
                    ]);
                }

                // Generate Roll Number
                $dept = $admission->appliedDepartment ?: ($admission->discipline ?: 'CS');
                $code = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $dept), 0, 3)) ?: 'STU';
                $year = date('Y');
                $count = Student::where('rollNo', 'like', "{$code}-{$year}-%")->count();
                $seq = str_pad($count + 1, 2, '0', STR_PAD_LEFT);
                $rollNo = "{$code}-{$year}-{$seq}";

                // Create Student record
                $student = Student::where('userId', $user->id)->first();
                if (!$student) {
                    $student = Student::create([
                        'userId' => $user->id,
                        'rollNo' => $rollNo,
                        'department' => $admission->appliedDepartment ?: $admission->discipline ?: 'General',
                        'semester' => $admission->semester ?: 1,
                        'programLevel' => $admission->programLevel ?: 'BS',
                        'discipline' => $admission->discipline,
                        'part' => $admission->part,
                        'shift' => $admission->shift ?: 'Morning',
                        'phone' => $admission->phone,
                        'status' => 'Active',
                    ]);
                }

                $createdStudent = $student;
                $generatedRollNo = $student->rollNo;

                // Create Fee record
                Fee::create([
                    'studentId' => $student->id,
                    'type' => 'Admission & Tuition Fee',
                    'amount' => $validated['paidAmount'] ?? 25000,
                    'status' => !empty($validated['receiptNo']) ? 'Paid' : 'Unpaid',
                    'dueDate' => Carbon::now()->addDays(30),
                    'semester' => $student->semester,
                    'paidDate' => !empty($validated['receiptNo']) ? Carbon::now() : null,
                ]);

                // Enroll in semester / part courses
                $part = $student->part ?: ($student->semester ?: 1);

                if ($student->programLevel === 'INTERMEDIATE') {
                    $disc = $student->discipline ?: $student->department;
                    $normDisc = $disc;
                    if (str_contains($disc, 'I.Com')) $normDisc = 'I.Com';
                    elseif (str_contains($disc, 'ICS')) $normDisc = 'ICS';
                    elseif (str_contains($disc, 'Pre-Engineering')) $normDisc = 'F.Sc Pre-Engineering';
                    elseif (str_contains($disc, 'Pre-Medical')) $normDisc = 'F.Sc Pre-Medical';
                    elseif (str_contains($disc, 'Home Economics')) $normDisc = 'Home Economics';
                    elseif (str_contains($disc, 'FA IT')) $normDisc = 'FA IT';
                    elseif (str_starts_with($disc, 'FA')) $normDisc = 'FA';

                    $courses = Course::where('programLevel', 'INTERMEDIATE')
                        ->where(function ($q) use ($disc, $normDisc) {
                            $q->where('discipline', $disc)
                              ->orWhere('discipline', $normDisc)
                              ->orWhere('department', $disc)
                              ->orWhere('department', $normDisc);
                        })
                        ->where(function ($q) use ($part) {
                            $q->where('part', $part)
                              ->orWhere('semester', $part);
                        })
                        ->get();
                } else {
                    $courses = Course::where('department', $student->department)
                        ->where('semester', $student->semester)
                        ->where('programLevel', 'BS')
                        ->get();
                }

                foreach ($courses as $c) {
                    Enrollment::firstOrCreate([
                        'studentId' => $student->id,
                        'courseId' => $c->id,
                    ], [
                        'semester' => $student->semester ?: 1,
                    ]);
                }
            });

            AuditLogService::log(
                'UPDATED',
                'Admission',
                $admission->id,
                "Approved admission for {$admission->studentName} (Roll No: {$generatedRollNo})",
                $admin->clerkId ?? null,
                $admin->name ?? null,
                $admission->programLevel ?? 'BS'
            );

            return response()->json(array_merge($admission->toArray(), [
                'generatedRollNo' => $generatedRollNo,
                'student' => $createdStudent,
            ]));
        } else {
            $admission->status = $validated['status'];
            $admission->save();

            AuditLogService::log(
                'UPDATED',
                'Admission',
                $admission->id,
                "Marked admission for {$admission->studentName} as {$admission->status}",
                $admin->clerkId ?? null,
                $admin->name ?? null,
                $admission->programLevel ?? 'BS'
            );

            return response()->json($admission);
        }
    }

    public function destroy(Request $request, string $id)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();
        $admission = Admission::find($id);

        if (!$admission) {
            return response()->json(['error' => 'Admission not found'], 404);
        }

        $name = $admission->studentName;
        $level = $admission->programLevel ?? 'BS';
        $admission->delete();

        AuditLogService::log(
            'DELETED',
            'Admission',
            $id,
            "Deleted admission application for {$name}",
            $admin->clerkId ?? null,
            $admin->name ?? null,
            $level
        );

        return response()->json(['message' => 'Admission deleted successfully']);
    }

    public function myStatus(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $admission = Admission::where('email', $user->email)->latest('applicationDate')->first();
        return response()->json($admission);
    }
}
