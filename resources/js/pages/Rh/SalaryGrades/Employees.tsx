import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Users, Search, Save, AlertTriangle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useMoney } from '@/helpers/money';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface Employee {
    id: string;
    name: string;
    job_title: string;
    current_grade: { id: string; name: string } | null;
}

interface Props {
    grade: { id: string; name: string; base_amount: number };
    employees: Employee[];
    assignedIds: string[];
}

export default function Employees({ grade, employees, assignedIds }: Readonly<Props>) {
    const fmt = useMoney();
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const { data, setData, put, processing } = useForm<{ employee_ids: string[] }>({ employee_ids: assignedIds });

    const selected = new Set(data.employee_ids);
    const toggle = (id: string) => {
        setData('employee_ids', selected.has(id) ? data.employee_ids.filter(x => x !== id) : [...data.employee_ids, id]);
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return employees;
        return employees.filter(e => e.name.toLowerCase().includes(q) || e.job_title.toLowerCase().includes(q));
    }, [employees, search]);

    const allFilteredSelected = filtered.length > 0 && filtered.every(e => selected.has(e.id));
    const toggleAllFiltered = () => {
        const ids = filtered.map(e => e.id);
        if (allFilteredSelected) {
            setData('employee_ids', data.employee_ids.filter(x => !ids.includes(x)));
        } else {
            setData('employee_ids', Array.from(new Set([...data.employee_ids, ...ids])));
        }
    };

    // Employés qui vont changer de grille (actuellement sur une autre grille et cochés).
    const movingCount = employees.filter(e => selected.has(e.id) && e.current_grade && e.current_grade.id !== grade.id).length;

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        put(route('salary-grades.employees.sync', grade.id));
    };

    return (
        <AppLayout>
            <Head title={t('rh.salary_grades.employees.head', { name: grade.name })} />
            <form onSubmit={submit} className="space-y-5 max-w-4xl">
                {/* En-tête */}
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => router.get(route('salary-grades.index'))} className="p-2 hover:bg-gray-100 rounded-lg transition">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-7 h-7 text-blue-600" /> {t('rh.salary_grades.employees.title')}
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">{t('rh.salary_grades.employees.subtitle', { name: grade.name, base: fmt(grade.base_amount) })}</p>
                    </div>
                </div>

                {/* Barre : recherche + compteur */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-56">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('rh.salary_grades.employees.search_ph')} className="pl-9" />
                    </div>
                    <span className="text-sm text-gray-500">{t('rh.salary_grades.employees.selected', { count: data.employee_ids.length })}</span>
                </div>

                {/* Liste */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    {employees.length === 0 ? (
                        <div className="px-5 py-16 text-center text-gray-400">
                            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">{t('rh.salary_grades.employees.empty')}</p>
                        </div>
                    ) : (
                        <>
                            <label className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50 cursor-pointer">
                                <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAllFiltered} />
                                <span className="text-sm font-medium text-gray-600">{t('rh.salary_grades.employees.select_all')}{search ? t('rh.salary_grades.employees.select_all_filtered') : ''}</span>
                            </label>
                            <div className="divide-y divide-gray-50 max-h-[55vh] overflow-y-auto">
                                {filtered.map(emp => {
                                    const onOtherGrade = emp.current_grade && emp.current_grade.id !== grade.id;
                                    return (
                                        <label key={emp.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50/50 cursor-pointer">
                                            <Checkbox checked={selected.has(emp.id)} onCheckedChange={() => toggle(emp.id)} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                                                <p className="text-xs text-gray-400">{emp.job_title}</p>
                                            </div>
                                            {emp.current_grade && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${onOtherGrade ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
                                                    {onOtherGrade ? t('rh.salary_grades.employees.current', { name: emp.current_grade.name }) : t('rh.salary_grades.employees.on_this_grade')}
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                                {filtered.length === 0 && <p className="px-5 py-8 text-center text-sm text-gray-400">{t('rh.salary_grades.employees.no_result')}</p>}
                            </div>
                        </>
                    )}
                </div>

                {movingCount > 0 && (
                    <p className="text-sm text-amber-600 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" /> {t('rh.salary_grades.employees.moving', { count: movingCount })}
                    </p>
                )}
                <p className="text-xs text-gray-400">{t('rh.salary_grades.employees.detach_note')}</p>

                <div className="flex gap-3">
                    <Button type="submit" disabled={processing} className="gap-2 bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4" /> {processing ? t('rh.salary_grades.employees.saving') : t('rh.salary_grades.employees.save')}</Button>
                    <Button type="button" variant="outline" className="border-slate-200 text-gray-700" onClick={() => router.get(route('salary-grades.index'))}>{t('rh.salary_grades.employees.cancel')}</Button>
                </div>
            </form>
        </AppLayout>
    );
}
