<?php

namespace Tests\Feature;

use App\Models\AbsencePermission;
use App\Models\Evaluation;
use App\Models\NoteReclamation;
use App\Models\ReportCard;
use App\Models\User;
use App\Policies\AbsencePermissionPolicy;
use App\Policies\EvaluationPolicy;
use App\Policies\NoteReclamationPolicy;
use App\Policies\ReportCardPolicy;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PolicyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    /** @param array<int,string> $permissions */
    private function userWith(array $permissions): User
    {
        $user = User::factory()->create();
        if ($permissions !== []) {
            $user->givePermissionTo($permissions);
        }

        return $user->fresh();
    }

    public function test_enter_marks_allowed_only_on_open_evaluation(): void
    {
        $user = $this->userWith(['create_marks']);
        $policy = new EvaluationPolicy;

        $open = (new Evaluation)->forceFill(['locked_at' => null]);
        $locked = (new Evaluation)->forceFill(['locked_at' => now()]);

        $this->assertTrue($policy->enterMarks($user, $open)->allowed());
        $this->assertTrue($policy->enterMarks($user, $locked)->denied());
        $this->assertSame(
            'Cette évaluation est clôturée. Veuillez déposer une réclamation pour modifier les notes.',
            $policy->enterMarks($user, $locked)->message()
        );
    }

    public function test_enter_marks_denied_without_permission(): void
    {
        $user = $this->userWith([]);
        $open = (new Evaluation)->forceFill(['locked_at' => null]);

        $this->assertTrue((new EvaluationPolicy)->enterMarks($user, $open)->denied());
    }

    public function test_report_card_update_requires_validate_permission(): void
    {
        $canValidate = $this->userWith(['validate_bulletins']);
        $readOnly = $this->userWith(['view_bulletins']);
        $card = new ReportCard;
        $policy = new ReportCardPolicy;

        $this->assertTrue($policy->update($canValidate, $card));
        $this->assertFalse($policy->update($readOnly, $card));
    }

    public function test_note_reclamation_review_only_when_pending(): void
    {
        $user = $this->userWith(['review_note_reclamations']);
        $policy = new NoteReclamationPolicy;

        $pending = (new NoteReclamation)->forceFill(['status' => 'pending']);
        $treated = (new NoteReclamation)->forceFill(['status' => 'approved']);

        $this->assertTrue($policy->review($user, $pending)->allowed());
        $this->assertTrue($policy->review($user, $treated)->denied());
    }

    public function test_absence_permission_review_only_when_pending(): void
    {
        $user = $this->userWith(['review_absence_permissions']);
        $policy = new AbsencePermissionPolicy;

        $pending = (new AbsencePermission)->forceFill(['status' => 'pending']);
        $treated = (new AbsencePermission)->forceFill(['status' => 'rejected']);

        $this->assertTrue($policy->review($user, $pending)->allowed());
        $this->assertTrue($policy->review($user, $treated)->denied());
    }
}
