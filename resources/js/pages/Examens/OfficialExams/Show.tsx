import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Award, CalendarDays, MapPin, Save, Trash2, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Registration {
    id: string;
    student_id: string;
    student_name: string;
    matricule: string | null;
    registration_number: string | null;
    serie: string | null;
    status: string;
    average: string | number | null;
    mention: string | null;
}
interface AvailableStudent { id: string; name: string; matricule: string | null; }

interface Props {
    exam: { id: string; type: string; type_label: string; name: string; year: number; session: string; class_name: string | null; exam_date: string | null; center: string | null; status: string };
    registrations: Registration[];
    availableStudents: AvailableStudent[];
    stats: { total: number; admis: number; echoue: number; absent: number; taux: number };
    statuses: Record<string, string>;
    mentions: Record<string, string>;
    isBac: boolean;
}

export default function Show({ exam, registrations, availableStudents, stats, statuses, mentions, isBac }: Readonly<Props>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [rows, setRows] = useState<Registration[]>(registrations);
    const [addOpen, setAddOpen] = useState(false);
    const [selected, setSelected] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const updateRow = (id: string, field: keyof Registration, value: string) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const saveResults = () => {
        setSaving(true);
        router.put(route('official-exams.results', exam.id), {
            results: rows.map(r => ({
                id: r.id,
                registration_number: r.registration_number ?? '',
                serie: r.serie ?? '',
                status: r.status,
                average: r.average === '' ? null : r.average,
                mention: r.mention ?? '',
            })),
        }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
        });
    };

    const addStudents = () => {
        if (selected.length === 0) return;
        router.post(route('official-exams.register', exam.id), { student_ids: selected }, {
            preserveScroll: true,
            onSuccess: () => { setAddOpen(false); setSelected([]); },
        });
    };

    const removeRegistration = (regId: string) => {
        router.delete(`/official-exams/${exam.id}/registrations/${regId}`, { preserveScroll: true });
    };

    const toggleSelect = (id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const statCards = [
        { label: t('examens.official.show.registered'), value: stats.total, color: 'text-gray-700', icon: Users },
        { label: t('examens.official.show.admitted'), value: stats.admis, color: 'text-emerald-600', icon: Award },
        { label: t('examens.official.show.failed'), value: stats.echoue, color: 'text-red-600', icon: Users },
        { label: t('examens.official.show.success_rate'), value: `${stats.taux}%`, color: 'text-blue-600', icon: Award },
    ];

    return (
        <AppLayout>
            <Head title={exam.name} />
            <div className="w-full space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={() => router.get(route('official-exams.index'))} className="p-2 hover:bg-gray-100 rounded-lg">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wide text-blue-600">{exam.type} · {exam.year}</span>
                            <h1 className="text-3xl font-bold text-gray-900">{exam.name}</h1>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                {exam.class_name && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">{t('examens.official.show.class_prefix', { name: exam.class_name })}</span>}
                                {exam.exam_date && <span className="inline-flex items-center gap-1"><CalendarDays className="w-4 h-4" />{new Date(exam.exam_date).toLocaleDateString(dateLocale)}</span>}
                                {exam.center && <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" />{exam.center}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="gap-2" onClick={() => setAddOpen(true)} disabled={availableStudents.length === 0}>
                            <UserPlus className="w-4 h-4" /> {t('examens.official.show.register_students')}
                        </Button>
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={saveResults} disabled={saving || rows.length === 0}>
                            <Save className="w-4 h-4" /> {t('examens.official.show.save_results')}
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map(card => {
                        const Icon = card.icon;
                        return (
                            <div key={card.label} className="bg-gray-50 ring-1 ring-gray-100 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500">{card.label}</p>
                                        <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                                    </div>
                                    <Icon className={`w-8 h-8 ${card.color} opacity-25`} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Table des inscriptions */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead>{t('examens.official.show.col_student')}</TableHead>
                                <TableHead className="w-28">{t('examens.official.show.col_table_no')}</TableHead>
                                {isBac && <TableHead className="w-24">{t('examens.official.show.col_series')}</TableHead>}
                                <TableHead className="w-32">{t('examens.official.show.col_status')}</TableHead>
                                <TableHead className="w-24">{t('examens.official.show.col_average')}</TableHead>
                                <TableHead className="w-36">{t('examens.official.show.col_mention')}</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isBac ? 7 : 6} className="py-12 text-center text-gray-400">
                                        <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                        {t('examens.official.show.empty')}
                                    </TableCell>
                                </TableRow>
                            ) : rows.map(r => (
                                <TableRow key={r.id} className="hover:bg-gray-50">
                                    <TableCell>
                                        <div className="font-medium text-gray-900 text-sm">{r.student_name}</div>
                                        {r.matricule && <div className="text-xs text-gray-400 font-mono">{r.matricule}</div>}
                                    </TableCell>
                                    <TableCell>
                                        <Input value={r.registration_number ?? ''} onChange={e => updateRow(r.id, 'registration_number', e.target.value)} className="h-8 text-sm" />
                                    </TableCell>
                                    {isBac && (
                                        <TableCell>
                                            <Input value={r.serie ?? ''} onChange={e => updateRow(r.id, 'serie', e.target.value)} placeholder="A4, C, D…" className="h-8 text-sm" />
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <Select value={r.status} onValueChange={v => updateRow(r.id, 'status', v)}>
                                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(statuses).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" step="0.01" min="0" max="20" value={r.average ?? ''} onChange={e => updateRow(r.id, 'average', e.target.value)} className="h-8 text-sm" />
                                    </TableCell>
                                    <TableCell>
                                        <Select value={r.mention ?? 'none'} onValueChange={v => updateRow(r.id, 'mention', v === 'none' ? '' : v)}>
                                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">—</SelectItem>
                                                {Object.entries(mentions).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <button onClick={() => removeRegistration(r.id)} className="text-red-400 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Dialog inscription d'élèves */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{t('examens.official.show.register_students')}</DialogTitle></DialogHeader>
                    <div className="py-2">
                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 ring-1 ring-gray-100 rounded-xl">
                            {availableStudents.length === 0 ? (
                                <p className="p-4 text-sm text-gray-400 text-center">{t('examens.official.show.all_registered')}</p>
                            ) : availableStudents.map(s => (
                                <label key={s.id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 cursor-pointer text-sm">
                                    <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggleSelect(s.id)} className="rounded" />
                                    <span className="font-medium text-gray-900">{s.name}</span>
                                    {s.matricule && <span className="text-xs text-gray-400 font-mono">{s.matricule}</span>}
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{t('examens.official.show.selected', { count: selected.length })}</p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setAddOpen(false)}>{t('common.actions.cancel')}</Button>
                        <Button onClick={addStudents} disabled={selected.length === 0} className="bg-blue-600 hover:bg-blue-700">{t('examens.official.show.register')}</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
