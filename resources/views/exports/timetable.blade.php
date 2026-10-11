<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        @page { margin: 18px 22px; }
        * { box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; color: #1a1a1a; font-size: 11px; margin: 0; }

        .header { text-align: center; margin-bottom: 14px; }
        .title { margin-top: 8px; font-size: 15px; font-weight: bold; }
        .subtitle { font-size: 11px; color: #444; }

        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #999; padding: 5px 6px; vertical-align: top; }
        th { background: #1d71b8; color: #fff; text-align: center; font-size: 11px; }
        .time-col { background: #eef3f8; font-weight: bold; text-align: center; white-space: nowrap; width: 70px; }
        .slot-subject { font-weight: bold; }
        .slot-meta { font-size: 9px; color: #555; }
        .empty { color: #ccc; text-align: center; }
        .footer { margin-top: 12px; font-size: 9px; color: #888; text-align: right; }
        {{-- En-tête ministérielle unifiée (identique au bulletin). --}}
        {!! $headerCss !!}
    </style>
</head>
<body>
    {!! $headerHtml !!}
    <div class="header">
        <div class="title">{{ $title }}</div>
        <div class="subtitle">{{ $subtitle }}</div>
    </div>

    <table>
        <thead>
            <tr>
                <th class="time-col">Horaire</th>
                @foreach($days as $dayLabel)
                    <th>{{ $dayLabel }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse($timeRanges as $range)
                <tr>
                    <td class="time-col">{{ $range }}</td>
                    @foreach($days as $dayNum => $dayLabel)
                        @php $slot = $grid[$range][$dayNum] ?? null; @endphp
                        <td>
                            @if($slot)
                                <div class="slot-subject">{{ $slot->subject?->name ?? '—' }}</div>
                                {{-- Méta affichée selon le contexte (relation réellement chargée) :
                                     enseignant pour l'emploi du temps d'une classe, classe pour
                                     celui d'un enseignant — sans déclencher de requête supplémentaire. --}}
                                @if($slot->relationLoaded('teacher') && $slot->teacher)<div class="slot-meta">{{ $slot->teacher->name }}</div>@endif
                                @if($slot->relationLoaded('classroom') && $slot->classroom)<div class="slot-meta">{{ $slot->classroom->name }}</div>@endif
                                @if($slot->room)<div class="slot-meta">Salle : {{ $slot->room }}</div>@endif
                            @else
                                <div class="empty">—</div>
                            @endif
                        </td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td colspan="{{ count($days) + 1 }}" style="text-align:center; padding: 20px; color:#999;">
                        Aucun créneau enregistré.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">Généré le {{ now()->format('d/m/Y à H:i') }}</div>
</body>
</html>
