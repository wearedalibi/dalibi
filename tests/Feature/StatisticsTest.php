<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AcademicPeriod;
use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\AttendanceRecord;
use App\Models\Classroom;
use App\Models\ClassroomType;
use App\Models\Enrollment;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use App\Services\StatisticsService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class StatisticsTest extends TestCase
{
    use RefreshDatabase;

    private School $school;

    private AcademicYear $year;

    private Classroom $class;

    private ClassroomType $type;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->school = School::factory()->create();
        $this->year = AcademicYear::create(['year' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-07-31', 'active' => true]);
        $this->type = ClassroomType::factory()->create(['period_system' => 'trimestre']);
        $this->class = Classroom::factory()->create(['classroom_type_id' => $this->type->id]);
    }

    private function enrolled(string $gender, string $academicStatus, ?string $region = null): Student
    {
        $u = User::factory()->create();
        $s = Student::create(['user_id' => $u->id, 'matricule' => 'M'.Str::random(6), 'firstname' => 'A', 'lastname' => Str::random(5), 'gender' => $gender, 'birth_date' => '2010-01-01', 'region' => $region]);
        Enrollment::create([
            'school_id' => $this->school->id, 'student_id' => $s->id, 'class_id' => $this->class->id,
            'academic_year_id' => $this->year->id, 'enrollment_code' => 'E'.Str::random(8),
            'enrollment_date' => now(), 'status' => 'ACTIVE', 'academic_status' => $academicStatus,
        ]);

        return $s;
    }

    private function staff(string $role): User
    {
        $u = User::factory()->create();
        $u->assignRole($role);

        return $u;
    }

    public function test_page_requires_view_permission(): void
    {
        $this->actingAs(User::factory()->create())->get('/statistiques')->assertForbidden();
        $this->actingAs($this->staff(Roles::DIRECTOR))->get('/statistiques')->assertOk();
    }

    public function test_enrollment_aggregates_are_correct(): void
    {
        $this->enrolled('male', 'valide');
        $this->enrolled('male', 'valide');
        $this->enrolled('female', 'non_valide');
        $this->enrolled('female', 'abandon');

        $stats = app(StatisticsService::class)->enrollmentStats(['academic_year_id' => $this->year->id]);

        $this->assertSame(4, $stats['total']);
        $this->assertSame(2, $stats['gender']['male']);
        $this->assertSame(2, $stats['gender']['female']);
        $this->assertSame(1.0, $stats['ips']);            // 2 filles / 2 garçons
        $this->assertSame(50.0, $stats['rates']['promotion']);     // 2 valide / 4 décidés
        $this->assertSame(25.0, $stats['rates']['redoublement']);  // 1 non_valide / 4
        $this->assertSame(25.0, $stats['rates']['abandon']);       // 1 abandon / 4
    }

    public function test_resources_aggregates_are_correct(): void
    {
        $this->enrolled('male', 'valide');
        $this->enrolled('female', 'valide');
        $this->enrolled('male', 'en_cours');
        $this->enrolled('female', 'en_cours');

        $stats = app(StatisticsService::class)->resourcesStats(['academic_year_id' => $this->year->id]);

        $this->assertSame(4, $stats['total_students']);
        $this->assertSame(0, $stats['total_teachers']);
        $this->assertNull($stats['rem']);                 // aucun enseignant affecté
        $this->assertSame(1, $stats['class_count']);
        $this->assertSame(4.0, $stats['avg_class_size']);
        $this->assertCount(0, $stats['overcrowded']);     // 4 < seuil 50
    }

    public function test_attendance_aggregates_are_correct(): void
    {
        $period = AcademicPeriod::create(['name' => 'Trimestre 1', 'start_date' => '2025-09-01', 'end_date' => '2025-12-31', 'type' => 'trimestre', 'order' => 1, 'weight' => 1, 'is_current' => true, 'academic_year_id' => $this->year->id, 'class_type_id' => $this->type->id]);
        $s1 = $this->enrolled('male', 'en_cours');
        $s2 = $this->enrolled('female', 'en_cours');
        $att = Attendance::create(['class_id' => $this->class->id, 'academic_period_id' => $period->id, 'date' => '2025-10-01', 'session' => 'journee']);
        AttendanceRecord::create(['attendance_id' => $att->id, 'student_id' => $s1->id, 'status' => 'present']);
        AttendanceRecord::create(['attendance_id' => $att->id, 'student_id' => $s2->id, 'status' => 'absent']);

        $stats = app(StatisticsService::class)->attendanceStats(['academic_year_id' => $this->year->id]);

        $this->assertSame(2, $stats['total']);
        $this->assertSame(1, $stats['present']);
        $this->assertSame(1, $stats['absent']);
        $this->assertSame(50.0, $stats['presence_rate']);
        $this->assertSame(50.0, $stats['absence_rate']);
    }

    public function test_trends_include_current_year(): void
    {
        $this->enrolled('male', 'valide');
        $this->enrolled('female', 'valide');

        $stats = app(StatisticsService::class)->trendsStats();
        $current = collect($stats['series'])->firstWhere('year', $this->year->year);

        $this->assertNotNull($current);
        $this->assertSame(2, $current['effectif']);
    }

    public function test_over_age_is_computed_from_class_expected_age(): void
    {
        $this->class->update(['expected_age' => 12]);
        // Élèves nés en 2010 → ~16 ans, soit +4 par rapport à 12 → sur-âge.
        $this->enrolled('male', 'en_cours');
        $this->enrolled('female', 'en_cours');

        $stats = app(StatisticsService::class)->enrollmentStats(['academic_year_id' => $this->year->id]);

        $this->assertSame(2, $stats['over_age']['evaluated']);
        $this->assertSame(2, $stats['over_age']['count']);
        $this->assertSame(100.0, $stats['over_age']['rate']);
    }

    public function test_geography_aggregates_by_region(): void
    {
        $this->enrolled('male', 'en_cours', 'Maritime');
        $this->enrolled('female', 'en_cours', 'Maritime');
        $this->enrolled('male', 'en_cours', 'Kara');
        $this->enrolled('female', 'en_cours', null); // non renseigné

        $stats = app(StatisticsService::class)->geographyStats(['academic_year_id' => $this->year->id]);

        $this->assertSame(4, $stats['total']);
        $this->assertSame(3, $stats['localized']);
        $this->assertSame(75.0, $stats['coverage']);
        $byRegion = collect($stats['by_region']);
        $this->assertSame(2, $byRegion->firstWhere('name', 'Maritime')['total']);
        $this->assertSame(1, $byRegion->firstWhere('name', 'Kara')['total']);
    }

    public function test_export_requires_export_permission(): void
    {
        $this->enrolled('female', 'valide');

        // Vue autorisée mais pas l'export → 403
        $viewer = User::factory()->create();
        $viewer->givePermissionTo('view_statistics');
        $this->actingAs($viewer)->get('/statistiques/effectifs/export/pdf')->assertForbidden();
    }

    public function test_director_can_export_pdf_and_xlsx(): void
    {
        $this->enrolled('female', 'valide');
        $director = $this->staff(Roles::DIRECTOR);

        $pdf = $this->actingAs($director)->get('/statistiques/effectifs/export/pdf');
        $pdf->assertOk();
        $this->assertSame('application/pdf', $pdf->headers->get('content-type'));

        $xlsx = $this->actingAs($director)->get('/statistiques/effectifs/export/xlsx');
        $xlsx->assertOk();
        $this->assertStringContainsString('spreadsheet', (string) $xlsx->headers->get('content-type'));
    }
}
