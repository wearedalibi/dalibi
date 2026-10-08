<?php

namespace Tests\Feature;

use App\Models\AcademicPeriod;
use App\Models\AcademicYear;
use App\Models\ClassroomType;
use App\Models\School;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PeriodResolverTest extends TestCase
{
    use RefreshDatabase;

    private function year(): AcademicYear
    {
        $school = School::factory()->create();

        return AcademicYear::create([
            'school_id' => $school->id,
            'year' => '2025-2026',
            'start_date' => '2025-09-01',
            'end_date' => '2026-07-31',
            'active' => true,
        ]);
    }

    private function period(string $yearId, string $name, int $order, ?string $classTypeId = null): AcademicPeriod
    {
        return AcademicPeriod::create([
            'name' => $name,
            'start_date' => '2025-09-01',
            'end_date' => '2025-12-31',
            'type' => 'trimestre',
            'order' => $order,
            'weight' => 1,
            'academic_year_id' => $yearId,
            'class_type_id' => $classTypeId,
        ]);
    }

    public function test_returns_global_periods_when_no_type_specific(): void
    {
        $year = $this->year();
        $this->period($year->id, 'Trimestre 1', 1);
        $this->period($year->id, 'Trimestre 2', 2);

        $periods = AcademicPeriod::forClassType($year->id, null);

        $this->assertCount(2, $periods);
    }

    public function test_returns_type_specific_periods_when_they_exist(): void
    {
        $year = $this->year();
        $type = ClassroomType::create(['name' => 'Lycée', 'period_system' => 'trimestre', 'active' => true]);

        // 2 périodes globales + 3 spécifiques au type
        $this->period($year->id, 'Global 1', 1);
        $this->period($year->id, 'Global 2', 2);
        $this->period($year->id, 'Spé 1', 1, $type->id);
        $this->period($year->id, 'Spé 2', 2, $type->id);
        $this->period($year->id, 'Spé 3', 3, $type->id);

        $periods = AcademicPeriod::forClassType($year->id, $type->id);

        $this->assertCount(3, $periods);
        $this->assertTrue($periods->every(fn ($p) => $p->class_type_id === $type->id));
    }

    public function test_falls_back_to_global_when_type_has_no_specific_periods(): void
    {
        $year = $this->year();
        $type = ClassroomType::create(['name' => 'Collège', 'period_system' => 'semestre', 'active' => true]);

        $this->period($year->id, 'Global 1', 1);
        $this->period($year->id, 'Global 2', 2);

        $periods = AcademicPeriod::forClassType($year->id, $type->id);

        $this->assertCount(2, $periods);
        $this->assertTrue($periods->every(fn ($p) => $p->class_type_id === null));
    }
}
