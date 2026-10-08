<?php

namespace App\Observers;

use App\Events\MatriculeGenerated;
use App\Models\Student;

class StudentObserver
{
    /**
     * Handle the Student "created" event.
     */
    public function created(Student $student): void
    {
        if ($student->matricule) {
            MatriculeGenerated::dispatch(
                $student->matricule,
                'student',
                $student->id,
                'student',
            );
        }
    }
}
