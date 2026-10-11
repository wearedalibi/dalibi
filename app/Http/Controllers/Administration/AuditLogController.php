<?php

namespace App\Http\Controllers\Administration;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('view_audit_logs'), 403);

        $search = trim((string) $request->query('search', ''));
        $event = (string) $request->query('event', '');
        $type = (string) $request->query('type', '');

        $logs = AuditLog::query()
            ->with('user:id,firstname,lastname')
            ->when($search !== '', fn ($q) => $q->where('label', 'like', "%{$search}%"))
            ->when($event !== '', fn ($q) => $q->where('event', $event))
            ->when($type !== '', fn ($q) => $q->where('auditable_type', $type))
            ->orderByDesc('created_at')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (AuditLog $log) => [
                'id' => $log->id,
                'event' => $log->event,
                'entity' => $log->entityType(),
                'label' => $log->label,
                'user' => $log->user ? trim($log->user->firstname.' '.$log->user->lastname) : null,
                'changes' => $this->summarizeChanges($log),
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at?->format('d/m/Y H:i'),
            ]);

        // Types d'entités présents dans le journal (pour le filtre).
        $types = AuditLog::query()
            ->select('auditable_type')->distinct()->pluck('auditable_type')
            ->mapWithKeys(fn ($t) => [$t => class_basename($t)])
            ->sort();

        return Inertia::render('Administration/AuditLogs/Index', [
            'logs' => $logs,
            'types' => $types,
            'filters' => ['search' => $search, 'event' => $event, 'type' => $type],
        ]);
    }

    /** Liste lisible des champs modifiés. */
    private function summarizeChanges(AuditLog $log): array
    {
        $keys = array_keys($log->new_values ?? $log->old_values ?? []);

        return collect($keys)->map(function (string $key) use ($log) {
            return [
                'field' => $key,
                'old' => $this->stringify($log->old_values[$key] ?? null),
                'new' => $this->stringify($log->new_values[$key] ?? null),
            ];
        })->all();
    }

    private function stringify(mixed $value): string
    {
        if ($value === null) {
            return '—';
        }
        if (is_bool($value)) {
            return $value ? 'oui' : 'non';
        }
        if (is_array($value)) {
            return '[…]';
        }

        return mb_strimwidth((string) $value, 0, 80, '…');
    }
}
