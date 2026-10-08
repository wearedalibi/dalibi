<?php

namespace App\Http\Controllers\Notes;

use App\Constants\Roles;
use App\Http\Controllers\Controller;
use App\Http\Requests\ReviewNoteReclamationRequest;
use App\Http\Requests\StoreNoteReclamationRequest;
use App\Models\Evaluation;
use App\Models\Mark;
use App\Models\NoteReclamation;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class NoteReclamationController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('view_note_reclamations'), 403);

        $status = $request->string('status')->toString();
        $user = $request->user();

        $query = NoteReclamation::query()
            ->with([
                'student:id,firstname,lastname,matricule',
                'evaluation:id,evaluation_template_id,class_subject_id',
                'evaluation.template:id,name,academic_period_id',
                'evaluation.template.academicPeriod:id,name',
                'evaluation.classSubject:id,class_id,subject_id',
                'evaluation.classSubject.class:id,name,code',
                'evaluation.classSubject.subject:id,name',
                'requestedBy:id,firstname,lastname',
                'reviewedBy:id,firstname,lastname',
            ])
            ->when(
                $status && in_array($status, ['pending', 'approved', 'rejected'], true),
                fn ($q) => $q->where('status', $status)
            )
            ->when($user->hasRole(Roles::TEACHER), fn ($q) => $q->where('requested_by', $user->id))
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END")
            ->orderByDesc('created_at');

        $reclamations = $query->paginate(20)->withQueryString();

        return Inertia::render('Notes/NoteReclamations/Index', [
            'reclamations' => $reclamations,
            'filters' => ['status' => $status],
            'canReview' => $user->can('review_note_reclamations'),
        ]);
    }

    public function create(Request $request): Response
    {
        abort_unless($request->user()->can('create_note_reclamations'), 403);

        $evaluationId = $request->string('evaluation_id')->toString();
        $studentId = $request->string('student_id')->toString();

        $evaluation = Evaluation::with([
            'template:id,name,coefficient,max_score,academic_period_id',
            'template.academicPeriod:id,name',
            'classSubject:id,class_id,subject_id',
            'classSubject.class:id,name,code',
            'classSubject.subject:id,name',
        ])->findOrFail($evaluationId);

        if (! $evaluation->locked_at) {
            return redirect()->route('evaluations.index')
                ->with('warning', "Cette évaluation n'est pas clôturée.");
        }

        $student = Student::findOrFail($studentId);

        $existingMark = Mark::where('evaluation_id', $evaluationId)
            ->where('student_id', $studentId)
            ->first();

        $pendingExists = NoteReclamation::where('evaluation_id', $evaluationId)
            ->where('student_id', $studentId)
            ->where('status', 'pending')
            ->exists();

        return Inertia::render('Notes/NoteReclamations/Create', [
            'evaluation' => $evaluation,
            'student' => $student->only(['id', 'firstname', 'lastname', 'matricule']),
            'originalScore' => $existingMark?->score !== null ? (float) $existingMark->score : null,
            'pendingExists' => $pendingExists,
        ]);
    }

    public function store(StoreNoteReclamationRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $evaluation = Evaluation::findOrFail($data['evaluation_id']);

        if (! $evaluation->locked_at) {
            return back()->withErrors(['evaluation' => "Cette évaluation n'est pas clôturée."]);
        }

        $exists = NoteReclamation::where('evaluation_id', $data['evaluation_id'])
            ->where('student_id', $data['student_id'])
            ->where('status', 'pending')
            ->exists();

        if ($exists) {
            return back()->withErrors(['evaluation' => 'Une réclamation est déjà en cours pour cet élève.']);
        }

        NoteReclamation::create([
            ...$data,
            'requested_by' => auth()->id(),
        ]);

        return redirect()->route('note-reclamations.index')
            ->with('message', 'Réclamation déposée avec succès.');
    }

    public function show(Request $request, NoteReclamation $noteReclamation): Response
    {
        abort_unless($request->user()->can('view_note_reclamations'), 403);

        $noteReclamation->load([
            'student:id,firstname,lastname,matricule',
            'evaluation:id,evaluation_template_id,class_subject_id,locked_at,status',
            'evaluation.template:id,name,coefficient,max_score,academic_period_id',
            'evaluation.template.academicPeriod:id,name',
            'evaluation.classSubject:id,class_id,subject_id',
            'evaluation.classSubject.class:id,name,code',
            'evaluation.classSubject.subject:id,name',
            'requestedBy:id,firstname,lastname',
            'reviewedBy:id,firstname,lastname',
        ]);

        return Inertia::render('Notes/NoteReclamations/Show', [
            'reclamation' => $noteReclamation,
            'canReview' => $request->user()->can('review_note_reclamations'),
        ]);
    }

    public function review(ReviewNoteReclamationRequest $request, NoteReclamation $noteReclamation): RedirectResponse
    {
        $decision = Gate::inspect('review', $noteReclamation);
        if ($decision->denied()) {
            return back()->withErrors(['status' => $decision->message()]);
        }

        $data = $request->validated();
        $evaluation = $noteReclamation->evaluation()->with('template:id,max_score')->first();
        $maxScore = (float) ($evaluation?->template?->max_score ?? 9999);

        if ($data['status'] === 'approved' && isset($data['corrected_score']) && $data['corrected_score'] > $maxScore) {
            return back()->withErrors(['corrected_score' => "La note corrigée ne peut pas dépasser {$maxScore}."]);
        }

        DB::transaction(function () use ($noteReclamation, $data): void {
            $noteReclamation->update([
                'status' => $data['status'],
                'reviewed_by' => auth()->id(),
                'reviewed_at' => now(),
                'corrected_score' => $data['corrected_score'] ?? null,
                'correction_note' => $data['correction_note'] ?? null,
            ]);

            if ($data['status'] === 'approved' && isset($data['corrected_score'])) {
                Mark::updateOrCreate(
                    [
                        'evaluation_id' => $noteReclamation->evaluation_id,
                        'student_id' => $noteReclamation->student_id,
                    ],
                    [
                        'score' => $data['corrected_score'],
                        'absent' => false,
                        'created_by' => auth()->id(),
                    ]
                );
            }
        });

        $msg = $data['status'] === 'approved'
            ? 'Réclamation approuvée et note corrigée.'
            : 'Réclamation rejetée.';

        return redirect()->route('note-reclamations.index')->with('message', $msg);
    }
}
