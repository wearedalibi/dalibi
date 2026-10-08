<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Models\ArchivedDocument;
use App\Models\Classroom;
use App\Models\DocumentTag;
use App\Models\User;
use Database\Seeders\DocumentTagSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ArchiveTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        Storage::fake('secure');
    }

    private function manager(): User
    {
        $u = User::factory()->create();
        $u->assignRole(Roles::SECRETARIAT);

        return $u;
    }

    public function test_default_tags_seeder_is_idempotent(): void
    {
        $this->seed(DocumentTagSeeder::class);
        $this->seed(DocumentTagSeeder::class);

        $this->assertSame(9, DocumentTag::count());
        $this->assertDatabaseHas('document_tags', ['slug' => 'administratif']);
        $this->assertDatabaseHas('document_tags', ['slug' => 'juridique']);
    }

    public function test_can_archive_document_with_tags(): void
    {
        $this->actingAs($this->manager())
            ->post(route('archives.store'), [
                'title' => 'Règlement intérieur',
                'category' => 'administratif',
                'file' => UploadedFile::fake()->create('reglement.pdf', 120, 'application/pdf'),
                'tags' => ['Officiel', 'Règlement'],
            ])
            ->assertRedirect();

        $doc = ArchivedDocument::first();
        $this->assertNotNull($doc);
        $this->assertStringStartsWith('ARC-', $doc->reference);
        $this->assertStringStartsWith('archives/', $doc->path);
        Storage::disk('secure')->assertExists($doc->path);
        $this->assertEquals(2, $doc->tags()->count());
        $this->assertEquals(2, DocumentTag::count()); // tags créés à la volée
    }

    public function test_archive_requires_title_category_and_file(): void
    {
        $this->actingAs($this->manager())
            ->post(route('archives.store'), ['title' => ''])
            ->assertSessionHasErrors(['title', 'category', 'file']);
    }

    public function test_reused_tag_is_not_duplicated(): void
    {
        $m = $this->manager();
        foreach (['A', 'B'] as $t) {
            $this->actingAs($m)->post(route('archives.store'), [
                'title' => "Doc {$t}", 'category' => 'autre',
                'file' => UploadedFile::fake()->create("d{$t}.pdf", 10, 'application/pdf'),
                'tags' => ['Commun'],
            ]);
        }

        $this->assertEquals(1, DocumentTag::where('slug', 'commun')->count());
        $this->assertEquals(2, DocumentTag::find(DocumentTag::where('slug', 'commun')->value('id'))->documents()->count());
    }

    public function test_can_link_document_to_classroom(): void
    {
        $class = Classroom::factory()->create();

        $this->actingAs($this->manager())->post(route('archives.store'), [
            'title' => 'PV conseil', 'category' => 'pedagogique',
            'file' => UploadedFile::fake()->create('pv.pdf', 10, 'application/pdf'),
            'link_type' => 'classroom', 'link_classroom_id' => $class->id,
        ]);

        $doc = ArchivedDocument::first();
        $this->assertEquals(Classroom::class, $doc->documentable_type);
        $this->assertEquals($class->id, $doc->documentable_id);
    }

    public function test_link_to_unknown_student_matricule_fails(): void
    {
        $this->actingAs($this->manager())->post(route('archives.store'), [
            'title' => 'X', 'category' => 'autre',
            'file' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf'),
            'link_type' => 'student', 'link_student_matricule' => 'INCONNU',
        ])->assertSessionHasErrors('link_student_matricule');
    }

    public function test_soft_delete_restore_and_force_delete(): void
    {
        $m = $this->manager();
        $this->actingAs($m)->post(route('archives.store'), [
            'title' => 'Temp', 'category' => 'autre',
            'file' => UploadedFile::fake()->create('t.pdf', 10, 'application/pdf'),
        ]);
        $doc = ArchivedDocument::first();

        $this->actingAs($m)->delete(route('archives.destroy', $doc));
        $this->assertSoftDeleted('archived_documents', ['id' => $doc->id]);

        $this->actingAs($m)->post(route('archives.restore', $doc->id));
        $this->assertNotSoftDeleted('archived_documents', ['id' => $doc->id]);

        $this->actingAs($m)->delete(route('archives.force-delete', $doc->id));
        $this->assertDatabaseMissing('archived_documents', ['id' => $doc->id]);
        Storage::disk('secure')->assertMissing($doc->path);
    }

    public function test_teacher_cannot_access_archives(): void
    {
        $teacher = User::factory()->create();
        $teacher->assignRole(Roles::TEACHER);

        $this->actingAs($teacher)->get(route('archives.index'))->assertForbidden();
    }

    public function test_tag_management(): void
    {
        $m = $this->manager();
        $this->actingAs($m)->post(route('archives.tags.store'), ['name' => 'Juridique', 'color' => '#ef4444'])->assertRedirect();
        $this->assertDatabaseHas('document_tags', ['slug' => 'juridique']);

        // Doublon rejeté
        $this->actingAs($m)->post(route('archives.tags.store'), ['name' => 'Juridique'])->assertSessionHasErrors('name');

        $tag = DocumentTag::where('slug', 'juridique')->first();
        $this->actingAs($m)->delete(route('archives.tags.destroy', $tag))->assertRedirect();
        $this->assertDatabaseMissing('document_tags', ['id' => $tag->id]);
    }
}
