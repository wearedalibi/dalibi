<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReportCardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'period' => $this->payload['period']['name'] ?? null,
            'average' => $this->average,
            'rank' => $this->rank,
            'mention' => $this->mention,
            'issued_at' => $this->locked_at?->toIso8601String(),
        ];
    }
}
