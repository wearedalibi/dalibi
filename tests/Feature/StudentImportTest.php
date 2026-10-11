<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class StudentImportTest extends TestCase
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

    private function csv(string $content): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('eleves.csv', $content);
    }

    public function test_import_page_loads(): void
    {
        $this->actingAs($this->admin())->get(route('students.import'))->assertOk();
    }

    public function test_template_downloads(): void
    {
        $this->actingAs($this->admin())
            ->get(route('students.import.template'))
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    public function test_imports_valid_rows_and_reports_errors(): void
    {
        $csv = "prenom;nom;sexe;date_naissance;lieu_naissance;nationalite;telephone;email;matricule\n"
            ."Koffi;MENSAH;M;2012-05-14;Lomé;Togolaise;;;\n"   // valide
            ."Ama;;F;2013-01-01;;;;;\n";                        // invalide (nom manquant)

        $this->actingAs($this->admin())
            ->post(route('students.import.store'), ['file' => $this->csv($csv)])
            ->assertOk();

        $this->assertEquals(1, Student::count());
        $this->assertDatabaseHas('students', ['firstname' => 'Koffi', 'lastname' => 'MENSAH', 'gender' => 'male']);
    }

    public function test_rejects_non_csv(): void
    {
        $this->actingAs($this->admin())
            ->post(route('students.import.store'), ['file' => UploadedFile::fake()->image('photo.png')])
            ->assertSessionHasErrors('file');
    }
}
