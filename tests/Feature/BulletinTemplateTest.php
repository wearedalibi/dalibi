<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\AcademicPeriod;
use App\Models\AcademicYear;
use App\Models\BulletinTemplate;
use App\Models\Classroom;
use App\Models\ClassroomType;
use App\Models\ClassSubject;
use App\Models\Enrollment;
use App\Models\Evaluation;
use App\Models\EvaluationTemplate;
use App\Models\EvaluationType;
use App\Models\GradingConfig;
use App\Models\Mark;
use App\Models\ReportCard;
use App\Models\School;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use App\Services\BulletinRenderer;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class BulletinTemplateTest extends TestCase
{
    use RefreshDatabase;

    private School $school;

    private AcademicYear $year;

    private ClassroomType $type;

    private Classroom $class;

    private AcademicPeriod $period;

    private ClassSubject $cs;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->school = School::factory()->create();
        // Ces tests pilotent explicitement la résolution des modèles : on repart du
        // modèle par défaut provisionné à la création de l'école.
        BulletinTemplate::where('school_id', $this->school->id)->delete();
        $this->year = AcademicYear::create(['year' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-07-31', 'active' => true]);
        $this->type = ClassroomType::factory()->create(['period_system' => 'trimestre']);
        $this->class = Classroom::factory()->create(['classroom_type_id' => $this->type->id]);
        $this->period = AcademicPeriod::create([
            'name' => 'Trimestre 1', 'start_date' => '2025-09-01', 'end_date' => '2025-12-31',
            'type' => 'trimestre', 'order' => 1, 'weight' => 1, 'is_current' => true,
            'academic_year_id' => $this->year->id, 'class_type_id' => $this->type->id,
        ]);
        $subject = Subject::create(['name' => 'Maths', 'code' => 'MATH']);
        $this->cs = ClassSubject::create(['class_id' => $this->class->id, 'subject_id' => $subject->id, 'coefficient' => 2, 'academic_year_id' => $this->year->id]);

        GradingConfig::create([
            'school_id' => $this->school->id, 'classroom_type_id' => $this->type->id, 'name' => 'Config',
            'is_active' => true, 'passing_score' => 10, 'default_max_score' => 20,
            'class_weight' => 1, 'comp_weight' => 1, 'round_precision' => 2, 'mentions' => GradingConfig::defaultMentions(),
        ]);
    }

    public function test_resolve_or_default(): void
    {
        $this->assertSame('Par défaut', BulletinTemplate::resolveOrDefault($this->school, $this->type)->name);

        $tpl = BulletinTemplate::create([
            'school_id' => $this->school->id, 'classroom_type_id' => null, 'name' => 'Mon modèle',
            'is_active' => true, 'columns' => BulletinTemplate::defaultColumns(), 'options' => BulletinTemplate::defaultOptions(),
        ]);

        $this->assertSame($tpl->id, BulletinTemplate::resolveOrDefault($this->school, $this->type)->id);
    }

    public function test_validate_computes_custom_interrogation_column(): void
    {
        $interro = EvaluationType::create(['name' => 'Interrogation', 'category' => 'continu']);

        // Modèle avec une colonne liée au type Interrogation
        $columns = BulletinTemplate::defaultColumns();
        array_splice($columns, 1, 0, [['key' => 'interro', 'label' => 'Interro', 'width' => 9, 'type' => 'note', 'source' => 'type:'.$interro->id]]);
        BulletinTemplate::create([
            'school_id' => $this->school->id, 'classroom_type_id' => null, 'name' => 'Avec Interro',
            'is_active' => true, 'columns' => $columns, 'options' => BulletinTemplate::defaultOptions(),
        ]);

        $student = $this->student();
        $this->markFor($student, $interro, 14);

        $this->actingAs($this->admin())
            ->post(route('bulletins.validate'), ['class_id' => $this->class->id, 'academic_period_id' => $this->period->id])
            ->assertRedirect();

        $card = ReportCard::where('student_id', $student->id)->firstOrFail();
        $this->assertEquals(14, $card->payload['lines'][0]['by_type'][$interro->id]);
        $this->assertNotNull($card->payload['class_stats']['average']);
        $this->assertContains('interro', collect($card->payload['template']['columns'])->pluck('key')->all());

        // Rendu : la colonne personnalisée et les stats apparaissent
        $html = app(BulletinRenderer::class)->render($card->load('student'), $this->school);
        $this->assertStringContainsString('Interro', $html);
        $this->assertStringContainsString('Moyenne la plus forte', $html);
    }

    public function test_subsubject_renders_parent_header(): void
    {
        $continu = EvaluationType::create(['name' => 'Devoir', 'category' => 'continu']);

        $parent = Subject::create(['name' => 'Français', 'code' => 'FR']);
        $child = Subject::create(['name' => 'Dictée', 'code' => 'DICT', 'parent_id' => $parent->id]);
        $childCs = ClassSubject::create([
            'class_id' => $this->class->id, 'subject_id' => $child->id,
            'coefficient' => 1, 'academic_year_id' => $this->year->id,
        ]);

        BulletinTemplate::create([
            'school_id' => $this->school->id, 'classroom_type_id' => null, 'name' => 'Std',
            'is_active' => true, 'columns' => BulletinTemplate::defaultColumns(), 'options' => BulletinTemplate::defaultOptions(),
        ]);

        $student = $this->student();
        $this->markFor($student, $continu, 12);            // Maths
        $this->markFor($student, $continu, 15, $childCs);  // Dictée (sous-matière de Français)

        $this->actingAs($this->admin())
            ->post(route('bulletins.validate'), ['class_id' => $this->class->id, 'academic_period_id' => $this->period->id])
            ->assertRedirect();

        $card = ReportCard::where('student_id', $student->id)->firstOrFail();
        $html = app(BulletinRenderer::class)->render($card->load('student'), $this->school);

        $this->assertStringContainsString('Français', $html);   // en-tête de sous-matière
        $this->assertStringContainsString('» Dictée', $html);   // enfant indenté
    }

    public function test_edit_card_updates_appreciation_and_discipline(): void
    {
        $continu = EvaluationType::create(['name' => 'Devoir', 'category' => 'continu']);
        BulletinTemplate::create([
            'school_id' => $this->school->id, 'classroom_type_id' => null, 'name' => 'Std',
            'is_active' => true, 'columns' => BulletinTemplate::defaultColumns(), 'options' => BulletinTemplate::defaultOptions(),
        ]);

        $student = $this->student();
        $this->markFor($student, $continu, 12);

        $admin = $this->admin();
        $this->actingAs($admin)->post(route('bulletins.validate'), ['class_id' => $this->class->id, 'academic_period_id' => $this->period->id])->assertRedirect();

        $card = ReportCard::where('student_id', $student->id)->firstOrFail();

        $this->actingAs($admin)->put(route('bulletins.update', $card->id), [
            'appreciations' => [0 => 'Bon travail'],
            'observations' => 'RAS',
            'decision' => 'Félicitations',
            'punitions' => 2,
            'exclusions' => 0,
        ])->assertRedirect();

        $card->refresh();
        $this->assertSame('Bon travail', $card->payload['lines'][0]['appreciation']);
        $this->assertSame('Félicitations', $card->payload['decision']);
        $this->assertSame(2, $card->payload['punitions']);
        $this->assertSame('RAS', $card->payload['observations']);
    }

    private function admin(): User
    {
        $u = User::factory()->create();
        $u->assignRole(Roles::ADMINISTRATOR);

        return $u;
    }

    private function student(): Student
    {
        $u = User::factory()->create();
        $s = Student::create(['user_id' => $u->id, 'matricule' => 'M'.Str::random(6), 'firstname' => 'P', 'lastname' => Str::random(5), 'gender' => 'male', 'birth_date' => '2010-01-01']);
        Enrollment::create([
            'school_id' => $this->school->id, 'student_id' => $s->id, 'class_id' => $this->class->id,
            'academic_year_id' => $this->year->id, 'enrollment_code' => 'E'.Str::random(8), 'enrollment_date' => now(), 'status' => 'ACTIVE',
        ]);

        return $s;
    }

    private function markFor(Student $student, EvaluationType $type, float $score, ?ClassSubject $cs = null): void
    {
        $template = EvaluationTemplate::create([
            'academic_period_id' => $this->period->id, 'evaluation_type_id' => $type->id, 'class_type_id' => $this->type->id,
            'name' => Str::random(6), 'coefficient' => 1, 'max_score' => 20, 'date' => '2025-10-01',
        ]);
        $evaluation = Evaluation::create(['evaluation_template_id' => $template->id, 'class_subject_id' => ($cs ?? $this->cs)->id, 'date' => '2025-10-01', 'status' => 'published']);
        Mark::create(['evaluation_id' => $evaluation->id, 'student_id' => $student->id, 'score' => $score, 'absent' => false]);
    }

    public function test_groups_discipline_and_recap_render(): void
    {
        $continu = EvaluationType::create(['name' => 'Devoir', 'category' => 'continu']);

        $optSubject = Subject::create(['name' => 'Dessin', 'code' => 'DES']);
        $optCs = ClassSubject::create([
            'class_id' => $this->class->id, 'subject_id' => $optSubject->id,
            'coefficient' => 1, 'group' => 'facultatif', 'academic_year_id' => $this->year->id,
        ]);

        $options = BulletinTemplate::defaultOptions();
        $options['show_discipline'] = true;
        $options['show_period_recap'] = true;
        BulletinTemplate::create([
            'school_id' => $this->school->id, 'classroom_type_id' => null, 'name' => 'Complet',
            'is_active' => true, 'columns' => BulletinTemplate::defaultColumns(), 'options' => $options,
        ]);

        $student = $this->student();
        $this->markFor($student, $continu, 12);                 // Maths (obligatoire)
        $this->markFor($student, $continu, 14, $optCs);         // Dessin (facultatif)

        $this->actingAs($this->admin())
            ->post(route('bulletins.validate'), ['class_id' => $this->class->id, 'academic_period_id' => $this->period->id])
            ->assertRedirect();

        $card = ReportCard::where('student_id', $student->id)->firstOrFail();
        $html = app(BulletinRenderer::class)->render($card->load('student'), $this->school);

        $this->assertStringContainsString('Matières facultatives', $html);
        $this->assertStringContainsString('Retards', $html);
        $this->assertStringContainsString('Moyenne annuelle', $html);
        $this->assertTrue(collect($card->payload['lines'])->contains(fn ($l) => ($l['group'] ?? null) === 'facultatif'));
    }
}
