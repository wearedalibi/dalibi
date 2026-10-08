<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Mail\GuardianInvitation;
use App\Models\Guardian;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $login = $request->string('login')->toString();
        $password = $request->string('password')->toString();

        // 1) Tuteur (par e-mail)
        $guardian = Guardian::where('email', $login)->where('is_active', true)->first();
        if ($guardian && $guardian->password && Hash::check($password, $guardian->password)) {
            return $this->tokenResponse($guardian, 'guardian');
        }

        // 2) Élève (par e-mail ou matricule)
        $student = Student::where('portal_active', true)
            ->where(fn ($q) => $q->where('email', $login)->orWhere('matricule', $login))
            ->first();
        if ($student && $student->password && Hash::check($password, $student->password)) {
            return $this->tokenResponse($student, 'student');
        }

        throw ValidationException::withMessages(['login' => ['Identifiants invalides.']]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $type = $user instanceof Guardian ? 'guardian' : 'student';

        return response()->json(['type' => $type, 'user' => $this->profile($user, $type)]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }

    /** Demande de réinitialisation (réponse générique : pas d'énumération de comptes). */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $guardian = Guardian::where('email', $request->string('email'))->where('is_active', true)->first();
        if ($guardian) {
            $this->sendResetLink($guardian, isReset: true);
        }

        return response()->json(['message' => 'Si un compte existe pour cet e-mail, un lien a été envoyé.']);
    }

    /** Définit le mot de passe via un jeton valide (activation ou réinitialisation). */
    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $guardian = Guardian::where('email', $data['email'])->first();
        if (! $guardian || ! $guardian->isResetTokenValid($data['token'])) {
            throw ValidationException::withMessages(['token' => ['Lien invalide ou expiré.']]);
        }

        $guardian->password = $data['password'];
        $guardian->email_verified_at = now();
        $guardian->save();
        $guardian->clearResetToken();

        return $this->tokenResponse($guardian, 'guardian');
    }

    /** Émet un jeton et envoie l'e-mail d'invitation / réinitialisation. */
    public function sendResetLink(Guardian $guardian, bool $isReset): void
    {
        $token = $guardian->issueResetToken();
        $url = rtrim(config('app.url'), '/').'/portal/reset?email='.urlencode($guardian->email).'&token='.$token;

        Mail::to($guardian->email)->send(new GuardianInvitation($guardian, $url, $isReset));
    }

    private function tokenResponse(Guardian|Student $user, string $type): JsonResponse
    {
        $token = $user->createToken('portal', ['read'])->plainTextToken;

        return response()->json([
            'token' => $token,
            'type' => $type,
            'user' => $this->profile($user, $type),
        ]);
    }

    private function profile(Guardian|Student $user, string $type): array
    {
        if ($type === 'guardian') {
            return [
                'id' => $user->id,
                'name' => $user->fullName(),
                'email' => $user->email,
                'phone' => $user->phone,
            ];
        }

        return [
            'id' => $user->id,
            'name' => trim($user->firstname.' '.$user->lastname),
            'matricule' => $user->matricule,
        ];
    }
}
