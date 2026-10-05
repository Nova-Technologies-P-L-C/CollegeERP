<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Course;
use App\Models\Admission;
use App\Services\AuditLogService;

class ImportController extends Controller
{
    public function importCourses(Request $request)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();

        $validated = $request->validate([
            'courses' => 'required|array|min:1',
            'courses.*.courseCode' => 'required|string',
            'courses.*.courseName' => 'required|string',
            'courses.*.creditHours' => 'required|integer',
            'courses.*.department' => 'required|string',
            'courses.*.semester' => 'nullable|integer',
            'courses.*.programLevel' => 'nullable|string',
            'courses.*.discipline' => 'nullable|string',
        ]);

        $created = 0;
        foreach ($validated['courses'] as $c) {
            Course::updateOrCreate(
                [
                    'courseCode' => $c['courseCode'],
                    'department' => $c['department'],
                ],
                $c
            );
            $created++;
        }

        AuditLogService::log(
            'CREATED',
            'Course',
            'import',
            "Bulk imported {$created} courses",
            $admin->clerkId ?? null,
            $admin->name ?? null
        );

        return response()->json(['message' => 'Courses imported successfully', 'importedCount' => $created]);
    }

    public function importAdmissions(Request $request)
    {
        $admin = $request->attributes->get('user') ?? auth()->user();

        $validated = $request->validate([
            'admissions' => 'required|array|min:1',
            'admissions.*.studentName' => 'required|string',
            'admissions.*.email' => 'required|email',
            'admissions.*.phone' => 'required|string',
            'admissions.*.appliedDepartment' => 'nullable|string',
            'admissions.*.fatherName' => 'required|string',
            'admissions.*.cnic' => 'required|string',
            'admissions.*.previousInstitution' => 'required|string',
            'admissions.*.marksObtained' => 'required|numeric',
            'admissions.*.totalMarks' => 'required|numeric',
        ]);

        $imported = 0;
        foreach ($validated['admissions'] as $adm) {
            Admission::create($adm);
            $imported++;
        }

        AuditLogService::log(
            'CREATED',
            'Admission',
            'import',
            "Bulk imported {$imported} admission applications",
            $admin->clerkId ?? null,
            $admin->name ?? null
        );

        return response()->json(['message' => 'Admissions imported successfully', 'importedCount' => $imported]);
    }
}
