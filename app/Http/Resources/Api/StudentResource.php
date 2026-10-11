<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $classroom = $this->relationLoaded('enrollments')
            ? $this->enrollments->first()?->classroom
            : null;

        return [
            'id' => $this->id,
            'matricule' => $this->matricule,
            'firstname' => $this->firstname,
            'lastname' => $this->lastname,
            'gender' => $this->gender,
            'class' => $classroom?->name,
            'relationship' => $this->whenPivotLoaded('guardian_student', fn () => $this->pivot->relationship),
        ];
    }
}
