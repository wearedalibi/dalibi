import { Head, router } from '@inertiajs/react';
import { ArrowLeft, CalendarRange, Clock, Download, MapPin, User, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { route } from '@/helpers/route';
import AppLayout from '@/layouts/app-layout';

interface Option { id: string; name: string; }

interface Slot {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    subject_name: string | null;
    class_name: string | null;
    room: string | null;
}

interface Props {
    teachers: Option[];
    teacher: { id: string; name: string } | null;
    slots: Slot[];
    days: Record<string, string>;
    filters: { teacher_id: string };
}

export default function Teacher({ teachers, teacher, slots, days, filters }: Readonly<Props>) {
    const teacherId = filters.teacher_id ?? '';
    const dayKeys = Object.keys(days).map(Number);

    const selectTeacher = (id: string) => {
        router.get(route('timetable.teacher'), { teacher_id: id }, { preserveState: true, replace: true });
    };

    const exportUrl = teacherId
        ? `${route('timetable.teacher.export')}?teacher_id=${teacherId}`
        : '';

    const distinctClasses = new Set(slots.map(s => s.class_name).filter(Boolean)).size;

    return (
        <AppLayout>
            <Head title="Emploi du temps — par enseignant" />
            <div className="w-full space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.get(route('timetable.index'))}
                            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                                <CalendarRange className="h-7 w-7 text-blue-600 shrink-0" />
                                Emploi du temps — par enseignant
                            </h1>
                            <p className="mt-1 text-gray-500">Programmation d'un enseignant pour l'année active, toutes classes confondues.</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => exportUrl && window.open(exportUrl, '_blank')}
                        disabled={!teacherId || slots.length === 0}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 shrink-0 disabled:opacity-40"
                    >
                        <Download className="w-4 h-4" /> Exporter en PDF
                    </Button>
                </div>

                {/* Sélecteur enseignant */}
                <div className="rounded-2xl bg-slate-50/70 ring-1 ring-slate-200 shadow-sm p-4 flex items-center gap-3 max-w-md">
                    <User className="w-5 h-5 text-gray-400" />
                    <Select value={teacherId} onValueChange={selectTeacher}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Choisir un enseignant" /></SelectTrigger>
                        <SelectContent>
                            {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                {!teacherId ? (
                    <div className="rounded-2xl ring-1 ring-dashed ring-gray-200 p-12 text-center text-gray-400">
                        <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        Sélectionnez un enseignant pour afficher son emploi du temps.
                    </div>
                ) : (
                    <>
                        {/* Récap */}
                        {teacher && (
                            <div className="flex items-center gap-3 flex-wrap text-sm bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                                <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                                    {teacher.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                                </div>
                                <span className="font-semibold text-gray-900">{teacher.name}</span>
                                <span className="text-gray-400">·</span>
                                <span className="text-gray-600">{slots.length} créneau{slots.length > 1 ? 'x' : ''}</span>
                                <span className="text-gray-400">·</span>
                                <span className="text-gray-600">{distinctClasses} classe{distinctClasses > 1 ? 's' : ''}</span>
                            </div>
                        )}

                        {slots.length === 0 ? (
                            <div className="rounded-2xl ring-1 ring-dashed ring-gray-200 p-12 text-center text-gray-400">
                                <CalendarRange className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                Aucun créneau pour cet enseignant sur l'année active.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                                {dayKeys.map(day => {
                                    const daySlots = slots.filter(s => s.day_of_week === day);
                                    return (
                                        <div key={day} className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-3 flex flex-col">
                                            <h3 className="text-sm font-semibold text-gray-900 mb-2">{days[day]}</h3>
                                            <div className="space-y-2 flex-1">
                                                {daySlots.length === 0 ? (
                                                    <p className="text-xs text-gray-300 text-center py-4">—</p>
                                                ) : daySlots.map(slot => (
                                                    <div key={slot.id} className="rounded-xl bg-blue-50/60 ring-1 ring-blue-100 p-2.5">
                                                        <span className="text-xs font-semibold text-blue-700 inline-flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />{slot.start_time}–{slot.end_time}
                                                        </span>
                                                        <p className="text-sm font-medium text-gray-900 mt-1">{slot.subject_name ?? 'Matière'}</p>
                                                        {slot.class_name && <p className="text-xs text-gray-500 inline-flex items-center gap-1 mt-0.5"><BookOpen className="w-3 h-3" />{slot.class_name}</p>}
                                                        {slot.room && <p className="text-xs text-gray-400 inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{slot.room}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}
