<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Admin;

use Illuminate\Support\Facades\Schema;

class DisciplineTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!Schema::hasTable('SystemSettings')) {
            Schema::create('SystemSettings', function ($table) {
                $table->string('id')->primary();
                $table->string('key')->unique();
                $table->text('value');
                $table->timestamp('createdAt')->nullable();
                $table->timestamp('updatedAt')->nullable();
            });
        }
        if (!Schema::hasTable('Course')) {
            Schema::create('Course', function ($table) {
                $table->string('id')->primary();
                $table->string('courseCode');
                $table->string('courseName');
                $table->string('department');
                $table->string('discipline')->nullable();
                $table->timestamp('createdAt')->nullable();
                $table->timestamp('updatedAt')->nullable();
            });
        }
        if (!Schema::hasTable('Student')) {
            Schema::create('Student', function ($table) {
                $table->string('id')->primary();
                $table->string('department');
                $table->string('discipline')->nullable();
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
    }
    public function test_can_list_default_disciplines(): void
    {
        $user = new User(['id' => 'test-user', 'role' => 'STUDENT']);
        $response = $this->actingAs($user)->getJson('/api/disciplines');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'disciplines',
            'defaults',
            'customs',
        ]);
        $response->assertJsonFragment(['name' => 'F.Sc Pre-Engineering']);
        $response->assertJsonFragment(['name' => 'ICS']);
    }

    public function test_rejects_duplicate_discipline(): void
    {
        $adminUser = new User([
            'id' => 'test-admin-id',
            'role' => 'ADMIN',
            'name' => 'Test Admin',
            'email' => 'admin@test.com',
        ]);
        $admin = new Admin([
            'id' => 'test-admin-rec',
            'userId' => 'test-admin-id',
            'adminType' => 'BRANCH_ADMIN',
        ]);
        $adminUser->setRelation('admin', $admin);

        // Standard discipline already exists
        $response = $this->actingAs($adminUser)->postJson('/api/disciplines', [
            'name' => 'ICS',
        ]);
        $response->assertStatus(422);
        $response->assertJsonFragment(['error' => "Discipline 'ICS' already exists."]);
    }

    public function test_standard_discipline_cannot_be_deleted(): void
    {
        $adminUser = new User([
            'id' => 'test-admin-id',
            'role' => 'ADMIN',
            'name' => 'Test Admin',
            'email' => 'admin@test.com',
        ]);
        $admin = new Admin([
            'id' => 'test-admin-rec',
            'userId' => 'test-admin-id',
            'adminType' => 'BRANCH_ADMIN',
        ]);
        $adminUser->setRelation('admin', $admin);

        $response = $this->actingAs($adminUser)->deleteJson('/api/disciplines/' . urlencode('F.Sc Pre-Medical'));
        $response->assertStatus(422);
        $response->assertJsonFragment(['error' => 'Standard board disciplines cannot be deleted.']);
    }

    public function test_can_create_and_delete_custom_discipline(): void
    {
        $adminUser = new User([
            'id' => 'test-admin-id',
            'role' => 'ADMIN',
            'name' => 'Test Admin',
            'email' => 'admin@test.com',
        ]);
        $admin = new Admin([
            'id' => 'test-admin-rec',
            'userId' => 'test-admin-id',
            'adminType' => 'BRANCH_ADMIN',
        ]);
        $adminUser->setRelation('admin', $admin);

        // 1. Create custom discipline
        $createRes = $this->actingAs($adminUser)->postJson('/api/disciplines', [
            'name' => 'General Science',
            'subjectSetsCount' => 2,
        ]);
        $createRes->assertStatus(201);
        $createRes->assertJsonFragment(['name' => 'General Science']);
        $createRes->assertJsonFragment(['subjectSets' => ['Set 1', 'Set 2']]);

        // 2. Verify it appears in index
        $listRes = $this->actingAs($adminUser)->getJson('/api/disciplines');
        $listRes->assertStatus(200);
        $listRes->assertJsonFragment(['name' => 'General Science']);

        // 3. Delete custom discipline
        $delRes = $this->actingAs($adminUser)->deleteJson('/api/disciplines/' . urlencode('General Science'));
        $delRes->assertStatus(200);
        $delRes->assertJsonFragment(['message' => "Discipline 'General Science' deleted successfully."]);
    }
}
