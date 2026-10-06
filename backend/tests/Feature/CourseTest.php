<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Admin;
use App\Models\Course;
use Illuminate\Support\Facades\Schema;

class CourseTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!Schema::hasTable('Course')) {
            Schema::create('Course', function ($table) {
                $table->string('id')->primary();
                $table->string('courseCode');
                $table->string('courseName');
                $table->integer('creditHours')->default(3);
                $table->integer('totalMarks')->default(100);
                $table->string('department');
                $table->integer('semester')->nullable();
                $table->string('programLevel')->default('BS');
                $table->string('discipline')->nullable();
                $table->integer('part')->nullable();
                $table->string('subjectSet')->nullable();
                $table->string('shift')->default('Morning');
                $table->string('assignedFaculty')->nullable();
                $table->string('assignedFacultyMorning')->nullable();
                $table->string('assignedFacultyEvening')->nullable();
                $table->timestamp('createdAt')->nullable();
                $table->timestamp('updatedAt')->nullable();
            });
        }
        if (!Schema::hasTable('AuditLog')) {
            Schema::create('AuditLog', function ($table) {
                $table->string('id')->primary();
                $table->string('action');
                $table->string('entity');
                $table->string('entityId')->nullable();
                $table->text('description')->nullable();
                $table->string('adminId')->nullable();
                $table->string('adminName')->nullable();
                $table->string('programLevel')->nullable();
                $table->timestamp('createdAt')->nullable();
                $table->timestamp('updatedAt')->nullable();
            });
        }
        if (!Schema::hasTable('Enrollment')) {
            Schema::create('Enrollment', function ($table) {
                $table->string('id')->primary();
                $table->string('courseId');
                $table->string('studentId');
                $table->timestamp('createdAt')->nullable();
                $table->timestamp('updatedAt')->nullable();
            });
        }

        Course::query()->delete();
    }

    private function createAdminUser(): User
    {
        $adminUser = new User([
            'id' => 'test-admin-' . uniqid(),
            'role' => 'ADMIN',
            'name' => 'Branch Admin',
            'email' => 'admin@college.test',
        ]);
        $admin = new Admin([
            'id' => 'test-admin-rec-' . uniqid(),
            'userId' => $adminUser->id,
            'adminType' => 'BRANCH_ADMIN',
        ]);
        $adminUser->setRelation('admin', $admin);
        return $adminUser;
    }

    public function test_can_create_bs_and_intermediate_courses(): void
    {
        $admin = $this->createAdminUser();

        // Create BS Course
        $resBS = $this->actingAs($admin)->postJson('/api/courses', [
            'courseCode' => 'CS-101',
            'courseName' => 'Intro to Programming',
            'creditHours' => 3,
            'department' => 'Computer Science',
            'semester' => 1,
            'programLevel' => 'BS',
        ]);
        $resBS->assertStatus(201);
        $resBS->assertJsonFragment(['courseCode' => 'CS-101', 'programLevel' => 'BS']);

        // Create Intermediate Course
        $resHSSC = $this->actingAs($admin)->postJson('/api/courses', [
            'courseCode' => 'PHY-11',
            'courseName' => 'Physics Part 1',
            'creditHours' => 3,
            'department' => 'F.Sc Pre-Engineering',
            'discipline' => 'F.Sc Pre-Engineering',
            'part' => 1,
            'programLevel' => 'INTERMEDIATE',
        ]);
        $resHSSC->assertStatus(201);
        $resHSSC->assertJsonFragment([
            'courseCode' => 'PHY-11',
            'programLevel' => 'INTERMEDIATE',
            'discipline' => 'F.Sc Pre-Engineering',
        ]);
    }

    public function test_bulk_import_courses(): void
    {
        $admin = $this->createAdminUser();

        $payload = [
            'courses' => [
                [
                    'courseCode' => 'CS-201',
                    'courseName' => 'Data Structures',
                    'creditHours' => 4,
                    'department' => 'Computer Science',
                    'semester' => 2,
                    'programLevel' => 'BS',
                ],
                [
                    'courseCode' => 'MTH-11',
                    'courseName' => 'Intermediate Math 1',
                    'creditHours' => 3,
                    'department' => 'ICS',
                    'semester' => 1,
                    'programLevel' => 'INTERMEDIATE',
                ],
            ],
        ];

        $response = $this->actingAs($admin)->postJson('/api/courses/import', $payload);
        $response->assertStatus(200);
        $response->assertJsonFragment(['importedCount' => 2]);

        $this->assertDatabaseHas('Course', [
            'courseCode' => 'CS-201',
            'programLevel' => 'BS',
        ]);
        $this->assertDatabaseHas('Course', [
            'courseCode' => 'MTH-11',
            'programLevel' => 'INTERMEDIATE',
            'discipline' => 'ICS',
            'part' => 1,
        ]);
    }

    public function test_bulk_destroy_courses(): void
    {
        $admin = $this->createAdminUser();

        Course::create([
            'id' => 'c1',
            'courseCode' => 'CS-301',
            'courseName' => 'Algorithms',
            'department' => 'Computer Science',
            'semester' => 3,
            'programLevel' => 'BS',
        ]);
        Course::create([
            'id' => 'c2',
            'courseCode' => 'PHY-101',
            'courseName' => 'General Physics',
            'department' => 'Physics',
            'semester' => 1,
            'programLevel' => 'BS',
        ]);
        Course::create([
            'id' => 'c3',
            'courseCode' => 'CHM-11',
            'courseName' => 'Chemistry Part 1',
            'department' => 'F.Sc Pre-Engineering',
            'discipline' => 'F.Sc Pre-Engineering',
            'semester' => 1,
            'part' => 1,
            'programLevel' => 'INTERMEDIATE',
        ]);

        // 1. Purge specific department in BS
        $res1 = $this->actingAs($admin)->deleteJson('/api/courses?programLevel=BS&department=Physics&semester=all');
        $res1->assertStatus(200);
        $res1->assertJsonFragment(['deletedCount' => 1]);
        $this->assertDatabaseMissing('Course', ['id' => 'c2']);
        $this->assertDatabaseHas('Course', ['id' => 'c1']);
        $this->assertDatabaseHas('Course', ['id' => 'c3']);

        // 2. Purge entire Intermediate program
        $res2 = $this->actingAs($admin)->deleteJson('/api/courses?programLevel=INTERMEDIATE&all=true');
        $res2->assertStatus(200);
        $res2->assertJsonFragment(['deletedCount' => 1]);
        $this->assertDatabaseMissing('Course', ['id' => 'c3']);
        $this->assertDatabaseHas('Course', ['id' => 'c1']);
    }
}
