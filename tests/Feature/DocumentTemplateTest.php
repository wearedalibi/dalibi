<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\DocumentIssuance;
use App\Models\DocumentTemplate;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use App\Services\DocumentRenderer;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DocumentTemplateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Roles::ADMINISTRATOR);

        return $user;
    }

    private function teacher(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Roles::TEACHER);

        return $user;
    }

    private function template(array $overrides = []): DocumentTemplate
    {
        return DocumentTemplate::create(array_merge([
            'category' => 'certificat',
            'type' => 'certificat_scolarite',
            'name' => 'Certificat de scolarité',
            'source' => 'wysiwyg',
            'content' => '<p>Élève {{ eleve.nom_complet }} en {{ classe.nom }}.</p>',
            'header_enabled' => true,
            'footer_enabled' => true,
            'show_signature' => true,
            'signatory_title' => 'Le Directeur',
            'orientation' => 'portrait',
            'is_default' => true,
            'is_active' => true,
        ], $overrides));
    }

    private function makeStudent(): Student
    {
        return Student::create([
            'firstname' => 'Koffi',
            'lastname' => 'Mensah',
            'gender' => 'male',
            'birth_date' => '2010-05-15',
            'user_id' => User::factory()->create()->id,
            'active' => true,
            'matricule' => 'DOC001',
        ]);
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'category' => 'attestation',
            'type' => 'attestation_frequentation',
            'name' => 'Attestation standard',
            'source' => 'wysiwyg',
            'content' => '<p>Test {{ eleve.nom }}</p>',
            'header_enabled' => true,
            'footer_enabled' => true,
            'show_signature' => true,
            'signatory_title' => 'Le Directeur',
            'orientation' => 'portrait',
            'is_default' => false,
            'is_active' => true,
        ], $overrides);
    }

    // ─── Accès ───────────────────────────────────────────────────────────────

    public function test_guest_cannot_access_documents_index(): void
    {
        $this->get(route('document-templates.index'))->assertRedirect(route('login'));
    }

    public function test_teacher_cannot_access_documents_index(): void
    {
        $this->actingAs($this->teacher())
            ->get(route('document-templates.index'))
            ->assertForbidden();
    }

    public function test_admin_can_access_documents_index(): void
    {
        $this->actingAs($this->admin())
            ->get(route('document-templates.index'))
            ->assertOk();
    }

    // ─── CRUD ────────────────────────────────────────────────────────────────

    public function test_admin_can_create_template(): void
    {
        $this->actingAs($this->admin())
            ->post(route('document-templates.store'), $this->validPayload())
            ->assertRedirect(route('document-templates.index'));

        $this->assertDatabaseHas('document_templates', [
            'type' => 'attestation_frequentation',
            'name' => 'Attestation standard',
        ]);
    }

    public function test_create_requires_name(): void
    {
        $this->actingAs($this->admin())
            ->post(route('document-templates.store'), $this->validPayload(['name' => '']))
            ->assertSessionHasErrors('name');
    }

    public function test_create_rejects_invalid_category(): void
    {
        $this->actingAs($this->admin())
            ->post(route('document-templates.store'), $this->validPayload(['category' => 'invalide']))
            ->assertSessionHasErrors('category');
    }

    public function test_only_one_default_template_per_type(): void
    {
        $first = $this->template(['name' => 'Premier', 'is_default' => true]);

        $this->actingAs($this->admin())
            ->post(route('document-templates.store'), $this->validPayload([
                'type' => 'certificat_scolarite',
                'category' => 'certificat',
                'name' => 'Second',
                'is_default' => true,
            ]));

        $this->assertDatabaseHas('document_templates', ['name' => 'Second', 'is_default' => true]);
        $this->assertDatabaseHas('document_templates', ['id' => $first->id, 'is_default' => false]);
    }

    public function test_admin_can_update_template(): void
    {
        $template = $this->template();

        $this->actingAs($this->admin())
            ->put(route('document-templates.update', $template), $this->validPayload(['name' => 'Modifié']))
            ->assertRedirect(route('document-templates.index'));

        $this->assertDatabaseHas('document_templates', ['id' => $template->id, 'name' => 'Modifié']);
    }

    public function test_admin_can_delete_template(): void
    {
        $template = $this->template();

        $this->actingAs($this->admin())
            ->delete(route('document-templates.destroy', $template))
            ->assertRedirect(route('document-templates.index'));

        $this->assertDatabaseMissing('document_templates', ['id' => $template->id]);
    }

    public function test_admin_can_view_template(): void
    {
        $template = $this->template();

        $this->actingAs($this->admin())
            ->get(route('document-templates.show', $template))
            ->assertOk();
    }

    // ─── Source Blade (mise en page prédéfinie) ────────────────────────────────

    public function test_admin_can_create_blade_template(): void
    {
        $this->actingAs($this->admin())
            ->post(route('document-templates.store'), $this->validPayload([
                'source' => 'blade',
                'layout' => 'certificat_scolarite',
                'content' => null,
            ]))
            ->assertRedirect(route('document-templates.index'));

        $this->assertDatabaseHas('document_templates', [
            'source' => 'blade',
            'layout' => 'certificat_scolarite',
        ]);
    }

    public function test_blade_source_requires_a_layout(): void
    {
        $this->actingAs($this->admin())
            ->post(route('document-templates.store'), $this->validPayload([
                'source' => 'blade',
                'layout' => null,
                'content' => null,
            ]))
            ->assertSessionHasErrors('layout');
    }

    public function test_blade_source_rejects_layout_outside_whitelist(): void
    {
        $this->actingAs($this->admin())
            ->post(route('document-templates.store'), $this->validPayload([
                'source' => 'blade',
                'layout' => '../../../etc/passwd',
                'content' => null,
            ]))
            ->assertSessionHasErrors('layout');
    }

    public function test_wysiwyg_source_requires_content(): void
    {
        $this->actingAs($this->admin())
            ->post(route('document-templates.store'), $this->validPayload([
                'source' => 'wysiwyg',
                'content' => null,
            ]))
            ->assertSessionHasErrors('content');
    }

    public function test_generate_blade_template_returns_pdf(): void
    {
        $template = $this->template([
            'source' => 'blade',
            'layout' => 'certificat_scolarite',
            'content' => null,
        ]);
        $student = $this->makeStudent();

        $response = $this->actingAs($this->admin())
            ->post(route('document-templates.generate', $template), [
                'student_id' => $student->id,
                'classe' => '3ème A',
                'annee_scolaire' => '2025-2026',
            ]);

        $response->assertOk();
        $this->assertEquals('application/pdf', $response->headers->get('content-type'));
        $this->assertDatabaseHas('document_issuances', [
            'template_id' => $template->id,
            'student_id' => $student->id,
        ]);
    }

    public function test_every_whitelisted_layout_renders(): void
    {
        $renderer = app(DocumentRenderer::class);
        $school = School::query()->first() ?? new School(['name' => 'École Test', 'city' => 'Lomé']);
        $student = $this->makeStudent();
        $vars = $renderer->resolveVariables($school, $student, [
            'classe.nom' => '3ème A',
            'annee_scolaire' => '2025-2026',
            'document.reference' => 'TEST-0001',
            'signataire.titre' => 'Le Directeur',
        ]);

        foreach (array_keys(DocumentTemplate::LAYOUTS) as $layout) {
            $this->assertTrue(view()->exists("documents.{$layout}"), "Vue manquante : documents.{$layout}");

            $template = new DocumentTemplate(['source' => 'blade', 'layout' => $layout, 'header_enabled' => true, 'show_signature' => true]);
            $template->setRelation('school', $school);

            $html = $renderer->render($template, $vars);
            $this->assertStringContainsString('Koffi', $html, "Le layout {$layout} n'a pas interpolé l'élève.");
        }
    }

    // ─── Prévisualisation ──────────────────────────────────────────────────────

    public function test_preview_returns_rendered_html(): void
    {
        $this->actingAs($this->admin())
            ->postJson(route('document-templates.preview'), [
                'content' => '<p>Bonjour {{ eleve.nom_complet }}</p>',
                'header_enabled' => true,
                'show_signature' => true,
            ])
            ->assertOk()
            ->assertJsonStructure(['html']);
    }

    // ─── Génération + traçabilité ──────────────────────────────────────────────

    public function test_generate_creates_issuance_and_returns_pdf(): void
    {
        $template = $this->template();
        $student = $this->makeStudent();

        $response = $this->actingAs($this->admin())
            ->post(route('document-templates.generate', $template), [
                'student_id' => $student->id,
                'classe' => '3ème A',
                'annee_scolaire' => '2025-2026',
            ]);

        $response->assertOk();
        $this->assertEquals('application/pdf', $response->headers->get('content-type'));

        $this->assertDatabaseHas('document_issuances', [
            'template_id' => $template->id,
            'student_id' => $student->id,
        ]);
    }

    public function test_generate_assigns_reference_number(): void
    {
        $template = $this->template();
        $student = $this->makeStudent();

        $this->actingAs($this->admin())
            ->post(route('document-templates.generate', $template), [
                'student_id' => $student->id,
            ]);

        $issuance = DocumentIssuance::first();
        $this->assertNotNull($issuance);
        $this->assertNotEmpty($issuance->reference_number);
    }

    public function test_registry_lists_issued_documents(): void
    {
        $this->actingAs($this->admin())
            ->get(route('document-templates.registry'))
            ->assertOk();
    }
}
