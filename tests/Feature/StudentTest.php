<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentTest extends TestCase
{
    use RefreshDatabase;

    private const DOB_MALE = '2010-01-01';

    private const DOB_FEMALE = '2011-01-01';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private function user(): User
    {
        // Utilisateur authentifié disposant du droit de consultation des élèves
        $user = User::factory()->create();
        $user->givePermissionTo('view_students');

        return $user;
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

    private function makeStudent(array $overrides = []): Student
    {
        static $counter = 0;
        $counter++;

        return Student::create(array_merge([
            'firstname' => 'Koffi',
            'lastname' => 'Amegah',
            'gender' => 'male',
            'birth_date' => '2010-05-15',
            'user_id' => $this->user()->id,
            'active' => true,
            'matricule' => 'TESSTU'.str_pad($counter, 3, '0', STR_PAD_LEFT),
        ], $overrides));
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'firstname' => 'Koffi',
            'lastname' => 'Amegah',
            'gender' => 'male',
            'birth_date' => '2010-05-15',
            'active' => true,

            'information' => [
                'admission_type' => 'new',
            ],

            'parent' => [
                'father_firstname' => 'Jean',
                'father_lastname' => 'Amegah',
                'mother_firstname' => 'Marie',
                'mother_lastname' => 'Amegah',
            ],

            'medical' => [],
        ], $overrides);
    }

    // ─── Authentification ────────────────────────────────────────────────────

    public function test_guest_cannot_access_students_index(): void
    {
        $this->get(route('students.index'))
            ->assertRedirect(route('login'));
    }

    public function test_guest_cannot_create_student(): void
    {
        $this->post(route('students.store'), $this->validPayload())
            ->assertRedirect(route('login'));
    }

    public function test_guest_cannot_delete_student(): void
    {
        $student = $this->makeStudent();

        $this->delete(route('students.destroy', $student))
            ->assertRedirect(route('login'));

        $this->assertNotSoftDeleted('students', ['id' => $student->id]);
    }

    // ─── Autorisation ────────────────────────────────────────────────────────

    public function test_teacher_cannot_create_student(): void
    {
        $this->actingAs($this->teacher())
            ->post(route('students.store'), $this->validPayload())
            ->assertForbidden();
    }

    public function test_teacher_cannot_delete_student(): void
    {
        $student = $this->makeStudent();

        $this->actingAs($this->teacher())
            ->delete(route('students.destroy', $student))
            ->assertForbidden();

        $this->assertNotSoftDeleted('students', ['id' => $student->id]);
    }

    public function test_teacher_can_view_student(): void
    {
        $student = $this->makeStudent();

        $this->actingAs($this->teacher())
            ->get(route('students.show', $student))
            ->assertOk();
    }

    public function test_teacher_cannot_view_create_form(): void
    {
        $this->actingAs($this->teacher())
            ->get(route('students.create'))
            ->assertForbidden();
    }

    public function test_teacher_cannot_view_edit_form(): void
    {
        $student = $this->makeStudent();

        $this->actingAs($this->teacher())
            ->get(route('students.edit', $student))
            ->assertForbidden();
    }

    public function test_teacher_cannot_bulk_status(): void
    {
        $student = $this->makeStudent(['firstname' => 'A', 'lastname' => 'Bb', 'gender' => 'male', 'birth_date' => self::DOB_MALE]);

        $this->actingAs($this->teacher())
            ->post(route('students.bulk-status'), ['student_ids' => [$student->id], 'action' => 'activate'])
            ->assertForbidden();
    }

    // ─── Index ───────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_students_list(): void
    {
        $this->makeStudent(['firstname' => 'Koffi', 'lastname' => 'Aa', 'gender' => 'male', 'birth_date' => self::DOB_MALE]);
        $this->makeStudent(['firstname' => 'Afi', 'lastname' => 'Bb', 'gender' => 'female', 'birth_date' => self::DOB_FEMALE]);

        $this->actingAs($this->user())
            ->get(route('students.index'))
            ->assertOk();
    }

    public function test_index_can_filter_by_search(): void
    {
        $this->makeStudent(['firstname' => 'Koffi', 'lastname' => 'Mensah', 'gender' => 'male', 'birth_date' => self::DOB_MALE]);
        $this->makeStudent(['firstname' => 'Afi', 'lastname' => 'Togbe', 'gender' => 'female', 'birth_date' => self::DOB_FEMALE]);

        $this->actingAs($this->user())
            ->get(route('students.index', ['search' => 'Mensah']))
            ->assertOk();
    }

    public function test_index_can_filter_by_gender(): void
    {
        $this->actingAs($this->user())
            ->get(route('students.index', ['gender' => 'female']))
            ->assertOk();
    }

    public function test_index_can_filter_by_status_active(): void
    {
        $this->makeStudent(['firstname' => 'Koffi', 'lastname' => 'Aa', 'gender' => 'male', 'birth_date' => self::DOB_MALE, 'active' => true]);
        $this->makeStudent(['firstname' => 'Afi', 'lastname' => 'Bb', 'gender' => 'female', 'birth_date' => self::DOB_FEMALE, 'active' => false]);

        $this->actingAs($this->user())
            ->get(route('students.index', ['status' => 'active']))
            ->assertOk();
    }

    // ─── Create ──────────────────────────────────────────────────────────────

    public function test_admin_can_view_create_form(): void
    {
        $this->actingAs($this->admin())
            ->get(route('students.create'))
            ->assertOk();
    }

    // ─── Store ───────────────────────────────────────────────────────────────

    public function test_admin_can_create_student_with_valid_data(): void
    {
        $this->actingAs($this->admin())
            ->post(route('students.store'), $this->validPayload())
            ->assertRedirect(route('students.index'));

        $this->assertDatabaseHas('students', [
            'firstname' => 'Koffi',
            'lastname' => 'Amegah',
            'gender' => 'male',
        ]);
    }

    public function test_creating_student_also_creates_parent_info(): void
    {
        $this->actingAs($this->admin())
            ->post(route('students.store'), $this->validPayload())
            ->assertRedirect();

        $student = Student::where('firstname', 'Koffi')->first();
        $this->assertNotNull($student);
        $this->assertDatabaseHas('student_parents', [
            'student_id' => $student->id,
            'father_firstname' => 'Jean',
            'mother_firstname' => 'Marie',
        ]);
    }

    public function test_creating_student_also_creates_information(): void
    {
        $this->actingAs($this->admin())
            ->post(route('students.store'), $this->validPayload())
            ->assertRedirect();

        $student = Student::where('firstname', 'Koffi')->first();
        $this->assertDatabaseHas('student_information', [
            'student_id' => $student->id,
            'admission_type' => 'new',
        ]);
    }

    public function test_cannot_create_student_without_firstname(): void
    {
        $this->actingAs($this->admin())
            ->post(route('students.store'), $this->validPayload(['firstname' => '']))
            ->assertSessionHasErrors('firstname');

        $this->assertDatabaseEmpty('students');
    }

    public function test_cannot_create_student_without_lastname(): void
    {
        $this->actingAs($this->admin())
            ->post(route('students.store'), $this->validPayload(['lastname' => '']))
            ->assertSessionHasErrors('lastname');
    }

    public function test_cannot_create_student_with_invalid_gender(): void
    {
        $this->actingAs($this->admin())
            ->post(route('students.store'), $this->validPayload(['gender' => 'unknown']))
            ->assertSessionHasErrors('gender');
    }

    public function test_cannot_create_student_without_birth_date(): void
    {
        $this->actingAs($this->admin())
            ->post(route('students.store'), $this->validPayload(['birth_date' => '']))
            ->assertSessionHasErrors('birth_date');
    }

    public function test_cannot_create_student_with_invalid_admission_type(): void
    {
        $payload = $this->validPayload();
        $payload['information']['admission_type'] = 'invalid';

        $this->actingAs($this->admin())
            ->post(route('students.store'), $payload)
            ->assertSessionHasErrors('information.admission_type');
    }

    public function test_cannot_create_student_with_duplicate_email(): void
    {
        $this->makeStudent([
            'firstname' => 'Afi',
            'lastname' => 'Togbe',
            'gender' => 'female',
            'birth_date' => self::DOB_FEMALE,
            'email' => 'afi@school.tg',
        ]);

        $this->actingAs($this->admin())
            ->post(route('students.store'), $this->validPayload(['email' => 'afi@school.tg']))
            ->assertSessionHasErrors('email');
    }

    // ─── Show ────────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_student_detail(): void
    {
        $student = $this->makeStudent();

        $this->actingAs($this->user())
            ->get(route('students.show', $student))
            ->assertOk();
    }

    // ─── History ─────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_view_student_history(): void
    {
        $student = $this->makeStudent();

        $this->actingAs($this->user())
            ->get(route('students.history', $student))
            ->assertOk();
    }

    // ─── Edit / Update ───────────────────────────────────────────────────────

    public function test_admin_can_view_edit_form(): void
    {
        $student = $this->makeStudent();

        $this->actingAs($this->admin())
            ->get(route('students.edit', $student))
            ->assertOk();
    }

    public function test_admin_can_update_student_with_valid_data(): void
    {
        $student = $this->makeStudent();
        $student->information()->create(['admission_type' => 'new']);
        $student->parentInfo()->create([
            'father_firstname' => 'Jean',
            'father_lastname' => 'Amegah',
            'mother_firstname' => 'Marie',
            'mother_lastname' => 'Amegah',
        ]);
        $student->medicalInfo()->create([]);

        $this->actingAs($this->admin())
            ->put(route('students.update', $student), $this->validPayload(['firstname' => 'Kossi']))
            ->assertRedirect(route('students.index'));

        $this->assertDatabaseHas('students', ['id' => $student->id, 'firstname' => 'Kossi']);
    }

    // ─── Bulk Status ─────────────────────────────────────────────────────────

    public function test_admin_can_bulk_activate_students(): void
    {
        $s1 = $this->makeStudent(['firstname' => 'Aa', 'lastname' => 'Bb', 'gender' => 'male', 'birth_date' => self::DOB_MALE, 'active' => false]);
        $s2 = $this->makeStudent(['firstname' => 'Cc', 'lastname' => 'Dd', 'gender' => 'female', 'birth_date' => self::DOB_FEMALE, 'active' => false]);

        $this->actingAs($this->admin())
            ->post(route('students.bulk-status'), ['student_ids' => [$s1->id, $s2->id], 'action' => 'activate'])
            ->assertRedirect(route('students.index'));

        $this->assertDatabaseHas('students', ['id' => $s1->id, 'active' => true]);
        $this->assertDatabaseHas('students', ['id' => $s2->id, 'active' => true]);
    }

    public function test_admin_can_bulk_deactivate_students(): void
    {
        $s1 = $this->makeStudent(['firstname' => 'Aa', 'lastname' => 'Bb', 'gender' => 'male', 'birth_date' => self::DOB_MALE, 'active' => true]);
        $s2 = $this->makeStudent(['firstname' => 'Cc', 'lastname' => 'Dd', 'gender' => 'female', 'birth_date' => self::DOB_FEMALE, 'active' => true]);

        $this->actingAs($this->admin())
            ->post(route('students.bulk-status'), ['student_ids' => [$s1->id, $s2->id], 'action' => 'deactivate'])
            ->assertRedirect(route('students.index'));

        $this->assertDatabaseHas('students', ['id' => $s1->id, 'active' => false]);
        $this->assertDatabaseHas('students', ['id' => $s2->id, 'active' => false]);
    }

    public function test_bulk_status_requires_valid_action(): void
    {
        $student = $this->makeStudent(['firstname' => 'Aa', 'lastname' => 'Bb', 'gender' => 'male', 'birth_date' => self::DOB_MALE]);

        $this->actingAs($this->admin())
            ->post(route('students.bulk-status'), ['student_ids' => [$student->id], 'action' => 'invalid'])
            ->assertSessionHasErrors('action');
    }

    // ─── Destroy ─────────────────────────────────────────────────────────────

    public function test_admin_can_soft_delete_student(): void
    {
        $student = $this->makeStudent();

        $this->actingAs($this->admin())
            ->delete(route('students.destroy', $student))
            ->assertRedirect(route('students.index'));

        $this->assertSoftDeleted('students', ['id' => $student->id]);
    }

    public function test_soft_deleted_student_not_visible_in_index(): void
    {
        $student = $this->makeStudent();
        $student->delete();

        $this->actingAs($this->user())
            ->get(route('students.index'))
            ->assertOk();

        $this->assertSoftDeleted('students', ['id' => $student->id]);
    }
}
