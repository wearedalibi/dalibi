<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AuditLog;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function student(): Student
    {
        $user = User::factory()->create();

        return Student::create([
            'user_id' => $user->id, 'matricule' => 'M'.Str::random(6),
            'firstname' => 'Koffi', 'lastname' => 'Mensah', 'gender' => 'male', 'birth_date' => '2010-01-01',
        ]);
    }

    public function test_create_and_update_are_logged(): void
    {
        $student = $this->student();

        $log = AuditLog::where('auditable_type', Student::class)
            ->where('auditable_id', $student->id)->where('event', 'created')->firstOrFail();
        $this->assertSame('Koffi Mensah', $log->label);
        $this->assertArrayHasKey('firstname', $log->new_values);
        $this->assertArrayNotHasKey('id', $log->new_values);

        $student->update(['firstname' => 'Yao']);

        $update = AuditLog::where('auditable_id', $student->id)->where('event', 'updated')->firstOrFail();
        $this->assertSame('Koffi', $update->old_values['firstname']);
        $this->assertSame('Yao', $update->new_values['firstname']);
    }

    public function test_no_log_when_nothing_meaningful_changes(): void
    {
        $student = $this->student();
        AuditLog::query()->delete();

        $student->touch(); // ne change que updated_at

        $this->assertSame(0, AuditLog::where('event', 'updated')->count());
    }

    public function test_index_requires_permission(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole(Roles::ADMINISTRATOR);
        $this->actingAs($admin)->get(route('audit-logs.index'))->assertOk();

        $teacher = User::factory()->create();
        $teacher->assignRole(Roles::TEACHER);
        $this->actingAs($teacher)->get(route('audit-logs.index'))->assertForbidden();
    }
}
