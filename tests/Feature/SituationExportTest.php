<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Régression (audit F2) : l'export CSV de la situation financière doit
 * neutraliser l'injection de formule. Une cellule texte commençant par
 * = + - @ (ou tab/CR) est préfixée d'une apostrophe pour que le tableur ne
 * l'interprète pas comme une formule.
 */
class SituationExportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function accountant(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Roles::ACCOUNTING);

        return $user;
    }

    public function test_export_neutralizes_csv_formula_injection(): void
    {
        $school = School::factory()->create();
        $year = AcademicYear::create([
            'year' => '2025-2026', 'start_date' => '2025-09-01',
            'end_date' => '2026-07-31', 'active' => true,
        ]);
        $class = Classroom::create([
            'name' => '6ème A', 'code' => '6A', 'capacity' => 40, 'active' => true,
        ]);

        $student = Student::create([
            'firstname' => '=HYPERLINK("http://evil","clic")',
            'lastname' => 'Normal',
            'gender' => 'male', 'birth_date' => '2012-01-01',
            'user_id' => User::factory()->create()->id, 'active' => true,
            'matricule' => '@cmd',
        ]);

        Enrollment::create([
            'school_id' => $school->id, 'student_id' => $student->id,
            'class_id' => $class->id, 'academic_year_id' => $year->id,
            'enrollment_code' => 'ENR-1', 'enrollment_date' => '2025-09-02',
            'status' => 'PENDING',
        ]);

        $response = $this->actingAs($this->accountant())
            ->get(route('accounting.situation.export', ['class_id' => $class->id]));

        $response->assertOk();
        $csv = $response->streamedContent();

        // Les cellules dangereuses sont préfixées d'une apostrophe …
        $this->assertStringContainsString("'=HYPERLINK", $csv);
        $this->assertStringContainsString("'@cmd", $csv);
        // … et la formule brute n'apparaît jamais en début de cellule.
        $this->assertStringNotContainsString(';=HYPERLINK', $csv);
        $this->assertStringNotContainsString("\xEF\xBB\xBF=HYPERLINK", $csv);
    }

    public function test_export_leaves_plain_values_untouched(): void
    {
        $school = School::factory()->create();
        $year = AcademicYear::create([
            'year' => '2025-2026', 'start_date' => '2025-09-01',
            'end_date' => '2026-07-31', 'active' => true,
        ]);
        $class = Classroom::create([
            'name' => '6ème A', 'code' => '6A', 'capacity' => 40, 'active' => true,
        ]);

        $student = Student::create([
            'firstname' => 'Awa', 'lastname' => 'Koffi',
            'gender' => 'female', 'birth_date' => '2012-01-01',
            'user_id' => User::factory()->create()->id, 'active' => true,
            'matricule' => 'M001',
        ]);

        Enrollment::create([
            'school_id' => $school->id, 'student_id' => $student->id,
            'class_id' => $class->id, 'academic_year_id' => $year->id,
            'enrollment_code' => 'ENR-2', 'enrollment_date' => '2025-09-02',
            'status' => 'PENDING',
        ]);

        $csv = $this->actingAs($this->accountant())
            ->get(route('accounting.situation.export', ['class_id' => $class->id]))
            ->streamedContent();

        $this->assertStringContainsString('M001', $csv);
        $this->assertStringContainsString('Koffi', $csv);
        $this->assertStringNotContainsString("'M001", $csv);
        $this->assertStringNotContainsString("'Koffi", $csv);
    }

    public function test_export_forbidden_without_view_finances(): void
    {
        $class = Classroom::create([
            'name' => '6ème A', 'code' => '6A', 'capacity' => 40, 'active' => true,
        ]);

        $teacher = User::factory()->create();
        $teacher->assignRole(Roles::TEACHER);

        $this->actingAs($teacher)
            ->get(route('accounting.situation.export', ['class_id' => $class->id]))
            ->assertForbidden();
    }
}
