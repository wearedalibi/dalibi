<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\Classroom;
use App\Models\Subject;
use App\Models\TimetableSlot;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TimetableTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Roles::ADMINISTRATOR);

        return $user;
    }

    private function teacher(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Roles::TEACHER);

        return $user;
    }

    private function classroom(): Classroom
    {
        return Classroom::create(['name' => 'CM2-A', 'code' => 'CM2A', 'capacity' => 30]);
    }

    private function subject(): Subject
    {
        return Subject::create(['name' => 'Mathématiques', 'code' => 'MATH']);
    }

    private function slot(Classroom $class, array $overrides = []): TimetableSlot
    {
        return TimetableSlot::create(array_merge([
            'class_id' => $class->id,
            'day_of_week' => 1,
            'start_time' => '08:00',
            'end_time' => '09:00',
            'room' => 'Salle 1',
        ], $overrides));
    }

    private function validPayload(Classroom $class, array $overrides = []): array
    {
        return array_merge([
            'class_id' => $class->id,
            'day_of_week' => 1,
            'start_time' => '08:00',
            'end_time' => '09:00',
            'room' => 'Salle 12',
        ], $overrides);
    }

    // ─── Accès ───────────────────────────────────────────────────────────────

    public function test_guest_cannot_access_timetable(): void
    {
        $this->get(route('timetable.index'))->assertRedirect(route('login'));
    }

    public function test_authenticated_user_can_view_timetable(): void
    {
        $this->actingAs($this->teacher())
            ->get(route('timetable.index'))
            ->assertOk();
    }

    public function test_teacher_cannot_create_slot(): void
    {
        $class = $this->classroom();

        $this->actingAs($this->teacher())
            ->post(route('timetable.store'), $this->validPayload($class))
            ->assertForbidden();
    }

    // ─── CRUD ────────────────────────────────────────────────────────────────

    public function test_admin_can_create_slot(): void
    {
        $class = $this->classroom();
        $subject = $this->subject();

        $this->actingAs($this->admin())
            ->post(route('timetable.store'), $this->validPayload($class, ['subject_id' => $subject->id]))
            ->assertRedirect();

        $this->assertDatabaseHas('timetable_slots', [
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'room' => 'Salle 12',
        ]);
    }

    public function test_create_requires_class(): void
    {
        $this->actingAs($this->admin())
            ->post(route('timetable.store'), ['day_of_week' => 1, 'start_time' => '08:00', 'end_time' => '09:00'])
            ->assertSessionHasErrors('class_id');
    }

    public function test_end_time_must_be_after_start_time(): void
    {
        $class = $this->classroom();

        $this->actingAs($this->admin())
            ->post(route('timetable.store'), $this->validPayload($class, ['start_time' => '10:00', 'end_time' => '09:00']))
            ->assertSessionHasErrors('end_time');
    }

    public function test_day_of_week_out_of_range_is_rejected(): void
    {
        $class = $this->classroom();

        $this->actingAs($this->admin())
            ->post(route('timetable.store'), $this->validPayload($class, ['day_of_week' => 8]))
            ->assertSessionHasErrors('day_of_week');
    }

    public function test_admin_can_update_slot(): void
    {
        $class = $this->classroom();
        $slot = $this->slot($class);

        $this->actingAs($this->admin())
            ->put(route('timetable.update', $slot), $this->validPayload($class, ['room' => 'Salle 99']))
            ->assertRedirect();

        $this->assertDatabaseHas('timetable_slots', ['id' => $slot->id, 'room' => 'Salle 99']);
    }

    public function test_admin_can_delete_slot(): void
    {
        $class = $this->classroom();
        $slot = $this->slot($class);

        $this->actingAs($this->admin())
            ->delete(route('timetable.destroy', $slot))
            ->assertRedirect();

        $this->assertDatabaseMissing('timetable_slots', ['id' => $slot->id]);
    }

    // ─── Export ────────────────────────────────────────────────────────────────

    public function test_export_returns_pdf(): void
    {
        $class = $this->classroom();
        $this->slot($class, ['subject_id' => $this->subject()->id]);

        $response = $this->actingAs($this->admin())
            ->get(route('timetable.export', $class->id));

        $response->assertOk();
        $this->assertEquals('application/pdf', $response->headers->get('content-type'));
    }
}
