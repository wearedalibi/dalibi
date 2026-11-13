import { format, isToday } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from '@/helpers/i18n';
import { CalEvent, fromMinutes, packWeek, solidClass, toISO, toMinutes } from './utils';
import type { DragPayload } from './month-view';

/** Plage horaire affichée et granularité. */
const DAY_START = 7 * 60;
const DAY_END = 19 * 60;
const SLOT = 30;
const SLOT_H = 28; // px pour 30 min

export interface TimeDragPayload extends DragPayload {
    /** Minutes depuis minuit au point de saisie (événements horaires). */
    grabMin?: number;
}

interface Props {
    days: Date[];
    events: CalEvent[];
    canEdit: boolean;
    canCreate: boolean;
    onCreateAt: (day: Date, time?: string) => void;
    onEditEvent: (e: CalEvent) => void;
    onDrop: (payload: TimeDragPayload, day: Date, minutes?: number) => void;
}

const slotCount = (DAY_END - DAY_START) / SLOT;
const gridHeight = slotCount * SLOT_H;

const readPayload = (ev: React.DragEvent): TimeDragPayload | null => {
    try {
        return JSON.parse(ev.dataTransfer.getData('application/json')) as TimeDragPayload;
    } catch {
        return null;
    }
};

export function TimeGridView({ days, events, canEdit, canCreate, onCreateAt, onEditEvent, onDrop }: Readonly<Props>) {
    const { t, locale } = useTranslation();
    const dfLocale = locale === 'en' ? enUS : fr;
    const allDay = events.filter((e) => e.all_day);
    const timed = events.filter((e) => !e.all_day && e.start_time);
    const segs = packWeek(allDay, days);
    const cols = `4rem repeat(${days.length}, minmax(0, 1fr))`;

    return (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
            {/* En-tête des jours */}
            <div className="grid border-b border-slate-100 bg-slate-50/60" style={{ gridTemplateColumns: cols }}>
                <div />
                {days.map((d) => (
                    <div key={toISO(d)} className="px-2 py-2 text-center">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            {format(d, 'EEE', { locale: dfLocale })}
                        </div>
                        <span
                            className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                                isToday(d) ? 'bg-blue-600 text-white' : 'text-gray-700'
                            }`}
                        >
                            {d.getDate()}
                        </span>
                    </div>
                ))}
            </div>

            {/* Bandeau « journée entière » */}
            <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: cols }}>
                <div className="px-2 py-2 text-right text-[10px] uppercase tracking-wide text-gray-400">{t('calendar.all_day_label')}</div>
                <div className="relative min-h-[34px] py-1" style={{ gridColumn: '2 / -1' }}>
                    {/* Cibles de drop (une par jour) */}
                    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))` }}>
                        {days.map((d) => (
                            <button
                                type="button"
                                key={toISO(d)}
                                onClick={() => canCreate && onCreateAt(d)}
                                onDragOver={(e) => canEdit && e.preventDefault()}
                                onDrop={(e) => {
                                    if (!canEdit) return;
                                    e.preventDefault();
                                    const p = readPayload(e);
                                    if (p) onDrop(p, d);
                                }}
                                className={`border-r border-slate-100 last:border-r-0 ${canCreate ? 'hover:bg-blue-50/40' : ''}`}
                            />
                        ))}
                    </div>
                    {/* Barres multi-jours */}
                    <div className="pointer-events-none relative grid gap-y-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))` }}>
                        {segs.map((seg) => {
                            const e = seg.event;
                            return (
                                <button
                                    key={e.id}
                                    type="button"
                                    draggable={canEdit}
                                    onDragStart={(ev) =>
                                        ev.dataTransfer.setData(
                                            'application/json',
                                            JSON.stringify({ id: e.id, mode: 'move', grabDay: toISO(days[seg.col - 1]) }),
                                        )
                                    }
                                    onClick={() => onEditEvent(e)}
                                    style={{
                                        gridColumn: `${seg.col} / span ${seg.span}`,
                                        gridRow: seg.lane + 1,
                                        ...(e.color ? { backgroundColor: e.color } : {}),
                                    }}
                                    className={`pointer-events-auto mx-0.5 truncate px-1.5 py-0.5 text-left text-[11px] font-medium text-white shadow-sm ${
                                        e.color ? '' : solidClass(e.type)
                                    } ${seg.startsHere ? 'rounded-l-md' : ''} ${seg.endsHere ? 'rounded-r-md' : ''} ${
                                        canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                                    }`}
                                >
                                    {e.title}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Grille horaire */}
            <div className="grid overflow-x-auto" style={{ gridTemplateColumns: cols }}>
                {/* Colonne des heures */}
                <div className="relative" style={{ height: gridHeight }}>
                    {Array.from({ length: slotCount }).map((_, i) => {
                        const min = DAY_START + i * SLOT;
                        return min % 60 === 0 ? (
                            <div
                                key={min}
                                style={{ top: i * SLOT_H }}
                                className="absolute right-1 -translate-y-1/2 text-[10px] text-gray-400"
                            >
                                {fromMinutes(min)}
                            </div>
                        ) : null;
                    })}
                </div>

                {/* Colonnes des jours */}
                {days.map((day) => {
                    const dayEvents = timed.filter((e) => e.start_date === toISO(day));
                    return (
                        <div key={toISO(day)} className="relative border-l border-slate-100" style={{ height: gridHeight }}>
                            {/* Créneaux : lignes + clic/drop */}
                            {Array.from({ length: slotCount }).map((_, i) => {
                                const min = DAY_START + i * SLOT;
                                return (
                                    <button
                                        type="button"
                                        key={min}
                                        onClick={() => canCreate && onCreateAt(day, fromMinutes(min))}
                                        onDragOver={(e) => canEdit && e.preventDefault()}
                                        onDrop={(e) => {
                                            if (!canEdit) return;
                                            e.preventDefault();
                                            const p = readPayload(e);
                                            if (p) onDrop(p, day, min);
                                        }}
                                        style={{ top: i * SLOT_H, height: SLOT_H }}
                                        className={`absolute inset-x-0 border-t ${
                                            min % 60 === 0 ? 'border-slate-100' : 'border-slate-50'
                                        } ${canCreate ? 'hover:bg-blue-50/40' : ''}`}
                                    />
                                );
                            })}

                            {/* Événements horaires */}
                            {dayEvents.map((e) => {
                                const s = Math.max(toMinutes(e.start_time) ?? DAY_START, DAY_START);
                                const en = Math.min(toMinutes(e.end_time) ?? s + SLOT, DAY_END);
                                const top = ((s - DAY_START) / SLOT) * SLOT_H;
                                const h = Math.max(((en - s) / SLOT) * SLOT_H, SLOT_H * 0.8);
                                return (
                                    <div
                                        key={e.id}
                                        style={{ top, height: h, ...(e.color ? { backgroundColor: e.color } : {}) }}
                                        className={`absolute inset-x-1 overflow-hidden rounded-md text-white shadow-sm ${
                                            e.color ? '' : solidClass(e.type)
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            draggable={canEdit}
                                            onDragStart={(ev) =>
                                                ev.dataTransfer.setData(
                                                    'application/json',
                                                    JSON.stringify({ id: e.id, mode: 'move', grabDay: toISO(day), grabMin: s }),
                                                )
                                            }
                                            onClick={() => onEditEvent(e)}
                                            className={`h-full w-full px-1.5 py-0.5 text-left ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                                        >
                                            <div className="truncate text-[11px] font-semibold leading-tight">{e.title}</div>
                                            <div className="truncate text-[10px] opacity-85">
                                                {e.start_time}
                                                {e.end_time ? `–${e.end_time}` : ''}
                                            </div>
                                        </button>
                                        {canEdit && (
                                            <span
                                                draggable
                                                onDragStart={(ev) => {
                                                    ev.stopPropagation();
                                                    ev.dataTransfer.setData(
                                                        'application/json',
                                                        JSON.stringify({ id: e.id, mode: 'resize-end', grabDay: toISO(day) }),
                                                    );
                                                }}
                                                title={t('calendar.resize_hint')}
                                                className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize bg-black/20 opacity-0 transition hover:opacity-100"
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
