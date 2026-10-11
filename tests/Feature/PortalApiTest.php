<?php

namespace Tests\Feature;

use App\Models\AcademicPeriod;
use App\Models\AcademicYear;
use App\Models\BulletinTemplate;
use App\Models\Classroom;
use App\Models\ClassroomType;
use App\Models\Enrollment;
use App\Models\Guardian;
use App\Models\ReportCard;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PortalApiTest extends TestCase
{
    use RefreshDatabase;

    private School $school;

    private AcademicYear $year;

    private Classroom $class;

    private AcademicPeriod $period;

    protected function setUp(): void
    {
        parent::setUp();
        $this->school = School::factory()->create();
        $this->year = AcademicYear::create(['year' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-07-31', 'active' => true]);
        $type = ClassroomType::factory()->create(['period_system' => 'trimestre']);
        $this->class = Classroom::factory()->create(['classroom_type_id' => $type->id]);
        $this->period = AcademicPeriod::create(['name' => 'Trimestre 1', 'start_date' => '2025-09-01', 'end_date' => '2025-12-31', 'type' => 'trimestre', 'order' => 1, 'weight' => 1, 'is_current' => true, 'academic_year_id' => $this->year->id, 'class_type_id' => $type->id]);
    }

    private function student(): Student
    {
        $u = User::factory()->create();
        $s = Student::create(['user_id' => $u->id, 'matricule' => 'M'.Str::random(6), 'firstname' => 'A', 'lastname' => Str::random(5), 'gender' => 'male', 'birth_date' => '2010-01-01']);
        Enrollment::create(['school_id' => $this->school->id, 'student_id' => $s->id, 'class_id' => $this->class->id, 'academic_year_id' => $this->year->id, 'enrollment_code' => 'E'.Str::random(8), 'enrollment_date' => now(), 'status' => 'ACTIVE']);

        return $s;
    }

    private function guardianFor(Student ...$children): Guardian
    {
        $g = Guardian::create(['first_name' => 'P', 'last_name' => Str::random(5), 'email' => Str::random(8).'@ex.com', 'is_active' => true]);
        $g->password = 'secret123';
        $g->save();
        $g->children()->attach(collect($children)->pluck('id'));

        return $g;
    }

    public function test_guardian_login_returns_token(): void
    {
        $g = $this->guardianFor($this->student());

        $res = $this->postJson('/api/v1/auth/login', ['login' => $g->email, 'password' => 'secret123']);
        $res->assertOk()->assertJsonStructure(['token', 'type', 'user' => ['id', 'name', 'email']]);
        $this->assertSame('guardian', $res->json('type'));

        $this->postJson('/api/v1/auth/login', ['login' => $g->email, 'password' => 'wrong'])->assertStatus(422);
    }

    public function test_guardian_can_only_access_own_children(): void
    {
        $childA = $this->student();
        $childB = $this->student();
        $guardianA = $this->guardianFor($childA);

        Sanctum::actingAs($guardianA, ['read']);

        // Liste : uniquement son enfant
        $this->getJson('/api/v1/children')->assertOk()->assertJsonCount(1, 'data');

        // Son enfant : OK ; l'enfant d'un autre : 404 (pas de fuite)
        $this->getJson("/api/v1/children/{$childA->id}/grades")->assertOk();
        $this->getJson("/api/v1/children/{$childB->id}/grades")->assertNotFound();
        $this->getJson("/api/v1/children/{$childB->id}/bulletins")->assertNotFound();
    }

    public function test_student_can_only_access_self(): void
    {
        $me = $this->student();
        $other = $this->student();

        Sanctum::actingAs($me, ['read']);

        $this->getJson("/api/v1/children/{$me->id}/grades")->assertOk();
        $this->getJson("/api/v1/children/{$other->id}/grades")->assertForbidden();
    }

    public function test_guardian_dashboard_summarizes_all_children(): void
    {
        $guardian = $this->guardianFor($this->student(), $this->student());
        Sanctum::actingAs($guardian, ['read']);

        $this->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonCount(2, 'children')
            ->assertJsonStructure([
                'year',
                'children' => [[
                    'id', 'name', 'matricule', 'class', 'enrolled', 'average', 'rank', 'mention',
                    'attendance' => ['present', 'absent', 'late', 'excused', 'total', 'rate'],
                    'fees' => ['billed', 'paid', 'balance'],
                    'latest_bulletin',
                ]],
                'upcoming_events',
            ]);
    }

    public function test_student_dashboard_returns_self_only(): void
    {
        $me = $this->student();
        Sanctum::actingAs($me, ['read']);

        $res = $this->getJson('/api/v1/dashboard')->assertOk()->assertJsonCount(1, 'children');
        $this->assertSame($me->id, $res->json('children.0.id'));
    }

    public function test_bulletin_pdf_is_scoped(): void
    {
        $childA = $this->student();
        $childB = $this->student();
        $guardianA = $this->guardianFor($childA);

        $card = $this->reportCardFor($childA);
        $cardB = $this->reportCardFor($childB);

        Sanctum::actingAs($guardianA, ['read']);

        $this->getJson("/api/v1/children/{$childA->id}/bulletins")->assertOk()->assertJsonCount(1, 'data');

        $ok = $this->get("/api/v1/children/{$childA->id}/bulletins/{$card->id}/pdf");
        $ok->assertOk();
        $this->assertSame('application/pdf', $ok->headers->get('content-type'));

        // Bulletin d'un autre enfant : refusé
        $this->get("/api/v1/children/{$childB->id}/bulletins/{$cardB->id}/pdf")->assertNotFound();
    }

    public function test_unauthenticated_is_rejected(): void
    {
        $this->getJson('/api/v1/children')->assertUnauthorized();
    }

    public function test_attendance_fees_calendar_endpoints(): void
    {
        $childA = $this->student();
        $childB = $this->student();
        $guardianA = $this->guardianFor($childA);

        Sanctum::actingAs($guardianA, ['read']);

        $this->getJson("/api/v1/children/{$childA->id}/attendance")
            ->assertOk()->assertJsonStructure(['present', 'absent', 'late', 'excused', 'total']);

        $this->getJson("/api/v1/children/{$childA->id}/fees")
            ->assertOk()->assertJsonStructure(['summary' => ['billed', 'paid', 'balance'], 'invoices']);

        $this->getJson('/api/v1/calendar')->assertOk()->assertJsonStructure(['data']);

        // Scope : enfant d'un autre tuteur
        $this->getJson("/api/v1/children/{$childB->id}/attendance")->assertNotFound();
        $this->getJson("/api/v1/children/{$childB->id}/fees")->assertNotFound();
    }

    private function reportCardFor(Student $student): ReportCard
    {
        return ReportCard::create([
            'student_id' => $student->id,
            'academic_period_id' => $this->period->id,
            'class_id' => $this->class->id,
            'academic_year_id' => $this->year->id,
            'reference' => 'BUL-'.Str::random(6),
            'average' => 12.5, 'rank' => 1, 'mention' => 'Bien',
            'locked_at' => now(),
            'payload' => [
                'student' => ['name' => $student->lastname, 'matricule' => $student->matricule],
                'class' => ['name' => $this->class->name],
                'period' => ['name' => 'Trimestre 1', 'system' => 'trimestre'],
                'year' => '2025-2026', 'effectif' => 10, 'absences' => 0,
                'lines' => [], 'total_coeff' => 0, 'total_points' => 0,
                'average' => 12.5, 'rank' => 1, 'mention' => 'Bien', 'observations' => '',
                'template' => ['columns' => BulletinTemplate::defaultColumns(), 'options' => BulletinTemplate::defaultOptions()],
            ],
        ]);
    }
}
