<?php

namespace Tests\Feature;

use App\Constants\Roles;
use App\Jobs\ArchiveAcademicYearJob;
use App\Models\AcademicYear;
use App\Models\Backup;
use App\Models\BackupSetting;
use App\Models\User;
use App\Notifications\BackupFailedNotification;
use App\Services\BackupService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BackupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        Storage::fake('media');
    }

    private function admin(): User
    {
        $u = User::factory()->create();
        $u->assignRole(Roles::ADMINISTRATOR);

        return $u;
    }

    private function academicYear(string $year = '2024-2025', bool $active = true): AcademicYear
    {
        return AcademicYear::create([
            'year' => $year,
            'start_date' => substr($year, 0, 4).'-09-01',
            'end_date' => substr($year, 5, 4).'-07-01',
            'active' => $active,
        ]);
    }

    public function test_admin_can_generate_backup_in_both_formats(): void
    {
        $this->actingAs($this->admin())
            ->post(route('backups.store'), ['formats' => ['json', 'sql']])
            ->assertRedirect();

        $this->assertEquals(2, Backup::where('status', 'completed')->count());

        foreach (Backup::all() as $b) {
            Storage::disk('media')->assertExists($b->path);
        }
    }

    public function test_backup_requires_a_format(): void
    {
        $this->actingAs($this->admin())
            ->post(route('backups.store'), ['formats' => []])
            ->assertSessionHasErrors('formats');
    }

    public function test_non_admin_cannot_access_backups(): void
    {
        $teacher = User::factory()->create();
        $teacher->assignRole(Roles::TEACHER);

        $this->actingAs($teacher)->get(route('backups.index'))->assertForbidden();
        $this->actingAs($teacher)->post(route('backups.store'), ['formats' => ['json']])->assertForbidden();
    }

    public function test_admin_can_save_schedule(): void
    {
        $this->actingAs($this->admin())
            ->post(route('backups.schedule'), [
                'frequency' => 'weekly',
                'time' => '04:00',
                'day_of_week' => 2,
                'formats' => ['json', 'sql'],
                'retention' => 5,
            ])
            ->assertRedirect();

        $this->assertEquals('weekly', BackupSetting::get('frequency'));
        $this->assertEquals('04:00', BackupSetting::get('time'));
        $this->assertEquals('5', BackupSetting::get('retention'));
    }

    public function test_admin_can_delete_backup(): void
    {
        $this->actingAs($this->admin())->post(route('backups.store'), ['formats' => ['json']]);
        $backup = Backup::first();

        $this->actingAs($this->admin())
            ->delete(route('backups.destroy', $backup))
            ->assertRedirect();

        $this->assertDatabaseMissing('backups', ['id' => $backup->id]);
        Storage::disk('media')->assertMissing($backup->path);
    }

    public function test_restore_from_json_repopulates_the_database(): void
    {
        // Données initiales
        $u = User::factory()->create(['firstname' => 'Ama', 'lastname' => 'Koffi']);

        // Snapshot JSON du contenu actuel
        $json = json_encode([
            'tables' => [
                'users' => User::all()->map(fn ($x) => $x->getAttributes())->all(),
            ],
        ]);

        // On supprime la donnée…
        $u->forceDelete();
        $this->assertDatabaseMissing('users', ['id' => $u->id]);

        // … puis on restaure via le service
        Storage::fake('media');
        app(BackupService::class)->restore(
            UploadedFile::fake()->createWithContent('dump.json', $json)
        );

        $this->assertDatabaseHas('users', ['id' => $u->id, 'firstname' => 'Ama']);
    }

    public function test_admin_can_upload_and_restore_via_endpoint(): void
    {
        $admin = $this->admin();
        $json = json_encode(['tables' => ['users' => User::all()->map(fn ($x) => $x->getAttributes())->all()]]);

        $this->actingAs($admin)
            ->post(route('backups.restore'), [
                'file' => UploadedFile::fake()->createWithContent('dump.json', $json),
            ])
            ->assertRedirect()
            ->assertSessionHas('success');
    }

    public function test_restore_rejects_unsupported_format(): void
    {
        $this->actingAs($this->admin())
            ->post(route('backups.restore'), [
                'file' => UploadedFile::fake()->create('archive.rar', 10),
            ])
            ->assertSessionHasErrors('file');
    }

    public function test_non_admin_cannot_restore(): void
    {
        $teacher = User::factory()->create();
        $teacher->assignRole(Roles::TEACHER);

        $this->actingAs($teacher)
            ->post(route('backups.restore'), ['file' => UploadedFile::fake()->createWithContent('d.json', '{"tables":{}}')])
            ->assertForbidden();
    }

    public function test_generated_files_are_gzip_compressed(): void
    {
        $this->actingAs($this->admin())->post(route('backups.store'), ['formats' => ['json']]);

        $backup = Backup::where('format', 'json')->firstOrFail();

        // Le nom reflète la compression et le contenu est bien du gzip valide.
        $this->assertStringEndsWith('.json.gz', $backup->filename);

        $raw = Storage::disk('media')->get($backup->path);
        $this->assertSame("\x1f\x8b", substr($raw, 0, 2), 'Le fichier doit être compressé (en-tête gzip).');

        $decoded = json_decode((string) gzdecode($raw), true);
        $this->assertIsArray($decoded);
        $this->assertArrayHasKey('tables', $decoded);
    }

    public function test_restore_from_gzipped_backup_roundtrip(): void
    {
        $u = User::factory()->create(['firstname' => 'Kossi', 'lastname' => 'Mensah']);

        $this->actingAs($this->admin())->post(route('backups.store'), ['formats' => ['json']]);
        $backup = Backup::where('format', 'json')->firstOrFail();
        $gz = Storage::disk('media')->get($backup->path);

        $u->forceDelete();
        $this->assertDatabaseMissing('users', ['id' => $u->id]);

        app(BackupService::class)->restore(
            UploadedFile::fake()->createWithContent('backup_restore.json.gz', $gz)
        );

        $this->assertDatabaseHas('users', ['id' => $u->id, 'firstname' => 'Kossi']);
    }

    public function test_retention_keeps_only_latest_backups(): void
    {
        BackupSetting::set('retention', '3');

        for ($i = 0; $i < 5; $i++) {
            $this->actingAs($this->admin())->post(route('backups.store'), ['formats' => ['json']]);
        }

        // Au plus 3 sauvegardes JSON conservées
        $this->assertLessThanOrEqual(3, Backup::where('format', 'json')->count());
    }

    public function test_backup_records_a_sha256_checksum(): void
    {
        $this->actingAs($this->admin())->post(route('backups.store'), ['formats' => ['json']]);

        $backup = Backup::firstOrFail();
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', (string) $backup->checksum);
    }

    public function test_verify_detects_intact_and_corrupted_backup(): void
    {
        $this->actingAs($this->admin())->post(route('backups.store'), ['formats' => ['json']]);
        $backup = Backup::firstOrFail();

        // Fichier intègre
        $this->actingAs($this->admin())
            ->post(route('backups.verify', $backup))
            ->assertSessionHas('success');

        // On altère le fichier stocké → l'empreinte ne correspond plus
        Storage::disk('media')->put($backup->path, 'donnée corrompue');
        $this->actingAs($this->admin())
            ->post(route('backups.verify', $backup))
            ->assertSessionHas('error');
    }

    public function test_backup_failure_notifies_administrators(): void
    {
        Notification::fake();
        $admin = $this->admin();

        // Le stockage lève une exception → la sauvegarde échoue.
        Storage::shouldReceive('disk')->andThrow(new \RuntimeException('stockage indisponible'));

        app(BackupService::class)->run(['json'], $admin->id);

        $this->assertSame('failed', Backup::firstOrFail()->status);
        Notification::assertSentTo($admin, BackupFailedNotification::class);
    }

    public function test_selective_restore_only_affects_target_table(): void
    {
        $year = $this->academicYear('2024-2025');

        // Sauvegarde JSON complète de l'état courant
        $this->actingAs($this->admin())->post(route('backups.store'), ['formats' => ['json']]);
        $gz = Storage::disk('media')->get(Backup::where('format', 'json')->firstOrFail()->path);

        // On modifie la table cible et on ajoute une donnée dans une autre table
        $year->update(['year' => '9999-0000']);
        User::factory()->create(['firstname' => 'ApresSauvegarde']);

        // Restauration ciblée : uniquement « academic_years »
        app(BackupService::class)->restore(
            UploadedFile::fake()->createWithContent('export.json.gz', $gz),
            'academic_years'
        );

        // La table cible est revenue à l'état sauvegardé…
        $this->assertDatabaseHas('academic_years', ['id' => $year->id, 'year' => '2024-2025']);
        // … mais les autres tables ne sont pas touchées
        $this->assertDatabaseHas('users', ['firstname' => 'ApresSauvegarde']);
    }

    public function test_selective_restore_rejects_non_json_format(): void
    {
        $this->actingAs($this->admin())
            ->post(route('backups.restore'), [
                'file' => UploadedFile::fake()->createWithContent('dump.sql', '-- vide'),
                'only_table' => 'users',
            ])
            ->assertSessionHas('error');
    }

    public function test_selective_restore_rejects_unknown_table(): void
    {
        $this->actingAs($this->admin())
            ->post(route('backups.restore'), [
                'file' => UploadedFile::fake()->createWithContent('d.json', '{"tables":{}}'),
                'only_table' => 'table_inexistante',
            ])
            ->assertSessionHasErrors('only_table');
    }

    public function test_backup_with_media_produces_a_zip_bundle(): void
    {
        Storage::fake('secure');
        Storage::disk('media')->put('logos/ecole.png', 'PNGDATA');

        $this->actingAs($this->admin())
            ->post(route('backups.store'), ['formats' => ['json'], 'with_media' => true]);

        $backup = Backup::firstOrFail();
        $this->assertTrue($backup->includes_media);
        $this->assertStringEndsWith('.zip', $backup->filename);

        // Le ZIP contient bien la base et les médias.
        $tmp = tempnam(sys_get_temp_dir(), 'ziptest_');
        file_put_contents($tmp, Storage::disk('media')->get($backup->path));
        $zip = new \ZipArchive;
        $zip->open($tmp);

        $this->assertNotFalse($zip->locateName('media/logos/ecole.png'));
        $hasDb = false;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            if (str_starts_with((string) $zip->getNameIndex($i), 'database/')) {
                $hasDb = true;
                break;
            }
        }
        $zip->close();
        @unlink($tmp);

        $this->assertTrue($hasDb, "L'archive doit contenir la sauvegarde de base.");
    }

    public function test_restore_from_media_zip_restores_db_and_files(): void
    {
        Storage::fake('secure');
        $u = User::factory()->create(['firstname' => 'Yao', 'lastname' => 'Adjo']);
        Storage::disk('media')->put('docs/bulletin.pdf', 'PDFDATA');

        $this->actingAs($this->admin())
            ->post(route('backups.store'), ['formats' => ['json'], 'with_media' => true]);
        $zip = Storage::disk('media')->get(Backup::firstOrFail()->path);

        $u->forceDelete();
        Storage::disk('media')->delete('docs/bulletin.pdf');
        $this->assertDatabaseMissing('users', ['id' => $u->id]);
        $this->assertFalse(Storage::disk('media')->exists('docs/bulletin.pdf'));

        app(BackupService::class)->restore(
            UploadedFile::fake()->createWithContent('bundle.zip', $zip)
        );

        $this->assertDatabaseHas('users', ['id' => $u->id, 'firstname' => 'Yao']);
        $this->assertTrue(Storage::disk('media')->exists('docs/bulletin.pdf'));
        $this->assertSame('PDFDATA', Storage::disk('media')->get('docs/bulletin.pdf'));
    }

    public function test_admin_can_archive_academic_year(): void
    {
        $year = $this->academicYear();

        $this->actingAs($this->admin())
            ->post(route('backups.archive'), ['academic_year_id' => $year->id])
            ->assertRedirect()
            ->assertSessionHas('success');

        $archive = Backup::where('locked', true)->firstOrFail();
        $this->assertSame($year->id, $archive->academic_year_id);
        $this->assertSame('Année 2024-2025', $archive->label);
        $this->assertSame('completed', $archive->status);
        Storage::disk('media')->assertExists($archive->path);
    }

    public function test_archiving_is_idempotent_per_year(): void
    {
        $year = $this->academicYear();

        $this->actingAs($this->admin())->post(route('backups.archive'), ['academic_year_id' => $year->id]);
        $this->actingAs($this->admin())
            ->post(route('backups.archive'), ['academic_year_id' => $year->id])
            ->assertSessionHas('error');

        $this->assertSame(1, Backup::where('locked', true)->where('academic_year_id', $year->id)->count());
    }

    public function test_locked_archives_are_never_pruned_by_retention(): void
    {
        BackupSetting::set('retention', '1');
        $year = $this->academicYear();

        app(BackupService::class)->archiveAcademicYear($year);
        $archiveId = Backup::where('locked', true)->value('id');

        // Plusieurs sauvegardes SQL normales, bien au-delà de la rétention
        for ($i = 0; $i < 3; $i++) {
            app(BackupService::class)->run(['sql']);
        }

        $this->assertDatabaseHas('backups', ['id' => $archiveId, 'locked' => true]);
        $this->assertLessThanOrEqual(1, Backup::where('format', 'sql')->where('locked', false)->count());
    }

    public function test_closing_academic_year_dispatches_archive_job(): void
    {
        Queue::fake();
        $year = $this->academicYear('2023-2024', active: true);

        $this->actingAs($this->admin())
            ->put(route('academic-years.update', $year), [
                'year' => '2023-2024',
                'start_date' => '2023-09-01',
                'end_date' => '2024-07-01',
                'active' => false,
            ])
            ->assertRedirect();

        Queue::assertPushed(ArchiveAcademicYearJob::class, fn ($job) => $job->academicYearId === $year->id);
    }
}
