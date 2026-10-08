<?php

namespace Tests\Unit;

use App\Constants\Roles;
use App\Models\User;
use App\Services\MatriculeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MatriculeServiceTest extends TestCase
{
    use RefreshDatabase;

    protected MatriculeService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(MatriculeService::class);
    }

    /** @test */
    public function it_generates_user_matricule_with_correct_format()
    {
        $matricule = $this->service->generateUserMatricule(Roles::TEACHER);

        $this->assertMatchesRegularExpression('/^[A-Z]{3,4}[0-9]{2}[0-9]{3}$/', $matricule);
    }

    /** @test */
    public function it_generates_different_prefixes_for_different_roles()
    {
        $adminMatricule = $this->service->generateUserMatricule(Roles::ADMINISTRATOR);
        $teacherMatricule = $this->service->generateUserMatricule(Roles::TEACHER);
        $accountingMatricule = $this->service->generateUserMatricule(Roles::ACCOUNTING);

        $this->assertStringStartsWith('ADM', $adminMatricule);
        $this->assertStringStartsWith('PROF', $teacherMatricule);
        $this->assertStringStartsWith('COMPT', $accountingMatricule);
    }

    /** @test */
    public function it_includes_current_year_in_matricule()
    {
        $currentYear = date('y');
        $matricule = $this->service->generateUserMatricule(Roles::TEACHER);

        $this->assertStringContainsString($currentYear, $matricule);
    }

    /** @test */
    public function it_generates_student_matricule_with_correct_format()
    {
        $matricule = $this->service->generateStudentMatricule('ECOL', 'CM1A');

        $this->assertMatchesRegularExpression('/^[A-Z]{3,4}STU[0-9]{2}[0-9]{3}$/', $matricule);
    }

    /** @test */
    public function it_parses_user_matricule_correctly()
    {
        $matricule = 'PROF26001';
        $parsed = $this->service->parseMatricule($matricule);

        $this->assertEquals('PROF', $parsed['prefix']);
        $this->assertEquals('2026', $parsed['year']);
        $this->assertEquals(1, $parsed['sequence']);
    }

    /** @test */
    public function it_parses_admin_matricule_correctly()
    {
        $matricule = 'ADM26005';
        $parsed = $this->service->parseMatricule($matricule);

        $this->assertEquals('ADM', $parsed['prefix']);
        $this->assertEquals('2026', $parsed['year']);
        $this->assertEquals(5, $parsed['sequence']);
    }

    /** @test */
    public function it_parses_accounting_matricule_correctly()
    {
        $matricule = 'COMPT26010';
        $parsed = $this->service->parseMatricule($matricule);

        $this->assertEquals('COMPT', $parsed['prefix']);
        $this->assertEquals('2026', $parsed['year']);
        $this->assertEquals(10, $parsed['sequence']);
    }

    /** @test */
    public function it_returns_role_from_matricule()
    {
        $this->assertEquals(Roles::TEACHER, $this->service->getRoleFromMatricule('PROF26001'));
        $this->assertEquals(Roles::ADMINISTRATOR, $this->service->getRoleFromMatricule('ADM26001'));
        $this->assertEquals(Roles::DIRECTOR, $this->service->getRoleFromMatricule('DIR26001'));
        $this->assertEquals(Roles::ACCOUNTING, $this->service->getRoleFromMatricule('COMPT26001'));
        $this->assertEquals(Roles::SECRETARIAT, $this->service->getRoleFromMatricule('SEC26001'));
    }

    /** @test */
    public function it_checks_matricule_existence()
    {
        // Assuming the database is empty in tests
        $this->assertFalse($this->service->matriculeExists('PROF26001'));
    }

    /** @test */
    public function it_returns_all_role_prefixes()
    {
        $prefixes = MatriculeService::getPrefixes();

        $this->assertIsArray($prefixes);
        $this->assertArrayHasKey(Roles::ADMINISTRATOR, $prefixes);
        $this->assertArrayHasKey(Roles::TEACHER, $prefixes);
        $this->assertArrayHasKey(Roles::DIRECTOR, $prefixes);
        $this->assertArrayHasKey(Roles::ACCOUNTING, $prefixes);
        $this->assertArrayHasKey(Roles::SECRETARIAT, $prefixes);
    }

    /** @test */
    public function it_returns_correct_prefix_for_each_role()
    {
        $prefixes = MatriculeService::getPrefixes();

        $this->assertEquals('ADM', $prefixes[Roles::ADMINISTRATOR]);
        $this->assertEquals('DIR', $prefixes[Roles::DIRECTOR]);
        $this->assertEquals('PROF', $prefixes[Roles::TEACHER]);
        $this->assertEquals('COMPT', $prefixes[Roles::ACCOUNTING]);
        $this->assertEquals('SEC', $prefixes[Roles::SECRETARIAT]);
    }

    /** @test */
    public function it_validates_matricule_format()
    {
        $this->assertTrue($this->service->isValidMatriculeFormat('ADM26001'));
        $this->assertTrue($this->service->isValidMatriculeFormat('PROF26001'));
        $this->assertTrue($this->service->isValidMatriculeFormat('COMPT26001'));

        $this->assertFalse($this->service->isValidMatriculeFormat('INVALID'));
        $this->assertFalse($this->service->isValidMatriculeFormat('ADM2600'));
        $this->assertFalse($this->service->isValidMatriculeFormat('ADM260001'));
    }

    /** @test */
    public function it_generates_unique_matricules()
    {
        // La séquence dépend du nombre d'utilisateurs existants : on persiste
        // le premier matricule avant de générer le second.
        $matricule1 = $this->service->generateUserMatricule(Roles::TEACHER);
        User::factory()->create(['natricule' => $matricule1]);

        $matricule2 = $this->service->generateUserMatricule(Roles::TEACHER);

        $this->assertNotEquals($matricule1, $matricule2);
    }

    /** @test */
    public function student_matricule_includes_school_code()
    {
        $schoolCode = 'LOM';
        $matricule = $this->service->generateStudentMatricule($schoolCode);

        $this->assertStringStartsWith($schoolCode, $matricule);
        $this->assertStringContainsString('STU', $matricule);
    }
}
