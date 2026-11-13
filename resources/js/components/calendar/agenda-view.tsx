import { CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/helpers/i18n';
import { CalEvent, chipClass } from './utils';

const monthLabel = (ym: string, loc: string) => {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(loc, { month: 'long', year: 'numeric' });
};
const dayLabel = (d: string, loc: string) => new Date(d + 'T00:00:00').toLocaleDateString(loc, { weekday: 'short', day: '2-digit', month: 'short' });

interface Props {
    events: CalEvent[];
    types: Record<string, string>;
    canEdit: boolean;
    canDelete: boolean;
    onEdit: (e: CalEvent) => void;
    onDelete: (id: string) => void;
}

export function AgendaView({ events, types, canEdit, canDelete, onEdit, onDelete }: Readonly<Props>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const byMonth = events.reduce<Record<string, CalEvent[]>>((acc, e) => {
        const key = e.start_date.slice(0, 7);
        (acc[key] ??= []).push(e);
        return acc;
    }, {});
    const months = Object.keys(byMonth).sort();

    if (months.length === 0) {
        return (
            <div className="rounded-2xl bg-white p-12 text-center text-gray-400 ring-1 ring-slate-100 shadow-sm">
                <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" /> {t('calendar.empty')}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {months.map((m) => (
                <div key={m} className="space-y-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 capitalize">{monthLabel(m, dateLocale)}</h2>
                    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 divide-y divide-slate-50">
                        {byMonth[m].map((e) => (
                            <div key={e.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50/50">
                                <div className="w-28 shrink-0 text-sm text-gray-600">
                                    <div className="font-medium capitalize">{dayLabel(e.start_date, dateLocale)}</div>
                                    {e.end_date && e.end_date !== e.start_date && (
                                        <div className="text-xs text-gray-400">→ {dayLabel(e.end_date, dateLocale)}</div>
                                    )}
                                    {!e.all_day && e.start_time && (
                                        <div className="text-xs text-gray-400">
                                            {e.start_time}
                                            {e.end_time ? `–${e.end_time}` : ''}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${chipClass(e.type)}`}>
                                            {types[e.type] ?? e.type}
                                        </span>
                                        <span className="font-medium text-gray-900 truncate">{e.title}</span>
                                    </div>
                                    {e.description && <p className="text-sm text-gray-500 mt-0.5">{e.description}</p>}
                                </div>
                                {(canEdit || canDelete) && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        {canEdit && (
                                            <Button variant="outline" size="sm" onClick={() => onEdit(e)}>
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-red-200 text-red-500 hover:bg-red-50"
                                                onClick={() => onDelete(e.id)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
