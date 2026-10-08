<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use App\Services\ReportCardBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Garde-fou sur la casse du statut d'inscription.
 *
 * La base impose `status IN ('PENDING','ACTIVE','CANCELLED')`. Plusieurs
 * requêtes comparaient à `'active'` en minuscules et ne remontaient donc
 * AUCUNE ligne : liste d'élèves vide à la saisie des notes, bulletins sans
 * élèves, portail parents vide. Ces tests figent l'invariant.
 */
class EnrollmentStatusTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;

    private function enrollment(string $status = Enrollment::STATUS_ACTIVE): Enrollment
    {
        $suffix = 'S'.str_pad((string) ++$this->seq, 3, '0', STR_PAD_LEFT);

        // Contexte partagé : une seule école / année / classe pour tout le test.
        $school = School::query()->first() ?? School::factory()->create();
        $year = AcademicYear::query()->first() ?? AcademicYear::create([
            'year' => '2025-2026', 'start_date' => '2025-09-01',
            'end_date' => '2026-07-31', 'active' => true,
        ]);
        $class = Classroom::query()->first() ?? Classroom::create([
            'name' => '6ème A', 'code' => '6A', 'capacity' => 40, 'active' => true,
        ]);
        $student = Student::create([
            'firstname' => 'Ama', 'lastname' => 'Koffi', 'gender' => 'female', 'birth_date' => '2012-01-01',
            'user_id' => User::factory()->create()->id, 'active' => true, 'matricule' => $suffix,
        ]);

        return Enrollment::create([
            'school_id' => $school->id, 'student_id' => $student->id,
            'class_id' => $class->id, 'academic_year_id' => $year->id,
            'enrollment_code' => 'ENR-'.$suffix, 'enrollment_date' => '2025-09-02',
            'status' => $status,
        ]);
    }

    public function test_statuses_are_uppercase(): void
    {
        $this->assertSame('ACTIVE', Enrollment::STATUS_ACTIVE);
        $this->assertSame(['PENDING', 'ACTIVE', 'CANCELLED'], Enrollment::STATUSES);
    }

    public function test_lowercase_status_matches_nothing(): void
    {
        $this->enrollment();

        // Le piège historique : comparer à 'active' ne remonte rien.
        $this->assertSame(0, Enrollment::where('status', 'active')->count());
        $this->assertSame(1, Enrollment::where('status', Enrollment::STATUS_ACTIVE)->count());
    }

    public function test_active_scope_finds_active_enrollments_only(): void
    {
        $this->enrollment(Enrollment::STATUS_ACTIVE);
        $this->enrollment(Enrollment::STATUS_CANCELLED);

        $this->assertSame(1, Enrollment::active()->count());
    }

    public function test_report_card_builder_finds_enrolled_students(): void
    {
        $enrollment = $this->enrollment();

        $students = app(ReportCardBuilder::class)
            ->activeStudents($enrollment->class_id, $enrollment->academic_year_id);

        $this->assertCount(1, $students);
        $this->assertSame($enrollment->student_id, $students->first()->id);
    }
}
