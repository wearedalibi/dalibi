<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

abstract class ApiController extends Controller
{
    /**
     * Élèves accessibles au principal authentifié : un tuteur → ses enfants,
     * un élève → lui-même.
     *
     * @return Collection<int, Student>
     */
    protected function accessibleStudents(Request $request): Collection
    {
        // Ces routes API authentifient un élève ou un tuteur (gardes Sanctum
        // dédiées), jamais le User par défaut supposé par l'analyse statique.
        /** @var Student|Guardian|null $user */
        $user = $request->user();

        if ($user instanceof Student) {
            return collect([$user]);
        }

        if ($user instanceof Guardian) {
            return $user->children()->get();
        }

        abort(403);
    }

    /**
     * Résout l'élève cible UNIQUEMENT s'il est accessible au principal authentifié.
     * - Élève : seulement lui-même (403 sinon).
     * - Tuteur : seulement parmi ses enfants (404 sinon — pas de fuite d'existence).
     */
    protected function resolveStudent(Request $request, string $studentId): Student
    {
        /** @var Student|Guardian|null $user */
        $user = $request->user();

        if ($user instanceof Student) {
            abort_unless($user->id === $studentId, 403);

            return $user;
        }

        if ($user instanceof Guardian) {
            return $user->children()->findOrFail($studentId);
        }

        abort(403);
    }
}
