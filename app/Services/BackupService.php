<?php

namespace App\Services;

use App\Constants\Roles;
use App\Models\AcademicYear;
use App\Models\Backup;
use App\Models\BackupSetting;
use App\Models\FileStorageSetting;
use App\Models\User;
use App\Notifications\BackupFailedNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

/**
 * Génère et restaure les sauvegardes de la base.
 *
 * Conçu pour tenir la charge sur plusieurs années de données :
 *  - écriture en flux (jamais toute la base en mémoire) ;
 *  - compression gzip systématique (~85 % de taille en moins) ;
 *  - sur PostgreSQL, délégation à `pg_dump` (format custom, schéma inclus),
 *    avec repli automatique sur l'export SQL portable si l'outil est absent.
 */
final class BackupService
{
    /** Tables transitoires exclues des sauvegardes. */
    private const EXCLUDED = [
        'migrations', 'cache', 'cache_locks', 'sessions',
        'jobs', 'job_batches', 'failed_jobs', 'password_reset_tokens',
    ];

    private const DIRECTORY = 'backups';

    /** Temps max (s) accordé aux outils externes (pg_dump / pg_restore). */
    private const PROCESS_TIMEOUT = 900;

    /**
     * Génère une sauvegarde pour chaque format demandé.
     *
     * @param  array<int,string>  $formats  sous-ensemble de ['json', 'sql']
     * @return Collection<int,Backup>
     */
    public function run(array $formats, ?string $userId = null, bool $scheduled = false, bool $withMedia = false): Collection
    {
        $formats = array_values(array_intersect($formats, ['json', 'sql'])) ?: ['json'];
        $results = collect();

        foreach ($formats as $format) {
            $results->push($this->generate($format, 'backup', $userId, $scheduled, [], $withMedia));
        }

        $this->applyRetention();

        return $results;
    }

    /**
     * Archive verrouillée d'une année scolaire (clôture) : snapshot complet
     * étiqueté, conservé à long terme et exclu de la rétention automatique.
     * Idempotent : au plus une archive verrouillée par année.
     */
    public function archiveAcademicYear(AcademicYear $year, ?string $userId = null, bool $scheduled = false): ?Backup
    {
        $already = Backup::where('academic_year_id', $year->id)
            ->where('locked', true)
            ->where('status', 'completed')
            ->exists();

        if ($already) {
            return null;
        }

        $prefix = 'archive_'.preg_replace('/[^A-Za-z0-9_-]+/', '-', (string) $year->year);

        // Format SQL : dump complet (schéma inclus sur PostgreSQL via pg_dump).
        return $this->generate('sql', $prefix, $userId, $scheduled, [
            'academic_year_id' => $year->id,
            'label' => 'Année '.$year->year,
            'locked' => true,
        ]);
    }

    /**
     * Génère un fichier de sauvegarde (un format), l'enregistre sur le disque
     * et trace le résultat. La rétention n'est PAS appliquée ici.
     *
     * @param  array<string,mixed>  $extra  attributs additionnels (label, locked, academic_year_id…)
     */
    private function generate(string $format, string $prefix, ?string $userId, bool $scheduled, array $extra = [], bool $withMedia = false): Backup
    {
        $disk = $this->disk();
        $timestamp = now()->format('Y-m-d_His');
        $filename = "{$prefix}_{$timestamp}.{$format}";
        $path = self::DIRECTORY.'/'.$filename;
        $tmp = tempnam(sys_get_temp_dir(), 'bkp_');
        $bundle = null; // fichier ZIP temporaire si médias inclus

        try {
            // Le builder écrit dans $tmp et renvoie l'extension réellement produite.
            $extension = $this->writeDump($format, $tmp);

            // Fichier final = dump seul, ou archive ZIP (dump + médias).
            $finalTmp = $tmp;
            if ($withMedia) {
                $bundle = $this->bundleWithMedia($tmp, "dump.{$extension}");
                $finalTmp = $bundle;
                $extension = 'zip';
            }

            $filename = "{$prefix}_{$timestamp}.{$extension}";
            $path = self::DIRECTORY.'/'.$filename;
            $size = filesize($finalTmp) ?: 0;
            $checksum = hash_file('sha256', $finalTmp) ?: null;

            $stream = fopen($finalTmp, 'rb');
            Storage::disk($disk)->writeStream($path, $stream);
            if (is_resource($stream)) {
                fclose($stream);
            }

            return Backup::create(array_merge([
                'filename' => $filename,
                'path' => $path,
                'disk' => $this->driverName(),
                'format' => $format,
                'size' => $size,
                'checksum' => $checksum,
                'includes_media' => $withMedia,
                'status' => 'completed',
                'scheduled' => $scheduled,
                'created_by' => $userId,
            ], $extra));
        } catch (\Throwable $e) {
            $backup = Backup::create(array_merge([
                'filename' => $filename,
                'path' => $path,
                'disk' => $this->driverName(),
                'format' => $format,
                'status' => 'failed',
                'error' => mb_substr($e->getMessage(), 0, 1000),
                'scheduled' => $scheduled,
                'created_by' => $userId,
            ], $extra));

            $this->notifyFailure($backup);

            return $backup;
        } finally {
            if (is_string($tmp) && is_file($tmp)) {
                @unlink($tmp);
            }
            if (is_string($bundle) && is_file($bundle)) {
                @unlink($bundle);
            }
        }
    }

    /**
     * Emballe le dump de base + tous les fichiers uploadés (disques « media »
     * hors dossier des sauvegardes, et « secure ») dans une archive ZIP.
     *
     * @return string chemin du fichier ZIP temporaire
     */
    private function bundleWithMedia(string $dumpTmp, string $dumpInnerName): string
    {
        $zipPath = tempnam(sys_get_temp_dir(), 'zip_');
        $zip = new \ZipArchive;

        if ($zip->open($zipPath, \ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException("Impossible de créer l'archive ZIP.");
        }

        $temps = []; // fichiers temporaires (disques distants) à nettoyer après fermeture
        $zip->addFile($dumpTmp, 'database/'.$dumpInnerName);
        $this->addDiskToZip($zip, 'media', 'media', [self::DIRECTORY], $temps);
        $this->addDiskToZip($zip, 'secure', 'secure', [], $temps);
        $zip->close();

        foreach ($temps as $t) {
            @unlink($t);
        }

        return $zipPath;
    }

    /**
     * Ajoute au ZIP tous les fichiers d'un disque, sous un préfixe, en excluant
     * certains dossiers de premier niveau (ex. le dossier des sauvegardes).
     *
     * @param  array<int,string>  $excludeDirs
     * @param  array<int,string>  $temps  accumule les fichiers temporaires créés (disques distants)
     */
    private function addDiskToZip(\ZipArchive $zip, string $diskName, string $prefix, array $excludeDirs, array &$temps): void
    {
        try {
            $disk = Storage::disk($diskName);
            $files = $disk->allFiles();
        } catch (\Throwable) {
            return; // disque absent ou illisible : on n'échoue pas la sauvegarde
        }

        foreach ($files as $rel) {
            foreach ($excludeDirs as $dir) {
                if (str_starts_with($rel, $dir.'/')) {
                    continue 2;
                }
            }

            // Disque local : on référence le fichier directement (aucune mémoire).
            $local = null;
            try {
                $p = $disk->path($rel);
                if (is_file($p)) {
                    $local = $p;
                }
            } catch (\Throwable) {
                // Disque distant : pas de chemin local.
            }

            if ($local !== null) {
                $zip->addFile($local, "{$prefix}/{$rel}");
            } else {
                $t = tempnam(sys_get_temp_dir(), 'med_');
                file_put_contents($t, $disk->get($rel));
                $temps[] = $t;
                $zip->addFile($t, "{$prefix}/{$rel}");
            }
        }
    }

    /**
     * Écrit la sauvegarde du format demandé dans $tmp.
     *
     * @return string extension du fichier généré (json.gz | sql.gz | dump)
     */
    private function writeDump(string $format, string $tmp): string
    {
        if ($format === 'sql') {
            if (DB::getDriverName() === 'pgsql') {
                try {
                    $this->pgDump($tmp);

                    return 'dump';
                } catch (\Throwable $e) {
                    report($e); // pg_dump indisponible : on bascule sur l'export portable
                }
            }

            $this->writeSqlGz($tmp);

            return 'sql.gz';
        }

        $this->writeJsonGz($tmp);

        return 'json.gz';
    }

    /**
     * Restaure la base à partir d'un fichier de sauvegarde
     * (json[.gz], sql[.gz] ou dump PostgreSQL). Une sauvegarde de sécurité
     * (JSON) est générée au préalable.
     *
     * @return array{format:string, tables:int, rows?:int}
     */
    public function restore(UploadedFile $file, ?string $onlyTable = null): array
    {
        $name = strtolower($file->getClientOriginalName());
        $real = (string) $file->getRealPath();

        // Filet de sécurité : snapshot avant écrasement
        try {
            $this->run(['json']);
        } catch (\Throwable) {
            // On n'empêche pas la restauration si le snapshot échoue
        }

        // Archive complète (base + médias) — restauration globale uniquement.
        if (str_ends_with($name, '.zip')) {
            if ($onlyTable !== null) {
                throw new \InvalidArgumentException('La restauration sélective par table est disponible uniquement au format JSON.');
            }

            return $this->restoreZip($real);
        }

        return $this->restoreDbFile($real, $name, $onlyTable);
    }

    /** Liste des tables restaurables (pour la restauration sélective). */
    public function restorableTables(): array
    {
        return $this->tables();
    }

    /** Restaure la base depuis un fichier de dump (json[.gz], sql[.gz] ou dump PostgreSQL). */
    private function restoreDbFile(string $path, string $name, ?string $onlyTable = null): array
    {
        $name = strtolower($name);

        // La restauration sélective n'est possible qu'avec l'export JSON portable.
        if ($onlyTable !== null && ! (str_ends_with($name, '.json') || str_ends_with($name, '.json.gz'))) {
            throw new \InvalidArgumentException('La restauration sélective par table est disponible uniquement au format JSON.');
        }

        // Dump natif PostgreSQL (format custom)
        if (str_ends_with($name, '.dump') || str_ends_with($name, '.pgdump')) {
            return $this->restorePgDump($path);
        }

        // Fichier compressé : on décompresse dans un fichier temporaire
        $source = $path;
        $tmp = null;
        if (str_ends_with($name, '.gz')) {
            $tmp = tempnam(sys_get_temp_dir(), 'rst_');
            $this->gunzip($path, $tmp);
            $source = $tmp;
            $name = substr($name, 0, -3); // retire « .gz »
        }

        $ext = pathinfo($name, PATHINFO_EXTENSION);
        if (! in_array($ext, ['json', 'sql'], true)) {
            if ($tmp) {
                @unlink($tmp);
            }
            throw new \InvalidArgumentException('Format non supporté (JSON, SQL, dump PostgreSQL ou ZIP attendu).');
        }

        try {
            $contents = (string) file_get_contents($source);

            return $ext === 'sql' ? $this->restoreSql($contents) : $this->restoreJson($contents, $onlyTable);
        } finally {
            if ($tmp && is_file($tmp)) {
                @unlink($tmp);
            }
        }
    }

    /**
     * Restaure une archive ZIP complète : la base (dossier database/) puis les
     * fichiers uploadés (dossiers media/ et secure/).
     */
    private function restoreZip(string $zipPath): array
    {
        $dir = sys_get_temp_dir().'/rstzip_'.bin2hex(random_bytes(6));
        mkdir($dir, 0700, true);

        $zip = new \ZipArchive;
        if ($zip->open($zipPath) !== true) {
            throw new \RuntimeException('Archive ZIP illisible.');
        }
        $zip->extractTo($dir);
        $zip->close();

        try {
            // Base de données
            $dbFiles = glob($dir.'/database/*') ?: [];
            if (empty($dbFiles)) {
                throw new \RuntimeException("L'archive ne contient pas de sauvegarde de base (dossier database/).");
            }
            $dbFile = $dbFiles[0];
            $result = $this->restoreDbFile($dbFile, basename($dbFile));

            // Médias
            $mediaCount = $this->restoreDiskFromDir($dir.'/media', 'media')
                + $this->restoreDiskFromDir($dir.'/secure', 'secure');

            $result['media'] = $mediaCount;

            return $result;
        } finally {
            $this->removeDir($dir);
        }
    }

    /** Recopie récursivement un dossier extrait vers un disque applicatif. */
    private function restoreDiskFromDir(string $sourceDir, string $diskName): int
    {
        if (! is_dir($sourceDir)) {
            return 0;
        }

        $disk = Storage::disk($diskName);
        $count = 0;

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($sourceDir, \FilesystemIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if (! $file->isFile()) {
                continue;
            }
            $rel = ltrim(str_replace('\\', '/', substr($file->getPathname(), strlen($sourceDir))), '/');
            $stream = fopen($file->getPathname(), 'rb');
            $disk->writeStream($rel, $stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
            $count++;
        }

        return $count;
    }

    /** Suppression récursive d'un dossier temporaire. */
    private function removeDir(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }
        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($items as $item) {
            $item->isDir() ? @rmdir($item->getPathname()) : @unlink($item->getPathname());
        }
        @rmdir($dir);
    }

    /**
     * Restaure depuis un export JSON (vide puis réinsère chaque table).
     *
     * @param  string|null  $onlyTable  restaure une seule table (restauration ciblée)
     */
    private function restoreJson(string $contents, ?string $onlyTable = null): array
    {
        $data = json_decode($contents, true);

        if (! is_array($data) || ! isset($data['tables']) || ! is_array($data['tables'])) {
            throw new \RuntimeException('Fichier JSON de sauvegarde invalide.');
        }

        // Restauration ciblée : une seule table, par lots bornés (pas de transaction géante).
        if ($onlyTable !== null) {
            if (! array_key_exists($onlyTable, $data['tables'])) {
                throw new \RuntimeException("La table « {$onlyTable} » est absente de cette sauvegarde.");
            }
            if (! Schema::hasTable($onlyTable)) {
                throw new \RuntimeException("La table « {$onlyTable} » n'existe pas dans la base.");
            }

            $rows = $this->restoreTableBatched($onlyTable, $data['tables'][$onlyTable]);

            return ['format' => 'json', 'tables' => 1, 'rows' => $rows];
        }

        $rowsTotal = 0;

        try {
            DB::transaction(function () use ($data, &$rowsTotal): void {
                $this->deferForeignKeys();

                foreach ($data['tables'] as $table => $rows) {
                    if (! Schema::hasTable($table)) {
                        continue;
                    }
                    DB::table($table)->delete();

                    foreach (array_chunk($rows, 500) as $chunk) {
                        if (! empty($chunk)) {
                            DB::table($table)->insert($chunk);
                            $rowsTotal += count($chunk);
                        }
                    }
                }
            });
        } finally {
            $this->restoreForeignKeys();
        }

        return ['format' => 'json', 'tables' => count($data['tables']), 'rows' => $rowsTotal];
    }

    /**
     * Restaure une seule table par lots (une transaction par lot d'insertion),
     * en désactivant les clés étrangères le temps de l'opération. Évite la
     * transaction unique géante sur les tables volumineuses.
     */
    private function restoreTableBatched(string $table, array $rows): int
    {
        $this->disableForeignKeys();

        try {
            DB::table($table)->delete();

            $total = 0;
            foreach (array_chunk($rows, 500) as $chunk) {
                if (! empty($chunk)) {
                    DB::transaction(fn () => DB::table($table)->insert($chunk));
                    $total += count($chunk);
                }
            }

            return $total;
        } finally {
            $this->enableForeignKeys();
        }
    }

    /** Restaure depuis un export SQL (vide les tables visées puis rejoue le script). */
    private function restoreSql(string $contents): array
    {
        preg_match_all('/INSERT\s+INTO\s+"([^"]+)"/i', $contents, $matches);
        $tables = array_values(array_unique($matches[1] ?? []));

        try {
            DB::transaction(function () use ($contents, $tables): void {
                $this->deferForeignKeys();

                foreach ($tables as $table) {
                    if (Schema::hasTable($table)) {
                        DB::table($table)->delete();
                    }
                }

                DB::unprepared($contents);
            });
        } finally {
            $this->restoreForeignKeys();
        }

        return ['format' => 'sql', 'tables' => count($tables)];
    }

    /** Restaure un dump natif PostgreSQL via `pg_restore` (drop + recreate). */
    private function restorePgDump(string $dumpPath): array
    {
        $c = $this->pgConnection();

        $process = new Process([
            'pg_restore',
            '--clean', '--if-exists', '--no-owner', '--no-privileges',
            '-h', $c['host'], '-p', (string) $c['port'],
            '-U', $c['username'], '-d', $c['database'],
            $dumpPath,
        ], null, ['PGPASSWORD' => $c['password']], null, self::PROCESS_TIMEOUT);

        $process->run();

        // pg_restore peut émettre des avertissements non bloquants (exit 1) ;
        // on échoue seulement sur une erreur franche (exit >= 2).
        if ($process->getExitCode() >= 2) {
            throw new \RuntimeException('pg_restore a échoué : '.mb_substr($process->getErrorOutput(), 0, 500));
        }

        return ['format' => 'dump', 'tables' => 0];
    }

    /** Désactive / diffère les contraintes de clés étrangères le temps de la restauration. */
    private function deferForeignKeys(): void
    {
        try {
            match (DB::getDriverName()) {
                'sqlite' => DB::statement('PRAGMA defer_foreign_keys = ON'),
                'mysql' => DB::statement('SET FOREIGN_KEY_CHECKS=0'),
                'pgsql' => DB::statement("SET session_replication_role = 'replica'"),
                default => null,
            };
        } catch (\Throwable) {
            // Best effort selon les privilèges du compte SGBD
        }
    }

    private function restoreForeignKeys(): void
    {
        try {
            match (DB::getDriverName()) {
                'mysql' => DB::statement('SET FOREIGN_KEY_CHECKS=1'),
                'pgsql' => DB::statement("SET session_replication_role = 'origin'"),
                default => null,
            };
        } catch (\Throwable) {
            // Best effort
        }
    }

    /**
     * Vérifie l'intégrité d'une sauvegarde stockée en recalculant son empreinte.
     *
     * @return array{ok:bool, reason:string}
     */
    public function verify(Backup $backup): array
    {
        if ($backup->status !== 'completed') {
            return ['ok' => false, 'reason' => "La sauvegarde n'est pas complète."];
        }
        if (! Storage::disk($this->disk())->exists($backup->path)) {
            return ['ok' => false, 'reason' => 'Fichier introuvable sur le stockage.'];
        }
        if (! $backup->checksum) {
            return ['ok' => false, 'reason' => 'Aucune empreinte enregistrée (sauvegarde antérieure).'];
        }

        $ctx = hash_init('sha256');
        $stream = Storage::disk($this->disk())->readStream($backup->path);
        while (! feof($stream)) {
            hash_update($ctx, (string) fread($stream, 262144));
        }
        fclose($stream);

        return hash_final($ctx) === $backup->checksum
            ? ['ok' => true, 'reason' => 'Fichier intègre (empreinte conforme).']
            : ['ok' => false, 'reason' => 'Empreinte différente : le fichier est corrompu.'];
    }

    /** Alerte les administrateurs par e-mail en cas d'échec de sauvegarde. */
    private function notifyFailure(Backup $backup): void
    {
        try {
            $admins = User::role(Roles::ADMINISTRATOR)->whereNotNull('email')->get();
            if ($admins->isNotEmpty()) {
                Notification::send($admins, new BackupFailedNotification($backup));
            }
        } catch (\Throwable) {
            // Messagerie non configurée : on n'empêche pas le flux de sauvegarde.
        }
    }

    /** Désactive les clés étrangères hors transaction (restauration ciblée par lots). */
    private function disableForeignKeys(): void
    {
        try {
            match (DB::getDriverName()) {
                'sqlite' => DB::statement('PRAGMA foreign_keys = OFF'),
                'mysql' => DB::statement('SET FOREIGN_KEY_CHECKS=0'),
                'pgsql' => DB::statement("SET session_replication_role = 'replica'"),
                default => null,
            };
        } catch (\Throwable) {
            // Best effort selon les privilèges du compte SGBD
        }
    }

    private function enableForeignKeys(): void
    {
        try {
            match (DB::getDriverName()) {
                'sqlite' => DB::statement('PRAGMA foreign_keys = ON'),
                'mysql' => DB::statement('SET FOREIGN_KEY_CHECKS=1'),
                'pgsql' => DB::statement("SET session_replication_role = 'origin'"),
                default => null,
            };
        } catch (\Throwable) {
            // Best effort
        }
    }

    /** Supprime un enregistrement de sauvegarde et son fichier. */
    public function delete(Backup $backup): void
    {
        if (Storage::disk($this->disk())->exists($backup->path)) {
            Storage::disk($this->disk())->delete($backup->path);
        }

        $backup->delete();
    }

    /**
     * Export JSON gzippé, écrit en flux (une ligne chargée à la fois).
     * Structure identique à l'ancien format : {generated_at, driver, tables:{...}}.
     */
    private function writeJsonGz(string $tmp): void
    {
        $gz = gzopen($tmp, 'wb6');
        if ($gz === false) {
            throw new \RuntimeException('Impossible d\'ouvrir le fichier de sauvegarde temporaire.');
        }

        $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;

        gzwrite($gz, '{"generated_at":'.json_encode(now()->toIso8601String())
            .',"driver":'.json_encode(DB::getDriverName())
            .',"tables":{');

        $firstTable = true;
        foreach ($this->tables() as $table) {
            gzwrite($gz, ($firstTable ? '' : ',').json_encode($table).':[');
            $firstRow = true;
            foreach (DB::table($table)->cursor() as $row) {
                gzwrite($gz, ($firstRow ? '' : ',').json_encode((array) $row, $flags));
                $firstRow = false;
            }
            gzwrite($gz, ']');
            $firstTable = false;
        }

        gzwrite($gz, '}}');
        gzclose($gz);
    }

    /** Export SQL gzippé (INSERT, données uniquement), écrit en flux. */
    private function writeSqlGz(string $tmp): void
    {
        $gz = gzopen($tmp, 'wb6');
        if ($gz === false) {
            throw new \RuntimeException('Impossible d\'ouvrir le fichier de sauvegarde temporaire.');
        }

        gzwrite($gz, "-- Sauvegarde Dalibi\n");
        gzwrite($gz, '-- Généré le '.now()->toDateTimeString()."\n");
        gzwrite($gz, '-- SGBD : '.DB::getDriverName()."\n\n");

        foreach ($this->tables() as $table) {
            $columns = null;
            foreach (DB::table($table)->cursor() as $row) {
                $arr = (array) $row;
                if ($columns === null) {
                    $columns = array_keys($arr);
                    $colList = implode(', ', array_map(fn ($c) => '"'.$c.'"', $columns));
                    gzwrite($gz, "-- Table : {$table}\n");
                }
                $values = array_map(fn ($v) => $this->quote($v), array_values($arr));
                gzwrite($gz, sprintf('INSERT INTO "%s" (%s) VALUES (%s);'."\n", $table, $colList, implode(', ', $values)));
            }
            if ($columns !== null) {
                gzwrite($gz, "\n");
            }
        }

        gzclose($gz);
    }

    /** Dump natif PostgreSQL au format custom (compressé, schéma + données inclus). */
    private function pgDump(string $tmp): void
    {
        $c = $this->pgConnection();

        $process = new Process([
            'pg_dump',
            '-Fc', '-Z', '6', '--no-owner', '--no-privileges',
            '-h', $c['host'], '-p', (string) $c['port'],
            '-U', $c['username'], '-d', $c['database'],
            '-f', $tmp,
        ], null, ['PGPASSWORD' => $c['password']], null, self::PROCESS_TIMEOUT);

        $process->run();

        if (! $process->isSuccessful()) {
            throw new \RuntimeException('pg_dump indisponible ou en échec : '.mb_substr($process->getErrorOutput(), 0, 300));
        }
    }

    /** Paramètres de connexion PostgreSQL de la connexion par défaut. */
    private function pgConnection(): array
    {
        $conn = config('database.connections.'.config('database.default'));

        return [
            'host' => $conn['host'] ?? '127.0.0.1',
            'port' => $conn['port'] ?? 5432,
            'database' => $conn['database'] ?? '',
            'username' => $conn['username'] ?? '',
            'password' => (string) ($conn['password'] ?? ''),
        ];
    }

    /** Décompresse un fichier .gz vers $dest, en flux. */
    private function gunzip(string $src, string $dest): void
    {
        $in = gzopen($src, 'rb');
        $out = fopen($dest, 'wb');
        if ($in === false || $out === false) {
            throw new \RuntimeException('Impossible de décompresser le fichier de sauvegarde.');
        }

        while (! gzeof($in)) {
            fwrite($out, (string) gzread($in, 262144));
        }

        gzclose($in);
        fclose($out);
    }

    /** Formate une valeur pour une instruction SQL. */
    private function quote(mixed $value): string
    {
        if ($value === null) {
            return 'NULL';
        }
        if (is_bool($value)) {
            return $value ? 'TRUE' : 'FALSE';
        }
        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }

        return "'".str_replace("'", "''", (string) $value)."'";
    }

    /** Liste des tables à sauvegarder (préfixe de schéma retiré, tables transitoires exclues). */
    private function tables(): array
    {
        return collect(Schema::getTableListing())
            ->map(fn ($t) => str_contains($t, '.') ? substr($t, strrpos($t, '.') + 1) : $t)
            ->reject(fn ($t) => in_array($t, self::EXCLUDED, true))
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    /** Disque de destination : suit la configuration centralisée (local ou S3/R2 distant). */
    private function disk(): string
    {
        return 'media';
    }

    private function driverName(): string
    {
        return FileStorageSetting::get('driver', 'local') === 's3' ? 's3' : 'local';
    }

    /** Conserve uniquement les N dernières sauvegardes (par format). */
    private function applyRetention(): void
    {
        $retention = (int) BackupSetting::get('retention', 10);
        if ($retention <= 0) {
            return;
        }

        foreach (['json', 'sql'] as $format) {
            Backup::where('format', $format)
                ->where('status', 'completed')
                ->where('locked', false) // les archives d'année scolaire ne sont jamais purgées
                ->orderByDesc('created_at')
                ->skip($retention)
                ->take(PHP_INT_MAX)
                ->get()
                ->each(fn (Backup $b) => $this->delete($b));
        }
    }

    public static function lastBackupAt(): ?Carbon
    {
        return Backup::where('status', 'completed')->latest()->value('created_at');
    }
}
