import { Head, router } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, GraduationCap, Users, ArrowLeftRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Year { id: string; year: string; active: boolean; }
interface Classroom { id: string; name: string; code: string; }
interface Row {
    enrollment_id: string;
    student_id: string;
    student_name: string;
    matricule: string | null;
    academic_status: string;
    already_enrolled: boolean;
}

interface Props {
    years: Year[];
    classrooms: Classroom[];
    students: Row[];
    stats: Record<string, number>;
    statuses: Record<string, string>;
    filters: { source_year_id: string; source_class_id: string; target_year_id: string };
}

const STATUS_STYLE: Record<string, string> = {
    en_cours: 'bg-blue-100 text-blue-700', valide: 'bg-emerald-100 text-emerald-700',
    non_valide: 'bg-amber-100 text-amber-700', abandon: 'bg-red-100 text-red-700', transfere: 'bg-gray-100 text-gray-600',
};

export default function Index({ years, classrooms, students, stats, statuses, filters }: Readonly<Props>) {
    const { t } = useTranslation();
    const [srcYear, setSrcYear]   = useState(filters.source_year_id || '');
    const [srcClass, setSrcClass] = useState(filters.source_class_id || '');
    const [tgtYear, setTgtYear]   = useState(filters.target_year_id || '');
    const [tgtClass, setTgtClass] = useState('');
    const [selected, setSelected] = useState<string[]>([]);

    // Pré-sélection : élèves validés non encore réinscrits
    useEffect(() => {
        setSelected(students.filter(s => s.academic_status === 'valide' && !s.already_enrolled).map(s => s.student_id));
    }, [students]);

    const load = (overrides: Record<string, string> = {}) => {
        router.get(route('promotion.index'), {
            source_year_id:  overrides.source_year_id ?? srcYear,
            source_class_id: overrides.source_class_id ?? srcClass,
            target_year_id:  overrides.target_year_id ?? tgtYear,
        }, { preserveScroll: true, replace: true });
    };

    const toggle = (id: string, disabled: boolean) => {
        if (disabled) return;
        setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    };

    const selectableIds = students.filter(s => !s.already_enrolled).map(s => s.student_id);
    const toggleAll = () => setSelected(selected.length === selectableIds.length ? [] : selectableIds);

    const submit = () => {
        if (!tgtYear || !tgtClass || selected.length === 0) return;
        router.post(route('promotion.store'), {
            target_year_id: tgtYear,
            target_class_id: tgtClass,
            student_ids: selected,
        }, { preserveScroll: true, onSuccess: () => load() });
    };

    const ready = srcYear && srcClass;
    const canSubmit = tgtYear && tgtClass && selected.length > 0;

    return (
        <AppLayout>
            <Head title={t('promotion.title')} />
            <div className="w-full space-y-6">

                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3"><ArrowLeftRight className="h-7 w-7 text-blue-600 shrink-0" />{t('promotion.title')}</h1>
                    <p className="mt-2 text-gray-500">{t('promotion.subtitle')}</p>
                </div>

                {/* Sélecteurs source → cible */}
                <div className="rounded-2xl bg-slate-50/70 ring-1 ring-slate-200 shadow-sm p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto_1fr_1fr] gap-3 items-end">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('promotion.source_year')}</label>
                            <Select value={srcYear} onValueChange={v => { setSrcYear(v); load({ source_year_id: v }); }}>
                                <SelectTrigger><SelectValue placeholder={t('promotion.choose')} /></SelectTrigger>
                                <SelectContent>{years.map(y => <SelectItem key={y.id} value={y.id}>{y.year}{y.active ? ` (${t('promotion.active')})` : ''}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('promotion.source_class')}</label>
                            <Select value={srcClass || 'none'} onValueChange={v => { const val = v === 'none' ? '' : v; setSrcClass(val); load({ source_class_id: val }); }}>
                                <SelectTrigger><SelectValue placeholder={t('promotion.choose')} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none" disabled>{t('promotion.choose')}</SelectItem>
                                    {classrooms.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="hidden lg:flex items-center justify-center pb-2">
                            <ArrowRight className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('promotion.target_year')}</label>
                            <Select value={tgtYear} onValueChange={v => { setTgtYear(v); load({ target_year_id: v }); }}>
                                <SelectTrigger><SelectValue placeholder={t('promotion.choose')} /></SelectTrigger>
                                <SelectContent>{years.map(y => <SelectItem key={y.id} value={y.id}>{y.year}{y.active ? ` (${t('promotion.active')})` : ''}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('promotion.target_class')}</label>
                            <Select value={tgtClass || 'none'} onValueChange={v => setTgtClass(v === 'none' ? '' : v)}>
                                <SelectTrigger><SelectValue placeholder={t('promotion.choose')} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none" disabled>{t('promotion.choose')}</SelectItem>
                                    {classrooms.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {!ready ? (
                    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 py-20 text-center text-gray-400">
                        <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-lg font-medium">{t('promotion.select_prompt')}</p>
                    </div>
                ) : (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: t('promotion.stat.students'), value: stats.total ?? 0, color: 'text-gray-700', icon: Users },
                                { label: t('promotion.stat.valide'), value: stats.valide ?? 0, color: 'text-emerald-600', icon: CheckCircle2 },
                                { label: t('promotion.stat.non_valide'), value: stats.non_valide ?? 0, color: 'text-amber-600', icon: Users },
                                { label: t('promotion.stat.reenrolled'), value: stats.deja_reinscrit ?? 0, color: 'text-blue-600', icon: GraduationCap },
                            ].map(c => {
                                const Icon = c.icon;
                                return (
                                    <div key={c.label} className="bg-gray-50 ring-1 ring-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-gray-500">{c.label}</p>
                                            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                                        </div>
                                        <Icon className={`w-7 h-7 ${c.color} opacity-25`} />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Barre d'action */}
                        <div className="flex items-center gap-3 bg-blue-50 ring-1 ring-blue-100 rounded-2xl px-5 py-3 flex-wrap">
                            <span className="text-sm font-medium text-blue-800">{t('promotion.selected', { count: selected.length })}</span>
                            {!tgtYear || !tgtClass ? (
                                <span className="text-sm text-amber-600">⚠ {t('promotion.choose_target')}</span>
                            ) : null}
                            <Button className="ml-auto bg-blue-600 hover:bg-blue-700 gap-2" disabled={!canSubmit} onClick={submit}>
                                <ArrowRight className="w-4 h-4" /> {t('promotion.reenroll_selection')}
                            </Button>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="w-10">
                                            <input type="checkbox" checked={selected.length > 0 && selected.length === selectableIds.length} onChange={toggleAll} className="rounded" />
                                        </TableHead>
                                        <TableHead>{t('promotion.col_student')}</TableHead>
                                        <TableHead>{t('promotion.col_matricule')}</TableHead>
                                        <TableHead>{t('promotion.col_status_source')}</TableHead>
                                        <TableHead>{t('promotion.col_target')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="py-12 text-center text-gray-400">{t('promotion.empty')}</TableCell></TableRow>
                                    ) : students.map(s => (
                                        <TableRow key={s.enrollment_id} className={s.already_enrolled ? 'bg-gray-50/50' : 'hover:bg-gray-50'}>
                                            <TableCell>
                                                <input type="checkbox" disabled={s.already_enrolled} checked={selected.includes(s.student_id)} onChange={() => toggle(s.student_id, s.already_enrolled)} className="rounded" />
                                            </TableCell>
                                            <TableCell className="font-medium text-gray-900">{s.student_name}</TableCell>
                                            <TableCell className="font-mono text-xs text-gray-500">{s.matricule}</TableCell>
                                            <TableCell>
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[s.academic_status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                    {statuses[s.academic_status] ?? s.academic_status}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {s.already_enrolled
                                                    ? <span className="text-xs text-emerald-600 font-medium inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {t('promotion.already_reenrolled')}</span>
                                                    : <span className="text-xs text-gray-400">{t('promotion.to_reenroll')}</span>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
