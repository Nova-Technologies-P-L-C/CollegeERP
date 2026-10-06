<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\SystemSettings;
use App\Models\Course;
use App\Models\Student;
use App\Services\AuditLogService;

class DisciplineController extends Controller
{
    private array $defaultDisciplines = [
        ['name' => 'F.Sc Pre-Medical', 'subjectSets' => ['Set 1'], 'isDefault' => true],
        ['name' => 'F.Sc Pre-Engineering', 'subjectSets' => ['Set 1'], 'isDefault' => true],
        ['name' => 'ICS', 'subjectSets' => ['Set 1', 'Set 2', 'Set 3', 'Set 4'], 'isDefault' => true],
        ['name' => 'FA', 'subjectSets' => ['Set 1', 'Set 2', 'Set 3', 'Set 4'], 'isDefault' => true],
        ['name' => 'FA IT', 'subjectSets' => ['Set 1', 'Set 2', 'Set 3'], 'isDefault' => true],
        ['name' => 'I.Com', 'subjectSets' => ['Set 1'], 'isDefault' => true],
        ['name' => 'Home Economics', 'subjectSets' => ['Set 1'], 'isDefault' => true],
    ];

    private function getCustomDisciplines(): array
    {
        $setting = SystemSettings::where('key', 'academic_custom_disciplines')->first();
        if (!$setting || empty($setting->value)) {
            return [];
        }

        $decoded = json_decode($setting->value, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function saveCustomDisciplines(array $customs): void
    {
        SystemSettings::updateOrCreate(
            ['key' => 'academic_custom_disciplines'],
            ['value' => json_encode(array_values($customs))]
        );
    }

    public function index()
    {
        $customs = $this->getCustomDisciplines();
        $all = array_merge($this->defaultDisciplines, $customs);

        return response()->json([
            'disciplines' => $all,
            'defaults' => $this->defaultDisciplines,
            'customs' => $customs,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->attributes->get('user') ?? auth()->user();

        $validated = $request->validate([
            'name' => 'required|string|min:2|max:100',
            'subjectSets' => 'nullable|array',
            'subjectSetsCount' => 'nullable|integer|min:1|max:10',
            'description' => 'nullable|string|max:255',
        ]);

        $name = trim($validated['name']);
        $customs = $this->getCustomDisciplines();
        $all = array_merge($this->defaultDisciplines, $customs);

        // Check if duplicate
        foreach ($all as $item) {
            if (strcasecmp($item['name'], $name) === 0) {
                return response()->json([
                    'error' => "Discipline '{$name}' already exists."
                ], 422);
            }
        }

        // Determine subject sets
        $subjectSets = ['Set 1'];
        if (!empty($validated['subjectSets']) && is_array($validated['subjectSets'])) {
            $cleaned = array_filter(array_map('trim', $validated['subjectSets']));
            if (!empty($cleaned)) {
                $subjectSets = array_values($cleaned);
            }
        } elseif (!empty($validated['subjectSetsCount'])) {
            $count = (int) $validated['subjectSetsCount'];
            $subjectSets = [];
            for ($i = 1; $i <= $count; $i++) {
                $subjectSets[] = "Set {$i}";
            }
        }

        $newDiscipline = [
            'name' => $name,
            'subjectSets' => $subjectSets,
            'description' => trim($validated['description'] ?? ''),
            'isDefault' => false,
            'createdAt' => now()->toIso8601String(),
        ];

        $customs[] = $newDiscipline;
        $this->saveCustomDisciplines($customs);

        AuditLogService::log(
            'CREATED',
            'Discipline',
            $name,
            "Created custom discipline: {$name}",
            $user->clerkId ?? null,
            $user->name ?? null,
            'INTERMEDIATE'
        );

        return response()->json([
            'message' => "Discipline '{$name}' created successfully.",
            'discipline' => $newDiscipline,
            'disciplines' => array_merge($this->defaultDisciplines, $customs),
        ], 201);
    }

    public function destroy(Request $request, string $name)
    {
        $user = $request->attributes->get('user') ?? auth()->user();
        $name = urldecode($name);

        // Check if default
        foreach ($this->defaultDisciplines as $default) {
            if (strcasecmp($default['name'], $name) === 0) {
                return response()->json([
                    'error' => "Standard board disciplines cannot be deleted."
                ], 422);
            }
        }

        // Check for attached courses
        $coursesCount = Course::where(function ($q) use ($name) {
            $q->where('discipline', $name)
              ->orWhere('department', $name);
        })->count();

        if ($coursesCount > 0) {
            return response()->json([
                'error' => "Cannot delete discipline '{$name}' because it contains {$coursesCount} active course(s). Please delete or reassign them first."
            ], 422);
        }

        // Check for attached students
        $studentsCount = Student::where(function ($q) use ($name) {
            $q->where('discipline', $name)
              ->orWhere('department', $name);
        })->count();

        if ($studentsCount > 0) {
            return response()->json([
                'error' => "Cannot delete discipline '{$name}' because {$studentsCount} student(s) are currently enrolled in it."
            ], 422);
        }

        $customs = $this->getCustomDisciplines();
        $found = false;
        $filtered = [];

        foreach ($customs as $c) {
            if (strcasecmp($c['name'], $name) === 0) {
                $found = true;
            } else {
                $filtered[] = $c;
            }
        }

        if (!$found) {
            return response()->json([
                'error' => "Custom discipline '{$name}' not found."
            ], 404);
        }

        $this->saveCustomDisciplines($filtered);

        AuditLogService::log(
            'DELETED',
            'Discipline',
            $name,
            "Deleted custom discipline: {$name}",
            $user->clerkId ?? null,
            $user->name ?? null,
            'INTERMEDIATE'
        );

        return response()->json([
            'message' => "Discipline '{$name}' deleted successfully.",
            'disciplines' => array_merge($this->defaultDisciplines, $filtered),
        ]);
    }
}
