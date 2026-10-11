<?php

namespace App\Http\Controllers\Administration;

use App\Http\Controllers\Controller;
use App\Mail\GuardianInvitation;
use App\Models\Guardian;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class GuardianController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));

        $like = '%'.strtolower($search).'%';

        $guardians = Guardian::query()
            ->withCount('children')
            ->with('children:id,matricule')
            // Recherche insensible à la casse sur le tuteur (nom, e-mail, téléphone)
            // et sur ses enfants (matricule, prénom, nom).
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q
                ->whereRaw('LOWER(first_name) LIKE ?', [$like])
                ->orWhereRaw('LOWER(last_name) LIKE ?', [$like])
                ->orWhereRaw('LOWER(email) LIKE ?', [$like])
                ->orWhereRaw('LOWER(phone) LIKE ?', [$like])
                ->orWhereHas('children', fn ($c) => $c
                    ->whereRaw('LOWER(matricule) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(firstname) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(lastname) LIKE ?', [$like]))))
            ->orderBy('last_name')
            ->paginate(20)->withQueryString()
            ->through(fn (Guardian $g) => [
                'id' => $g->id,
                'first_name' => $g->first_name,
                'last_name' => $g->last_name,
                'name' => $g->fullName(),
                'email' => $g->email,
                'phone' => $g->phone,
                'children_count' => $g->children_count,
                'matricules' => $g->children->pluck('matricule')->all(),
                'is_active' => $g->is_active,
                'activated' => $g->password !== null,
            ]);

        return Inertia::render('Administration/Guardians/Index', [
            'guardians' => $guardians,
            'filters' => ['search' => $search],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Administration/Guardians/Create');
    }

    /** Autocomplétion d'élèves par nom ou matricule (pour lier des enfants). */
    public function searchStudents(Request $request): JsonResponse
    {
        $q = strtolower(trim((string) $request->query('q', '')));
        if ($q === '') {
            return response()->json([]);
        }

        $like = "%{$q}%";
        $students = Student::query()
            ->where(fn ($s) => $s
                ->whereRaw('LOWER(matricule) LIKE ?', [$like])
                ->orWhereRaw('LOWER(firstname) LIKE ?', [$like])
                ->orWhereRaw('LOWER(lastname) LIKE ?', [$like]))
            ->orderBy('lastname')->orderBy('firstname')
            ->limit(10)
            ->get(['matricule', 'firstname', 'lastname'])
            ->map(fn (Student $s) => [
                'matricule' => $s->matricule,
                'name' => trim("{$s->lastname} {$s->firstname}"),
            ]);

        return response()->json($students);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateData($request);

        $guardian = Guardian::create([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'is_active' => true,
        ]);

        $guardian->children()->sync($this->resolveStudentIds($data['student_matricules'] ?? []));

        if (! empty($data['send_invitation'])) {
            $this->sendInvitation($guardian, isReset: false);
        }

        return redirect()->route('guardians.index')->with('message', 'Compte tuteur créé.');
    }

    public function edit(Guardian $guardian): Response
    {
        $guardian->load('children:id,matricule,firstname,lastname');

        return Inertia::render('Administration/Guardians/Edit', [
            'guardian' => [
                'id' => $guardian->id,
                'first_name' => $guardian->first_name,
                'last_name' => $guardian->last_name,
                'email' => $guardian->email,
                'phone' => $guardian->phone,
                'children' => $guardian->children->map(fn ($c) => [
                    'matricule' => $c->matricule,
                    'name' => trim("{$c->lastname} {$c->firstname}"),
                ])->all(),
            ],
        ]);
    }

    public function update(Request $request, Guardian $guardian): RedirectResponse
    {
        $data = $this->validateData($request, $guardian->id);

        $guardian->update([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
        ]);
        $guardian->children()->sync($this->resolveStudentIds($data['student_matricules'] ?? []));

        return redirect()->route('guardians.index')->with('message', 'Compte tuteur mis à jour.');
    }

    public function destroy(Guardian $guardian): RedirectResponse
    {
        $guardian->delete();

        return back()->with('message', 'Compte tuteur supprimé.');
    }

    /** (Re)envoie l'invitation / lien d'activation. */
    public function invite(Guardian $guardian): RedirectResponse
    {
        $this->sendInvitation($guardian, isReset: $guardian->password !== null);

        return back()->with('message', "Invitation envoyée à {$guardian->email}.");
    }

    private function sendInvitation(Guardian $guardian, bool $isReset): void
    {
        $token = $guardian->issueResetToken();
        $url = rtrim(config('app.url'), '/').'/portal/reset?email='.urlencode($guardian->email).'&token='.$token;

        Mail::to($guardian->email)->send(new GuardianInvitation($guardian, $url, $isReset));
    }

    /** @return array<int,string> */
    private function resolveStudentIds(array $matricules): array
    {
        if ($matricules === []) {
            return [];
        }

        return Student::whereIn('matricule', $matricules)->pluck('id')->all();
    }

    private function validateData(Request $request, ?string $ignoreId = null): array
    {
        return $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', Rule::unique('guardians', 'email')->ignore($ignoreId)],
            'phone' => ['nullable', 'string', 'max:30'],
            'student_matricules' => ['array'],
            'student_matricules.*' => ['string', 'exists:students,matricule'],
            'send_invitation' => ['boolean'],
        ]);
    }
}
