import axios from 'axios';
import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';

export interface StudentRef {
    matricule: string;
    name: string;
}

export interface GuardianFormData {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    student_matricules: string[];
    send_invitation: boolean;
}

interface Props {
    data: GuardianFormData;
    setData: <K extends keyof GuardianFormData>(key: K, value: GuardianFormData[K]) => void;
    errors: Partial<Record<string, string>>;
    processing: boolean;
    mode: 'create' | 'edit';
    initialChildren?: StudentRef[];
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
}

export function GuardianForm({ data, setData, errors, processing, mode, initialChildren = [], onSubmit, onCancel }: Readonly<Props>) {
    const { t } = useTranslation();
    // Enfants sélectionnés (objets avec libellé) — la donnée soumise reste les matricules.
    const [selected, setSelected] = useState<StudentRef[]>(initialChildren);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<StudentRef[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [searching, setSearching] = useState(false);

    const updateSelected = (next: StudentRef[]) => {
        setSelected(next);
        setData('student_matricules', next.map((s) => s.matricule));
    };

    // Recherche d'élèves (debounce) par nom ou matricule.
    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const { data: res } = await axios.get<StudentRef[]>(route('guardians.students.search'), { params: { q: query } });
                setResults(res);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [query]);

    const pick = (student: StudentRef) => {
        if (!selected.some((s) => s.matricule === student.matricule)) {
            updateSelected([...selected, student]);
        }
        setQuery('');
        setResults([]);
        setShowDropdown(false);
    };

    const remove = (matricule: string) => updateSelected(selected.filter((s) => s.matricule !== matricule));

    const available = results.filter((r) => !selected.some((s) => s.matricule === r.matricule));

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-sm">{t('administration.guardians.form.first_name')}</Label>
                        <Input value={data.first_name} onChange={(e) => setData('first_name', e.target.value)} className={errors.first_name ? 'border-red-400' : ''} />
                        {errors.first_name && <p className="text-xs text-red-500">{errors.first_name}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-sm">{t('administration.guardians.form.last_name')}</Label>
                        <Input value={data.last_name} onChange={(e) => setData('last_name', e.target.value)} className={errors.last_name ? 'border-red-400' : ''} />
                        {errors.last_name && <p className="text-xs text-red-500">{errors.last_name}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-sm">{t('administration.guardians.form.email')}</Label>
                        <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className={errors.email ? 'border-red-400' : ''} />
                        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-sm">{t('administration.guardians.form.phone')}</Label>
                        <Input value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-sm">{t('administration.guardians.form.linked_students')}</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            value={query}
                            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
                            onFocus={() => setShowDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                            placeholder={t('administration.guardians.form.search_student_ph')}
                            className="pl-9"
                        />
                        {showDropdown && query.trim() && (
                            <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg max-h-56 overflow-auto ring-1 ring-gray-100">
                                {searching && <div className="px-3 py-2 text-sm text-gray-400">{t('administration.guardians.form.searching')}</div>}
                                {!searching && available.length === 0 && (
                                    <div className="px-3 py-2 text-sm text-gray-400">{t('administration.guardians.form.no_student')}</div>
                                )}
                                {available.map((student) => (
                                    <button
                                        type="button"
                                        key={student.matricule}
                                        onMouseDown={(e) => { e.preventDefault(); pick(student); }}
                                        className="w-full text-left px-3 py-2 hover:bg-blue-50 transition text-sm text-gray-900 flex items-center justify-between gap-2"
                                    >
                                        <span>{student.name}</span>
                                        <span className="text-xs text-gray-400">{student.matricule}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {selected.map((s) => (
                            <span key={s.matricule} className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs">
                                {s.name} <span className="text-blue-500">· {s.matricule}</span>
                                <button type="button" onClick={() => remove(s.matricule)} aria-label={t('administration.guardians.form.remove_student', { name: s.name })}><X className="w-3 h-3" /></button>
                            </span>
                        ))}
                        {selected.length === 0 && <span className="text-xs text-gray-400">{t('administration.guardians.form.none_linked')}</span>}
                    </div>
                    {errors['student_matricules.0'] && <p className="text-xs text-red-500">{t('administration.guardians.form.matricule_not_found')}</p>}
                </div>

                {mode === 'create' && (
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={data.send_invitation} onCheckedChange={(v) => setData('send_invitation', Boolean(v))} />
                        {t('administration.guardians.form.send_invitation')}
                    </label>
                )}
            </div>

            <div className="flex gap-2">
                <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700">
                    {mode === 'edit' ? t('administration.guardians.form.save') : t('administration.guardians.form.create')}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>{t('administration.guardians.form.cancel')}</Button>
            </div>
        </form>
    );
}
