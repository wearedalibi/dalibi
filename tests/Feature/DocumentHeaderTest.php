<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\DocumentHeader;
use App\Models\DocumentTemplate;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use App\Services\DocumentRenderer;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DocumentHeaderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Roles::ADMINISTRATOR);

        return $user;
    }

    public function test_update_persists_layout_and_watermark(): void
    {
        $school = School::factory()->create(['name' => 'École Test']);

        $layout = [
            'width' => 760,
            'height' => 140,
            'elements' => [[
                'id' => 'a', 'type' => 'text', 'x' => 10, 'y' => 5, 'w' => 200,
                'content' => '{{ecole.nom}}', 'fontSize' => 14, 'bold' => true,
                'italic' => false, 'align' => 'left', 'color' => '#000000',
            ]],
        ];
        $watermark = [
            'enabled' => true, 'type' => 'text', 'text' => 'CONFIDENTIEL', 'image_path' => null,
            'opacity' => 10, 'size' => 60, 'rotation' => -30, 'color' => '#111111',
        ];

        $this->actingAs($this->admin())
            ->post(route('document-header.update'), [
                'preset' => 'personnalise',
                'layout' => json_encode($layout),
                'watermark' => json_encode($watermark),
            ])
            ->assertRedirect();

        $header = DocumentHeader::where('school_id', $school->id)->firstOrFail();
        $this->assertSame('personnalise', $header->preset);
        $this->assertSame(140, $header->layout['height']);
        $this->assertCount(1, $header->layout['elements']);
        $this->assertTrue($header->watermark['enabled']);
        $this->assertSame('CONFIDENTIEL', $header->watermark['text']);
    }

    public function test_update_rejects_unknown_preset(): void
    {
        School::factory()->create();

        $this->actingAs($this->admin())
            ->post(route('document-header.update'), [
                'preset' => 'invalide',
                'layout' => json_encode(['width' => 760, 'height' => 130, 'elements' => []]),
                'watermark' => json_encode(['enabled' => false]),
            ])
            ->assertSessionHasErrors('preset');
    }

    public function test_renderer_uses_custom_header_and_watermark(): void
    {
        $school = School::factory()->create(['name' => 'École Custom']);

        $config = DocumentHeader::defaultLayout($school);
        $config['watermark']['enabled'] = true;
        $config['watermark']['text'] = 'CONFIDENTIEL';

        // Toute école dispose déjà d'un en-tête par défaut (provisionné à sa création) :
        // on le met à jour plutôt que d'en créer un second (contrainte d'unicité).
        DocumentHeader::updateOrCreate(['school_id' => $school->id], [
            'school_id' => $school->id,
            'preset' => 'personnalise',
            'layout' => $config['layout'],
            'watermark' => $config['watermark'],
        ]);

        $renderer = app(DocumentRenderer::class);

        $template = new DocumentTemplate([
            'header_enabled' => true,
            'show_signature' => false,
            'content' => '<p>Corps du document</p>',
        ]);
        $template->setRelation('school', $school->load('documentHeader'));

        $html = $renderer->render($template, $renderer->resolveVariables($school));

        $this->assertStringContainsString('position:absolute', $html);  // en-tête personnalisé
        $this->assertStringContainsString('École Custom', $html);       // {{ecole.nom}} interpolé
        $this->assertStringContainsString('position:fixed', $html);     // filigrane
        $this->assertStringContainsString('CONFIDENTIEL', $html);
    }

    public function test_header_color_is_sanitized_against_injection(): void
    {
        $school = School::factory()->create(['name' => 'École']);
        $config = DocumentHeader::defaultLayout($school);
        $config['layout']['elements'] = [[
            'id' => 'a', 'type' => 'text', 'x' => 0, 'y' => 0, 'w' => 200,
            'content' => 'Test', 'fontSize' => 12, 'bold' => false, 'italic' => false, 'align' => 'left',
            'color' => '#fff;"></div><script>BAD</script>',
        ]];
        $config['watermark']['enabled'] = true;
        $config['watermark']['color'] = 'red;"><img src=x>';
        $config['watermark']['text'] = 'WM';

        // Toute école dispose déjà d'un en-tête par défaut (provisionné à sa création) :
        // on le met à jour plutôt que d'en créer un second (contrainte d'unicité).
        DocumentHeader::updateOrCreate(['school_id' => $school->id], [
            'school_id' => $school->id,
            'preset' => 'personnalise',
            'layout' => $config['layout'],
            'watermark' => $config['watermark'],
        ]);

        $renderer = app(DocumentRenderer::class);
        $template = new DocumentTemplate(['header_enabled' => true, 'show_signature' => false, 'content' => '']);
        $template->setRelation('school', $school->load('documentHeader'));

        $html = $renderer->render($template, $renderer->resolveVariables($school));

        // L'injection est neutralisée : pas de balise injectée, couleur par défaut appliquée.
        $this->assertStringNotContainsString('<script>BAD', $html);
        $this->assertStringNotContainsString('<img src=x>', $html);
        $this->assertStringContainsString('color:#1a1a1a', $html);
    }

    public function test_template_body_escapes_variable_values(): void
    {
        $school = School::factory()->create(['name' => 'École']);
        $student = new Student([
            'firstname' => '<img src=x onerror=alert(1)>', 'lastname' => 'X', 'matricule' => 'M1',
        ]);

        $renderer = app(DocumentRenderer::class);
        $template = new DocumentTemplate([
            'header_enabled' => false, 'show_signature' => false, 'content' => '<p>{{eleve.prenom}}</p>',
        ]);
        $template->setRelation('school', $school);

        $html = $renderer->render($template, $renderer->resolveVariables($school, $student));

        $this->assertStringNotContainsString('<img src=x', $html); // valeur non injectée brute
        $this->assertStringContainsString('&lt;img', $html);        // échappée
    }

    public function test_renderer_uses_ministerial_header_by_default(): void
    {
        $school = School::factory()->create([
            'name' => 'Sans Config',
            'ministry' => 'Ministère des Enseignements Primaire, Secondaire et Technique',
            'terme' => 'République Togolaise',
        ]);

        $renderer = app(DocumentRenderer::class);
        $template = new DocumentTemplate([
            'header_enabled' => true,
            'show_signature' => false,
            'content' => '<p>Corps</p>',
        ]);
        $template->setRelation('school', $school);

        $html = $renderer->render($template, $renderer->resolveVariables($school));

        $this->assertStringContainsString('mh-table', $html);                       // gabarit ministériel
        $this->assertStringContainsString('Ministère des Enseignements', $html);    // ministère interpolé
        $this->assertStringContainsString('Sans Config', $html);                    // nom école
        $this->assertStringContainsString('République Togolaise', $html);           // terme
        $this->assertStringNotContainsString('position:absolute', $html);           // pas le canevas
        $this->assertStringNotContainsString('position:fixed', $html);              // pas de filigrane
    }

    public function test_ministerial_header_used_when_custom_layout_but_preset_default(): void
    {
        // Un canevas existe mais le préréglage reste « ministeriel » : le gabarit officiel prime.
        $school = School::factory()->create(['name' => 'École Bascule']);
        $config = DocumentHeader::defaultLayout($school);

        // Toute école dispose déjà d'un en-tête par défaut (provisionné à sa création) :
        // on le met à jour plutôt que d'en créer un second (contrainte d'unicité).
        DocumentHeader::updateOrCreate(['school_id' => $school->id], [
            'school_id' => $school->id,
            'preset' => 'ministeriel',
            'layout' => $config['layout'],
            'watermark' => $config['watermark'],
        ]);

        $renderer = app(DocumentRenderer::class);
        $template = new DocumentTemplate(['header_enabled' => true, 'show_signature' => false, 'content' => '']);
        $template->setRelation('school', $school->load('documentHeader'));

        $html = $renderer->render($template, $renderer->resolveVariables($school));

        $this->assertStringContainsString('mh-table', $html);
        $this->assertStringNotContainsString('position:absolute', $html);
    }
}
