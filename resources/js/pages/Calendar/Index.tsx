import { Head, router, usePage } from '@inertiajs/react';
import { addDays, addMonths, addWeeks, differenceInCalendarDays, eachDayOfInterval, endOfWeek, format, startOfWeek } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AgendaView } from '@/components/calendar/agenda-view';
import { MonthView, type DragPayload } from '@/components/calendar/month-view';
import { TimeGridView, type TimeDragPayload } from '@/components/calendar/time-grid-view';
import { CalEvent, eventEnd, eventStart, fromMinutes, monthGridDays, toDate, toISO, toMinutes } from '@/components/calendar/utils';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Year { id: string; year: string }
interface Props {
    events: CalEvent[];
    types: Record<string, string>;
    academicYears: Year[];
    activeYear: { id: string; year: string } | null;
    filters: { academic_year_id: string; type: string };
}

type View = 'month' | 'week' | 'day' | 'agenda';
const VIEW_KEYS: View[] = ['month', 'week', 'day', 'agenda'];
const ALL = '__all__';

const emptyForm = (): Omit<CalEvent, 'id' | 'color'> => ({
    title: '', description: '', type: 'event',
    start_date: toISO(new Date()), end_date: '',
    all_day: true, start_time: '', end_time: '',
});

export default function Index({ events, types, academicYears, activeYear, filters }: Readonly<Props>) {
    const { t, locale } = useTranslation();
    const dfLocale = locale === 'en' ? enUS : fr;
    const perms = (usePage().props.auth?.permissions ?? []) as string[];
    const canCreate = perms.includes('create_calendar');
    const canEdit = perms.includes('edit_calendar');
    const canDelete = perms.includes('delete_calendar');

    const [view, setView] = useState<View>('month');
    const [cursor, setCursor] = useState<Date>(new Date());
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm());
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Sur mobile, les grilles Semaine/Jour sont inexploitables : on ouvre sur la liste.
    useEffect(() => {
        if (typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches) setView('agenda');
    }, []);

    const reload = (next: Partial<{ academic_year_id: string; type: string }>) => {
        router.get(route('calendar.index'), {
            academic_year_id: next.academic_year_id ?? filters.academic_year_id,
            type: next.type ?? filters.type,
        }, { preserveScroll: true, replace: true });
    };

    /* ── Navigation ──────────────────────────────────────────────────── */
    const step = (dir: 1 | -1) => {
        if (view === 'month') setCursor((c) => addMonths(c, dir));
        else if (view === 'week') setCursor((c) => addWeeks(c, dir));
        else if (view === 'day') setCursor((c) => addDays(c, dir));
    };

    const weekDays = eachDayOfInterval({
        start: startOfWeek(cursor, { weekStartsOn: 1 }),
        end: endOfWeek(cursor, { weekStartsOn: 1 }),
    });

    const title = (() => {
        if (view === 'month') return format(cursor, 'MMMM yyyy', { locale: dfLocale });
        if (view === 'week') return `${format(weekDays[0], 'd MMM', { locale: dfLocale })} – ${format(weekDays[6], 'd MMM yyyy', { locale: dfLocale })}`;
        if (view === 'day') return format(cursor, 'EEEE d MMMM yyyy', { locale: dfLocale });
        return activeYear?.year ?? '';
    })();

    /* ── Création / édition ──────────────────────────────────────────── */
    const openCreate = () => { setEditingId(null); setForm(emptyForm()); setErrors({}); setOpen(true); };

    const openCreateAt = (day: Date, time?: string) => {
        if (!canCreate) return;
        setEditingId(null);
        setErrors({});
        setForm({
            ...emptyForm(),
            start_date: toISO(day),
            ...(time ? { all_day: false, start_time: time, end_time: fromMinutes((toMinutes(time) ?? 0) + 60) } : {}),
        });
        setOpen(true);
    };

    const openEdit = (e: CalEvent) => {
        setEditingId(e.id);
        setForm({
            title: e.title, description: e.description ?? '', type: e.type,
            start_date: e.start_date, end_date: e.end_date ?? '', all_day: e.all_day,
            start_time: e.start_time ?? '', end_time: e.end_time ?? '',
        });
        setErrors({});
        setOpen(true);
    };

    const submit = (ev: React.FormEvent) => {
        ev.preventDefault();
        const payload = { ...form, end_date: form.end_date || null, start_time: form.start_time || null, end_time: form.end_time || null };
        const opts = {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
            onError: (e: Record<string, string>) => setErrors(e),
        };
        if (editingId) router.put(route('calendar.update', editingId), payload, opts);
        else router.post(route('calendar.store'), payload, opts);
    };

    /* ── Drag & drop : déplacement et redimensionnement ──────────────── */
    const persist = (e: CalEvent, changes: Partial<CalEvent>) => {
        const next = { ...e, ...changes };
        router.put(route('calendar.update', e.id), {
            title: next.title,
            description: next.description,
            type: next.type,
            start_date: next.start_date,
            end_date: next.end_date || null,
            all_day: next.all_day,
            start_time: next.start_time || null,
            end_time: next.end_time || null,
            color: next.color || null,
        }, { preserveScroll: true });
    };

    const handleDrop = (payload: DragPayload | TimeDragPayload, day: Date, minutes?: number) => {
        if (!canEdit) return;
        const e = events.find((x) => x.id === payload.id);
        if (!e) return;

        const timed = minutes !== undefined && !e.all_day;

        if (payload.mode === 'resize-end') {
            if (timed) {
                const startMin = toMinutes(e.start_time) ?? 0;
                // La fin doit rester après le début (30 min minimum).
                const endMin = Math.max(minutes + 30, startMin + 30);
                persist(e, { end_time: fromMinutes(endMin) });
            } else {
                const newEnd = day < eventStart(e) ? eventStart(e) : day;
                persist(e, { end_date: toISO(newEnd) });
            }
            return;
        }

        // Déplacement
        if (timed) {
            const startMin = toMinutes(e.start_time) ?? 0;
            const duration = Math.max((toMinutes(e.end_time) ?? startMin + 60) - startMin, 30);
            persist(e, {
                start_date: toISO(day),
                end_date: toISO(day),
                start_time: fromMinutes(minutes),
                end_time: fromMinutes(minutes + duration),
            });
        } else {
            const delta = differenceInCalendarDays(day, toDate(payload.grabDay));
            if (delta === 0) return;
            persist(e, {
                start_date: toISO(addDays(eventStart(e), delta)),
                end_date: e.end_date ? toISO(addDays(eventEnd(e), delta)) : null,
            });
        }
    };

    return (
        <AppLayout>
            <Head title={t('calendar.title')} />
            <div className="w-full space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                            <CalendarDays className="h-7 w-7 text-blue-600 shrink-0" /> {t('calendar.header_title')}
                        </h1>
                        <p className="mt-2 text-gray-500">{t('calendar.subtitle')}{activeYear ? ` — ${activeYear.year}` : ''}.</p>
                    </div>
                    {canCreate && (
                        <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4" /> {t('calendar.new_event')}</Button>
                    )}
                </div>

                {/* Barre d'outils : navigation, vues, filtres */}
                <div className="rounded-2xl bg-linear-to-br from-slate-50 to-white p-4 shadow-sm ring-1 ring-slate-100 flex flex-wrap gap-3 items-center">
                    {view !== 'agenda' && (
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => step(-1)} aria-label={t('calendar.prev')}><ChevronLeft className="w-4 h-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>{t('calendar.today')}</Button>
                            <Button variant="outline" size="sm" onClick={() => step(1)} aria-label={t('calendar.next')}><ChevronRight className="w-4 h-4" /></Button>
                        </div>
                    )}
                    <span className="text-sm font-semibold text-gray-700 capitalize min-w-40">{title}</span>

                    {/* Sélecteur de vue */}
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                        {VIEW_KEYS.map((v) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => setView(v)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                                    view === v ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-slate-50'
                                }`}
                            >
                                {t(`calendar.view.${v}`)}
                            </button>
                        ))}
                    </div>

                    <div className="ml-auto flex flex-wrap gap-2">
                        <Select value={filters.academic_year_id || ''} onValueChange={(v) => reload({ academic_year_id: v })}>
                            <SelectTrigger className="w-40"><SelectValue placeholder={t('calendar.year')} /></SelectTrigger>
                            <SelectContent>{academicYears.map((y) => <SelectItem key={y.id} value={y.id}>{y.year}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={filters.type || ALL} onValueChange={(v) => reload({ type: v === ALL ? '' : v })}>
                            <SelectTrigger className="w-40"><SelectValue placeholder={t('calendar.type')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>{t('calendar.all_types')}</SelectItem>
                                {Object.entries(types).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {canEdit && view !== 'agenda' && (
                    <p className="text-xs text-gray-400 -mt-3">
                        {t('calendar.drag_hint')}
                    </p>
                )}

                {/* Vues */}
                {view === 'month' && (
                    <MonthView
                        days={monthGridDays(cursor)}
                        cursor={cursor}
                        events={events}
                        canEdit={canEdit}
                        canCreate={canCreate}
                        onCreateAt={openCreateAt}
                        onEditEvent={openEdit}
                        onDrop={handleDrop}
                    />
                )}
                {view === 'week' && (
                    <TimeGridView
                        days={weekDays}
                        events={events}
                        canEdit={canEdit}
                        canCreate={canCreate}
                        onCreateAt={openCreateAt}
                        onEditEvent={openEdit}
                        onDrop={handleDrop}
                    />
                )}
                {view === 'day' && (
                    <TimeGridView
                        days={[cursor]}
                        events={events}
                        canEdit={canEdit}
                        canCreate={canCreate}
                        onCreateAt={openCreateAt}
                        onEditEvent={openEdit}
                        onDrop={handleDrop}
                    />
                )}
                {view === 'agenda' && (
                    <AgendaView
                        events={events}
                        types={types}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onEdit={openEdit}
                        onDelete={setDeleteId}
                    />
                )}
            </div>

            {/* Dialog création/édition */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? t('calendar.dialog.edit_title') : t('calendar.dialog.new_title')}</DialogTitle>
                        <DialogDescription>{t('calendar.dialog.desc')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4 py-1">
                        <div className="space-y-1.5">
                            <Label className="text-sm">{t('calendar.dialog.field_title')}</Label>
                            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={errors.title ? 'border-red-400' : ''} />
                            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm">{t('calendar.dialog.field_type')}</Label>
                            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{Object.entries(types).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-sm">{t('calendar.dialog.start')}</Label>
                                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={errors.start_date ? 'border-red-400' : ''} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm">{t('calendar.dialog.end')}</Label>
                                <Input type="date" value={form.end_date ?? ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={errors.end_date ? 'border-red-400' : ''} />
                                {errors.end_date && <p className="text-xs text-red-500">{errors.end_date}</p>}
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={form.all_day} onCheckedChange={(v) => setForm({ ...form, all_day: Boolean(v) })} /> {t('calendar.dialog.all_day')}
                        </label>
                        {!form.all_day && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5"><Label className="text-sm">{t('calendar.dialog.start_time')}</Label><Input type="time" value={form.start_time ?? ''} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                                <div className="space-y-1.5"><Label className="text-sm">{t('calendar.dialog.end_time')}</Label><Input type="time" value={form.end_time ?? ''} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label className="text-sm">{t('calendar.dialog.description')}</Label>
                            <Textarea rows={2} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <div className="flex justify-between gap-2 pt-1">
                            <div>
                                {editingId && canDelete && (
                                    <Button type="button" variant="outline" className="border-red-200 text-red-500 hover:bg-red-50" onClick={() => { setOpen(false); setDeleteId(editingId); }}>
                                        {t('common.actions.delete')}
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.actions.cancel')}</Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">{editingId ? t('common.actions.save') : t('common.actions.add')}</Button>
                            </div>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('calendar.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('calendar.delete_desc')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('common.actions.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && router.delete(route('calendar.destroy', deleteId), { preserveScroll: true, onSuccess: () => setDeleteId(null) })}>{t('common.actions.delete')}</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
