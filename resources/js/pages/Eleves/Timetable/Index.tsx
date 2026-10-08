import { Head, router, useForm } from '@inertiajs/react';
import { CalendarRange, Clock, Download, MapPin, Pencil, Plus, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { route } from '@/helpers/route';
import AppLayout from '@/layouts/app-layout';

interface Option { id: string; name: string; code?: string; }
interface Slot {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    subject_id: string | null;
    subject_name: string | null;
    teacher_id: string | null;
    teacher_name: string | null;
    room: string | null;
}

interface Props {
    classrooms: Option[];
    subjects: Option[];
    teachers: Option[];
    slots: Slot[];
    days: Record<string, string>;
    filters: { class_id: string };
    canManage: boolean;
}

const emptyForm = {
    id: '' as string,
    class_id: '',
    day_of_week: 1,
    start_time: '08:00',
    end_time: '09:00',
    subject_id: '',
    teacher_id: '',
    room: '',
};

export default function Index({ classrooms, subjects, teachers, slots, days, filters, canManage }: Readonly<Props>) {
    const [classId, setClassId] = useState(filters.class_id ?? '');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(false);

    const { data, setData, post, put, processing, errors, reset } = useForm({ ...emptyForm });

    const selectClass = (id: string) => {
        setClassId(id);
        router.get(route('timetable.index'), { class_id: id }, { preserveState: true, replace: true });
    };

    const openCreate = (day: number) => {
        reset();
        setData({ ...emptyForm, class_id: classId, day_of_week: day });
        setEditing(false);
        setDialogOpen(true);
    };

    const openEdit = (slot: Slot) => {
        setData({
            id: slot.id,
            class_id: classId,
            day_of_week: slot.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            subject_id: slot.subject_id ?? '',
            teacher_id: slot.teacher_id ?? '',
            room: slot.room ?? '',
        });
        setEditing(true);
        setDialogOpen(true);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: () => { setDialogOpen(false); reset(); } };
        if (editing) put(route('timetable.update', data.id), opts);
        else post(route('timetable.store'), opts);
    };

    const removeSlot = (id: string) => {
        router.delete(route('timetable.destroy', id), { preserveScroll: true });
    };

    const dayKeys = Object.keys(days).map(Number);

    return (
        <AppLayout>
            <Head title="Emploi du temps" />
            <div className="w-full space-y-6">

                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><CalendarRange className="h-7 w-7 text-blue-600 shrink-0" />Emploi du temps</h1>
                        <p className="mt-2 text-gray-500">Organisez les créneaux de cours par classe pour l'année active.</p>
                    </div>
                    <Button variant="outline" className="gap-2 shrink-0" onClick={() => router.get(route('timetable.teacher'))}>
                        <User className="w-4 h-4" /> Vue par enseignant
                    </Button>
                </div>

                {/* Sélecteur de classe + export */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="rounded-2xl bg-slate-50/70 ring-1 ring-slate-200 shadow-sm p-4 flex items-center gap-3 flex-1 min-w-64 max-w-md">
                        <CalendarRange className="w-5 h-5 text-gray-400" />
                        <Select value={classId} onValueChange={selectClass}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
                            <SelectContent>
                                {classrooms.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {classId && (
                        <Button variant="outline" className="gap-2" onClick={() => window.open(route('timetable.export', classId), '_blank')}>
                            <Download className="w-4 h-4" /> Exporter en PDF
                        </Button>
                    )}
                </div>

                {!classId ? (
                    <div className="rounded-2xl ring-1 ring-dashed ring-gray-200 p-12 text-center text-gray-400">
                        <CalendarRange className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        Sélectionnez une classe pour afficher son emploi du temps.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {dayKeys.map(day => {
                            const daySlots = slots.filter(s => s.day_of_week === day);
                            return (
                                <div key={day} className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-3 flex flex-col">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-semibold text-gray-900">{days[day]}</h3>
                                        {canManage && (
                                            <button onClick={() => openCreate(day)} className="text-blue-500 hover:text-blue-700" title="Ajouter un créneau">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        {daySlots.length === 0 ? (
                                            <p className="text-xs text-gray-300 text-center py-4">—</p>
                                        ) : daySlots.map(slot => (
                                            <div key={slot.id} className="rounded-xl bg-blue-50/60 ring-1 ring-blue-100 p-2.5 group">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-blue-700 inline-flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />{slot.start_time}–{slot.end_time}
                                                    </span>
                                                    {canManage && (
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                            <button onClick={() => openEdit(slot)} className="text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                                                            <button onClick={() => removeSlot(slot.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-sm font-medium text-gray-900 mt-1">{slot.subject_name ?? 'Matière'}</p>
                                                {slot.teacher_name && <p className="text-xs text-gray-500 inline-flex items-center gap-1 mt-0.5"><User className="w-3 h-3" />{slot.teacher_name}</p>}
                                                {slot.room && <p className="text-xs text-gray-400 inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{slot.room}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Dialog créneau */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editing ? 'Modifier le créneau' : 'Nouveau créneau'}</DialogTitle></DialogHeader>
                    <form onSubmit={submit} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Jour *</label>
                            <Select value={String(data.day_of_week)} onValueChange={v => setData('day_of_week', Number(v))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {dayKeys.map(d => <SelectItem key={d} value={String(d)}>{days[d]}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Début *</label>
                                <Input type="time" value={data.start_time} onChange={e => setData('start_time', e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Fin *</label>
                                <Input type="time" value={data.end_time} onChange={e => setData('end_time', e.target.value)} className={errors.end_time ? 'border-red-400' : ''} />
                                {errors.end_time && <p className="text-xs text-red-500">{errors.end_time}</p>}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Matière</label>
                            <Select value={data.subject_id || 'none'} onValueChange={v => setData('subject_id', v === 'none' ? '' : v)}>
                                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">—</SelectItem>
                                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Enseignant</label>
                            <Select value={data.teacher_id || 'none'} onValueChange={v => setData('teacher_id', v === 'none' ? '' : v)}>
                                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">—</SelectItem>
                                    {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Salle</label>
                            <Input value={data.room} onChange={e => setData('room', e.target.value)} placeholder="Ex: Salle 12" />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                            <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700">{editing ? 'Mettre à jour' : 'Ajouter'}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
