<?php

namespace App\Http\Controllers\Eleves;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StudentImportController extends Controller
{
    /** Colonnes attendues (clé canonique => libellé). */
    private const COLUMNS = ['prenom', 'nom', 'sexe', 'date_naissance', 'lieu_naissance', 'nationalite', 'telephone', 'email', 'matricule'];

    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('view_students'), 403);

        return Inertia::render('Eleves/Students/Import', ['result' => null]);
    }

    /** Télécharge un modèle CSV. */
    public function template()
    {
        $header = implode(';', self::COLUMNS);
        $example = implode(';', ['Koffi', 'MENSAH', 'M', '2012-05-14', 'Lomé', 'Togolaise', '+228 90 00 00 00', '', '']);
        $csv = "\xEF\xBB\xBF".$header."\n".$example."\n"; // BOM UTF-8 pour Excel

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="modele-import-eleves.csv"',
        ]);
    }

    public function store(Request $request): Response
    {
        abort_unless($request->user()->can('create_students'), 403);

        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ]);

        $rows = $this->parseCsv($request->file('file')->getRealPath());

        $errors = [];
        $valid = [];
        $seenMat = [];
        $seenMail = [];

        foreach ($rows as $i => $row) {
            $line = $i + 2; // +1 entête, +1 base 1
            $rowErrors = [];

            $prenom = trim($row['prenom'] ?? '');
            $nom = trim($row['nom'] ?? '');
            $sexe = $this->normalizeGender($row['sexe'] ?? '');
            $dob = $this->parseDate($row['date_naissance'] ?? '');
            $mat = trim($row['matricule'] ?? '');
            $email = trim($row['email'] ?? '');

            if ($prenom === '') {
                $rowErrors[] = 'Prénom manquant';
            }
            if ($nom === '') {
                $rowErrors[] = 'Nom manquant';
            }
            if (! $sexe) {
                $rowErrors[] = 'Sexe invalide (M/F)';
            }
            if (! $dob) {
                $rowErrors[] = 'Date de naissance invalide (AAAA-MM-JJ)';
            }

            if ($mat !== '') {
                if (isset($seenMat[$mat])) {
                    $rowErrors[] = 'Matricule en double dans le fichier';
                } elseif (Student::where('matricule', $mat)->exists()) {
                    $rowErrors[] = 'Matricule déjà existant';
                }
                $seenMat[$mat] = true;
            }
            if ($email !== '') {
                if (isset($seenMail[$email])) {
                    $rowErrors[] = 'Email en double dans le fichier';
                } elseif (Student::where('email', $email)->exists()) {
                    $rowErrors[] = 'Email déjà existant';
                }
                $seenMail[$email] = true;
            }

            if ($rowErrors) {
                $errors[] = ['line' => $line, 'name' => trim("$nom $prenom"), 'errors' => $rowErrors];

                continue;
            }

            $valid[] = [
                'firstname' => $prenom,
                'lastname' => $nom,
                'gender' => $sexe,
                'birth_date' => $dob,
                'place_of_birth' => trim($row['lieu_naissance'] ?? '') ?: null,
                'nationality' => trim($row['nationalite'] ?? '') ?: null,
                'phone' => trim($row['telephone'] ?? '') ?: null,
                'email' => $email ?: null,
                'matricule' => $mat ?: null,
                'active' => true,
            ];
        }

        $imported = 0;
        if ($valid) {
            DB::transaction(function () use ($valid, &$imported): void {
                foreach ($valid as $data) {
                    Student::create($data); // matricule + user_id générés par le boot du modèle
                    $imported++;
                }
            });
        }

        return Inertia::render('Eleves/Students/Import', [
            'result' => [
                'total' => count($rows),
                'imported' => $imported,
                'failed' => count($errors),
                'errors' => $errors,
            ],
        ]);
    }

    /**
     * Parse un CSV en lignes associatives selon l'entête.
     *
     * @return array<int, array<string, string>>
     */
    private function parseCsv(string $path): array
    {
        $content = file_get_contents($path);
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content); // retire BOM

        $lines = preg_split('/\r\n|\r|\n/', trim($content));
        if (! $lines || count($lines) < 2) {
            return [];
        }

        $delimiter = substr_count($lines[0], ';') >= substr_count($lines[0], ',') ? ';' : ',';
        $headers = array_map(fn ($h) => $this->normalizeHeader($h), str_getcsv($lines[0], $delimiter));

        $rows = [];
        foreach (array_slice($lines, 1) as $line) {
            if (trim($line) === '') {
                continue;
            }
            $cells = str_getcsv($line, $delimiter);
            $row = [];
            foreach ($headers as $idx => $key) {
                if ($key !== '') {
                    $row[$key] = $cells[$idx] ?? '';
                }
            }
            $rows[] = $row;
        }

        return $rows;
    }

    private function normalizeHeader(string $h): string
    {
        $h = strtolower(trim($h));
        $h = strtr($h, ['é' => 'e', 'è' => 'e', 'ê' => 'e', 'à' => 'a', 'â' => 'a', 'î' => 'i', 'ô' => 'o', 'û' => 'u']);

        return str_replace([' ', '-'], '_', $h);
    }

    private function normalizeGender(string $value): ?string
    {
        $v = strtolower(trim($value));

        return match (true) {
            in_array($v, ['m', 'masculin', 'male', 'garcon', 'garçon'], true) => 'male',
            in_array($v, ['f', 'feminin', 'féminin', 'female', 'fille'], true) => 'female',
            default => null,
        };
    }

    private function parseDate(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        foreach (['Y-m-d', 'd/m/Y', 'd-m-Y'] as $format) {
            try {
                return Carbon::createFromFormat($format, $value)->format('Y-m-d');
            } catch (\Throwable) {
                continue;
            }
        }

        return null;
    }
}
