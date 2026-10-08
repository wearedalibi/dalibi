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

class StudentModuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function admin(): User
    {
        $u = User::factory()->create();
        $u->assignRole(Roles::ADMINISTRATOR);

        return $u;
    }

    public function test_student_stats_page_loads(): void
    {
        Student::create([
            'firstname' => 'A', 'lastname' => 'B', 'gender' => 'male', 'birth_date' => '2012-01-01',
            'user_id' => User::factory()->create()->id, 'active' => true, 'matricule' => 'ST001',
        ]);

        $this->actingAs($this->admin())
            ->get(route('students.stats'))
            ->assertOk();
    }

    public function test_change_class_reaffects_active_enrollment(): void
    {
        $school = School::factory()->create();
        $year = AcademicYear::create(['school_id' => $school->id, 'year' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-07-31', 'active' => true]);
        $c1 = Classroom::create(['name' => '6A', 'code' => '6A', 'capacity' => 40, 'active' => true]);
        $c2 = Classroom::create(['name' => '6B', 'code' => '6B', 'capacity' => 40, 'active' => true]);

        $student = Student::create([
            'firstname' => 'A', 'lastname' => 'B', 'gender' => 'male', 'birth_date' => '2012-01-01',
            'user_id' => User::factory()->create()->id, 'active' => true, 'matricule' => 'ST010',
        ]);
        $enr = Enrollment::create([
            'school_id' => $school->id, 'student_id' => $student->id, 'class_id' => $c1->id,
            'academic_year_id' => $year->id, 'enrollment_code' => 'INS-010', 'enrollment_date' => '2025-09-02',
            'status' => 'ACTIVE', 'academic_status' => 'en_cours',
        ]);

        $this->actingAs($this->admin())
            ->post(route('students.change-class', $student), ['class_id' => $c2->id])
            ->assertRedirect();

        $this->assertDatabaseHas('enrollments', ['id' => $enr->id, 'class_id' => $c2->id]);
    }

    /**
     * Régression : des created_at identiques (création en masse) rendaient l'ordre
     * non déterministe et un même élève pouvait apparaître sur deux pages.
     */
    public function test_pagination_is_stable_when_created_at_are_identical(): void
    {
        $now = now();
        foreach (range(1, 30) as $i) {
            Student::create([
                'firstname' => 'E'.$i, 'lastname' => 'Test', 'gender' => 'male', 'birth_date' => '2012-01-01',
                'user_id' => User::factory()->create()->id, 'active' => true,
                'matricule' => sprintf('STP%03d', $i),
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        $admin = $this->admin();
        $idsOf = fn (int $page) => collect(
            $this->actingAs($admin)
                ->get(route('students.index', ['per_page' => 10, 'page' => $page]))
                ->viewData('page')['props']['students']['data']
        )->pluck('id');

        $p1 = $idsOf(1);
        $p2 = $idsOf(2);
        $p3 = $idsOf(3);

        // Aucun doublon entre les pages, et l'ensemble couvre bien les 30 élèves.
        $this->assertCount(0, $p1->intersect($p2), 'Chevauchement entre page 1 et 2');
        $this->assertCount(0, $p2->intersect($p3), 'Chevauchement entre page 2 et 3');
        $this->assertCount(30, $p1->merge($p2)->merge($p3)->unique());

        // Ordre reproductible d'une requête à l'autre.
        $this->assertSame($p1->all(), $idsOf(1)->all());
    }

    public function test_index_filters_by_class_and_sorts(): void
    {
        $school = School::factory()->create();
        $year = AcademicYear::create(['school_id' => $school->id, 'year' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-07-31', 'active' => true]);
        $c1 = Classroom::create(['name' => '5A', 'code' => '5A', 'capacity' => 40, 'active' => true]);
        $c2 = Classroom::create(['name' => '5B', 'code' => '5B', 'capacity' => 40, 'active' => true]);

        $make = function (string $last, string $mat) {
            return Student::create([
                'firstname' => 'X', 'lastname' => $last, 'gender' => 'male', 'birth_date' => '2012-01-01',
                'user_id' => User::factory()->create()->id, 'active' => true, 'matricule' => $mat,
            ]);
        };
        $inClass = $make('Zoulou', 'STC001');
        $other = $make('Abalo', 'STC002');

        foreach ([[$inClass, $c1], [$other, $c2]] as [$s, $c]) {
            Enrollment::create([
                'school_id' => $school->id, 'student_id' => $s->id, 'class_id' => $c->id,
                'academic_year_id' => $year->id, 'enrollment_code' => 'INS-'.$s->matricule,
                'enrollment_date' => '2025-09-02', 'status' => 'ACTIVE', 'academic_status' => 'en_cours',
            ]);
        }

        $admin = $this->admin();

        // Filtre classe : seul l'élève de 5A remonte.
        $data = $this->actingAs($admin)
            ->get(route('students.index', ['class_id' => $c1->id]))
            ->viewData('page')['props']['students']['data'];
        $this->assertCount(1, $data);
        $this->assertSame($inClass->id, $data[0]['id']);

        // Tri par nom croissant.
        $sorted = collect(
            $this->actingAs($admin)
                ->get(route('students.index', ['sort' => 'lastname', 'direction' => 'asc']))
                ->viewData('page')['props']['students']['data']
        )->pluck('lastname');
        $this->assertSame('Abalo', $sorted->first());
    }
}
