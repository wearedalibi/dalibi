import { format, isSameMonth, isToday } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from '@/helpers/i18n';
import { CalEvent, packWeek, solidClass, toISO } from './utils';

const MAX_LANES = 3;

export interface DragPayload {
    id: string;
    mode: 'move' | 'resize-end';
    grabDay: string;
}

interface Props {
    days: Date[];
    cursor: Date;
    events: CalEvent[];
    canEdit: boolean;
    canCreate: boolean;
    onCreateAt: (day: Date) => void;
    onEditEvent: (e: CalEvent) => void;
    onDrop: (payload: DragPayload, day: Date) => void;
}

export function MonthView({ days, cursor, events, canEdit, canCreate, onCreateAt, onEditEvent, onDrop }: Readonly<Props>) {
    const { t, locale } = useTranslation();
    const dfLocale = locale === 'en' ? enUS : fr;
    // Découpe la grille en semaines de 7 jours.
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    const weekdayLabels = (weeks[0] ?? days.slice(0, 7)).map((d) => format(d, 'EEE', { locale: dfLocale }));

    const handleDrop = (ev: React.DragEvent, day: Date) => {
        ev.preventDefault();
        try {
            const payload = JSON.parse(ev.dataTransfer.getData('application/json')) as DragPayload;
            if (payload?.id) onDrop(payload, day);
        } catch {
            /* données de drag invalides : on ignore */
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
            {/* En-tête des jours */}
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60">
                {weekdayLabels.map((d, i) => (
                    <div key={i} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {d}
                    </div>
                ))}
            </div>

            {weeks.map((week) => {
                const segs = packWeek(events, week);
                const visible = segs.filter((s) => s.lane < MAX_LANES);
                // Nombre d'événements masqués par jour (pour le « +N »).
                const hiddenPerDay = week.map((_, i) =>
                    segs.filter((s) => s.lane >= MAX_LANES && i + 1 >= s.col && i + 1 < s.col + s.span).length,
                );

                return (
                    <div key={toISO(week[0])} className="relative grid grid-cols-7 border-b border-slate-100 last:border-b-0">
                        {/* Cellules (fond, numéro du jour, clic pour créer, cible de drop) */}
                        {week.map((day) => (
                            <button
                                type="button"
                                key={toISO(day)}
                                onClick={() => canCreate && onCreateAt(day)}
                                onDragOver={(e) => canEdit && e.preventDefault()}
                                onDrop={(e) => canEdit && handleDrop(e, day)}
                                className={`min-h-[118px] border-r border-slate-100 last:border-r-0 p-1.5 text-left align-top transition ${
                                    isSameMonth(day, cursor) ? 'bg-white' : 'bg-slate-50/40'
                                } ${canCreate ? 'hover:bg-blue-50/40 cursor-pointer' : 'cursor-default'}`}
                            >
                                <span
                                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                                        isToday(day)
                                            ? 'bg-blue-600 text-white'
                                            : isSameMonth(day, cursor)
                                              ? 'text-gray-700'
                                              : 'text-gray-300'
                                    }`}
                                >
                                    {day.getDate()}
                                </span>
                            </button>
                        ))}

                        {/* Barres d'événements (superposées, continues sur plusieurs jours) */}
                        <div className="pointer-events-none absolute inset-x-0 top-8 grid grid-cols-7 gap-y-1 px-1">
                            {visible.map((seg) => {
                                const e = seg.event;
                                const style: React.CSSProperties = {
                                    gridColumn: `${seg.col} / span ${seg.span}`,
                                    gridRow: seg.lane + 1,
                                    ...(e.color ? { backgroundColor: e.color } : {}),
                                };
                                return (
                                    <div
                                        key={e.id}
                                        style={style}
                                        className="pointer-events-auto relative mx-0.5 flex items-center"
                                    >
                                        <button
                                            type="button"
                                            draggable={canEdit}
                                            onDragStart={(ev) =>
                                                ev.dataTransfer.setData(
                                                    'application/json',
                                                    JSON.stringify({ id: e.id, mode: 'move', grabDay: toISO(week[seg.col - 1]) }),
                                                )
                                            }
                                            onClick={(ev) => {
                                                ev.stopPropagation();
                                                onEditEvent(e);
                                            }}
                                            title={e.title}
                                            className={`w-full truncate px-1.5 py-0.5 text-left text-[11px] font-medium text-white shadow-sm ${
                                                e.color ? '' : solidClass(e.type)
                                            } ${seg.startsHere ? 'rounded-l-md' : ''} ${seg.endsHere ? 'rounded-r-md' : ''} ${
                                                canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                                            }`}
                                        >
                                            {!e.all_day && e.start_time && seg.startsHere && (
                                                <span className="mr-1 opacity-80">{e.start_time}</span>
                                            )}
                                            {seg.startsHere || seg.col === 1 ? e.title : ' '}
                                        </button>

                                        {/* Poignée de redimensionnement (fin de l'événement) */}
                                        {canEdit && seg.endsHere && (
                                            <span
                                                draggable
                                                onDragStart={(ev) => {
                                                    ev.stopPropagation();
                                                    ev.dataTransfer.setData(
                                                        'application/json',
                                                        JSON.stringify({ id: e.id, mode: 'resize-end', grabDay: toISO(week[seg.col - 1]) }),
                                                    );
                                                }}
                                                title={t('calendar.resize_hint')}
                                                className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize rounded-r-md bg-black/20 opacity-0 transition hover:opacity-100"
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* « +N » lorsque la journée déborde */}
                        <div className="pointer-events-none absolute inset-x-0 bottom-1 grid grid-cols-7 px-1">
                            {hiddenPerDay.map((n, i) =>
                                n > 0 ? (
                                    <span key={toISO(week[i])} style={{ gridColumn: i + 1 }} className="px-1 text-[10px] font-medium text-gray-400">
                                        +{n}
                                    </span>
                                ) : (
                                    <span key={toISO(week[i])} />
                                ),
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
