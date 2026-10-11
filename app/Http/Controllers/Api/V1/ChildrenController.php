<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\Api\StudentResource;
use App\Models\Enrollment;
use App\Models\Guardian;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ChildrenController extends ApiController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $withActiveEnrollment = ['enrollments' => fn ($q) => $q->where('status', Enrollment::STATUS_ACTIVE)->with('classroom:id,name')];

        $user = $request->user();

        if ($user instanceof Student) {
            $user->load($withActiveEnrollment);

            return StudentResource::collection(collect([$user]));
        }

        /** @var Guardian $user */
        $children = $user->children()->with($withActiveEnrollment)->get();

        return StudentResource::collection($children);
    }
}
