<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Affectations - {{ $teacher->firstname }} {{ $teacher->lastname }}</title>
    <style>
        @page { margin: 22px 26px; }
        * { box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; color: #1a1a1a; font-size: 12px; margin: 0; }

        .header { text-align: center; margin-bottom: 16px; }
        .title { margin-top: 10px; font-size: 16px; font-weight: bold; }
        .subtitle { font-size: 12px; color: #444; margin-top: 2px; }

        .meta { margin: 14px 0; font-size: 11px; color: #444; }
        .meta strong { color: #1a1a1a; }

        table { width: 100%; border-collapse: collapse; }
        thead { background: #1d71b8; color: #fff; }
        thead th { padding: 7px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; }
        thead th.center { text-align: center; }
        tbody td { padding: 6px 8px; font-size: 11px; border-bottom: 1px solid #e2e8f0; }
        tbody td.center { text-align: center; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        .badge { font-size: 10px; font-weight: 600; }

        .footer { margin-top: 16px; font-size: 9px; color: #888; display: flex; justify-content: space-between; }
        .sign { margin-top: 36px; text-align: right; font-size: 11px; }
        {{-- En-tête ministérielle unifiée (identique au bulletin). --}}
        {!! $headerCss !!}
    </style>
</head>
<body>
    {!! $headerHtml !!}
    <div class="header">
        <div class="title">FICHE D'AFFECTATIONS</div>
        <div class="subtitle">Enseignant : {{ $teacher->firstname }} {{ $teacher->lastname }} — Année : {{ $year?->year ?? '—' }}</div>
    </div>

    <div class="meta">
        <strong>{{ $assignments->count() }}</strong> affectation(s)
        &nbsp;·&nbsp; Matières : <strong>{{ $assignments->pluck('subject.name')->unique()->count() }}</strong>
        &nbsp;·&nbsp; Classes : <strong>{{ $assignments->pluck('classroom.name')->unique()->count() }}</strong>
    </div>

    <table>
        <thead>
            <tr>
                <th class="center" style="width:30px;">#</th>
                <th>Matière</th>
                <th>Classe</th>
                <th class="center">Statut</th>
                <th>Notes</th>
            </tr>
        </thead>
        <tbody>
            @forelse($assignments as $i => $a)
            <tr>
                <td class="center" style="color:#94a3b8;">{{ $i + 1 }}</td>
                <td><strong>{{ $a->subject?->name ?? '—' }}</strong></td>
                <td>{{ $a->classroom?->name ?? '—' }}</td>
                <td class="center badge">{{ $a->active ? 'Active' : 'Inactive' }}</td>
                <td>{{ $a->notes ?: '—' }}</td>
            </tr>
            @empty
            <tr><td colspan="5" style="text-align:center; padding:20px; color:#999;">Aucune affectation pour cet enseignant sur cette année.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="sign">Le Directeur</div>

    <div class="footer">
        <span>{{ $school?->name ?? '' }}</span>
        <span>Généré le {{ now()->format('d/m/Y à H:i') }}</span>
    </div>
</body>
</html>
