import { Head, router } from '@inertiajs/react';
import { useMoney } from '@/helpers/money';
import {
    ArrowLeft, ArrowRight, Check, Info,
    Building2, GraduationCap, BookOpen, CalendarDays,
    Hash, Clock, Search, X, ChevronDown,
    Banknote, Smartphone, Landmark, FileText,
    User, Calendar,
} from 'lucide-react';
import { useMemo, useRef, useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { route } from '@/helpers/route';
import AppLayout from '@/layouts/app-layout';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface School        { id: string; name: string; code: string; }
interface Student       { id: string; firstname: string; lastname: string; matricule?: string | null; }
interface Classroom     { id: string; name: string; code: string; }
interface AcademicYear  { id: string; year: string; active: boolean; }
interface FeeStructure  { class_id: string; academic_year_id: string; label: string; amount: number; }

interface CreateProps {
    schools: School[];
    students: Student[];
    classrooms: Classroom[];
    academicYears: AcademicYear[];
    feeStructures: FeeStructure[];
}

type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CHEQUE';


/* ------------------------------------------------------------------ */
/* Helpers UI                                                          */
/* ------------------------------------------------------------------ */

/** Initiales depuis prénom + nom */
function initials(s: Student) {
    return `${s.firstname[0] ?? ''}${s.lastname[0] ?? ''}`.toUpperCase();
}

/** Couleur d'avatar déterministe par ID */
const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-green-100 text-green-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
    'bg-teal-100 text-teal-700',
];
function avatarColor(id: string) {
    const sum = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

/* ------------------------------------------------------------------ */
/* Composant SearchSelect                                               */
/* ------------------------------------------------------------------ */

interface SearchSelectProps {
    students: Student[];
    value: string;
    onChange: (id: string) => void;
    error?: string;
}

function StudentSearchSelect({ students, value, onChange, error }: Readonly<SearchSelectProps>) {
    const [open, setOpen]   = useState(false);
    const [query, setQuery] = useState('');
    const containerRef      = useRef<HTMLDivElement>(null);
    const inputRef          = useRef<HTMLInputElement>(null);

    const selected = students.find(s => s.id === value) ?? null;

    const filtered = useMemo(() => {
        if (!query.trim()) return students.slice(0, 50);
        const q = query.toLowerCase();
        return students.filter(s =>
            `${s.firstname} ${s.lastname}`.toLowerCase().includes(q) ||
            (s.matricule ?? '').toLowerCase().includes(q)
        ).slice(0, 50);
    }, [students, query]);

    // Fermer si clic extérieur
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (s: Student) => {
        onChange(s.id);
        setOpen(false);
        setQuery('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setQuery('');
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger */}
            <div
                onClick={() => { setOpen(v => !v); setTimeout(() => inputRef.current?.focus(), 50); }}
                className={`flex items-center gap-2 w-full px-3 py-2.5 border rounded-lg cursor-pointer bg-white dark:bg-card transition-colors
                    ${error ? 'border-red-400 dark:border-red-500' : open ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}`}
            >
                <User className="w-4 h-4 text-gray-400 shrink-0" />

                {selected ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(selected.id)}`}>
                            {initials(selected)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate block">
                                {selected.firstname} {selected.lastname}
                            </span>
                        </div>
                        {selected.matricule && (
                            <span className="text-xs text-gray-400 shrink-0">{selected.matricule}</span>
                        )}
                    </div>
                ) : (
                    <span className="text-sm text-gray-400 flex-1">Rechercher un élève...</span>
                )}

                <div className="flex items-center gap-1 shrink-0">
                    {selected && (
                        <button type="button" onClick={handleClear}
                            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                    {/* Search input */}
                    <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Nom, prénom ou matricule..."
                                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                            />
                            {query && (
                                <button type="button" onClick={() => setQuery('')}
                                    className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Liste */}
                    <div className="max-h-56 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-gray-400">
                                Aucun élève trouvé
                            </div>
                        ) : (
                            filtered.map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => handleSelect(s)}
                                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors
                                        ${value === s.id
                                            ? 'bg-blue-50 dark:bg-blue-900/20'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(s.id)}`}>
                                        {initials(s)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {s.firstname} {s.lastname}
                                        </p>
                                        {s.matricule && (
                                            <p className="text-xs text-gray-400">{s.matricule}</p>
                                        )}
                                    </div>
                                    {value === s.id && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                                </div>
                            ))
                        )}
                    </div>

                    {students.length > 50 && filtered.length === 50 && (
                        <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 text-center">
                            {students.length} élèves — affichage des 50 premiers correspondants
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Composant SelectField stylisé avec icône                            */
/* ------------------------------------------------------------------ */

interface SelectFieldProps {
    label: string;
    icon: React.ReactNode;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
}

function SelectField({ label, icon, value, onChange, error, required, children }: Readonly<SelectFieldProps>) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                    {icon}
                </div>
                <select
                    value={value}
                    onChange={onChange}
                    className={`w-full pl-9 pr-9 py-2.5 text-sm border rounded-lg bg-white dark:bg-card dark:text-gray-100
                        appearance-none cursor-pointer transition-colors
                        focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                        ${error
                            ? 'border-red-400 dark:border-red-500 bg-red-50/30'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                >
                    {children}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                    <ChevronDown className="w-4 h-4" />
                </div>
            </div>
            {error && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><X className="w-3 h-3" />{error}</p>}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Composant InputField stylisé avec icône                             */
/* ------------------------------------------------------------------ */

interface InputFieldProps {
    label: string;
    icon: React.ReactNode;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    hint?: string;
}

function InputField({ label, icon, value, onChange, error, type = 'text', placeholder, required, hint }: Readonly<InputFieldProps>) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                    {icon}
                </div>
                <Input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`pl-9 py-2.5 text-sm transition-colors
                        ${error
                            ? 'border-red-400 dark:border-red-500 focus:ring-red-500/30 focus:border-red-500'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                />
            </div>
            {hint && !error && <p className="text-gray-400 text-xs mt-1.5">{hint}</p>}
            {error && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><X className="w-3 h-3" />{error}</p>}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Section header                                                       */
/* ------------------------------------------------------------------ */

function SectionHeader({ icon, title, subtitle, color = 'blue' }: {
    icon: React.ReactNode; title: string; subtitle?: string; color?: 'blue' | 'purple' | 'green';
}) {
    const colors = {
        blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/40',
        green:  'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/40',
    };
    const iconBg = {
        blue:   'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
        purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
        green:  'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
    };
    return (
        <div className={`flex items-center gap-3 px-6 py-4 border-b ${colors[color]}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg[color]}`}>
                {icon}
            </div>
            <div>
                <h2 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h2>
                {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                  */
/* ------------------------------------------------------------------ */

export default function Create({ schools, students, classrooms, academicYears, feeStructures }: Readonly<CreateProps>) {
    const fmt = useMoney();
    const [step, setStep]               = useState(1);
    const [errors, setErrors]           = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pré-sélection par défaut : l'unique (ou première) école active et l'année
    // académique active, pour éviter à l'utilisateur de les choisir à chaque fois.
    const defaultSchoolId = schools[0]?.id ?? '';
    const defaultYearId   = (academicYears.find(y => y.active) ?? academicYears[0])?.id ?? '';

    const [enrollment, setEnrollment] = useState({
        school_id:        defaultSchoolId,
        student_id:       '',
        class_id:         '',
        academic_year_id: defaultYearId,
        enrollment_code:  '',
        enrollment_date:  new Date().toISOString().slice(0, 10),
        status:           'PENDING',
    });

    const [withPayment, setWithPayment] = useState(false);
    const [payment, setPayment] = useState({
        amount:           '',
        payment_method:   'CASH' as PaymentMethod,
        reference_number: '',
        paid_by:          '',
        paid_at:          new Date().toISOString().slice(0, 10),
        notes:            '',
    });

    const applicableFees = useMemo(() =>
        feeStructures.filter(f =>
            f.class_id === enrollment.class_id && f.academic_year_id === enrollment.academic_year_id
        ), [feeStructures, enrollment.class_id, enrollment.academic_year_id]);

    const totalFees = useMemo(() =>
        applicableFees.reduce((s, f) => s + f.amount, 0), [applicableFees]);

    const setEnr = (key: keyof typeof enrollment) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setEnrollment(prev => ({ ...prev, [key]: e.target.value }));

    const setPay = (key: keyof typeof payment) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setPayment(prev => ({ ...prev, [key]: e.target.value }));

    const step1Valid = !!(enrollment.school_id && enrollment.student_id && enrollment.class_id
        && enrollment.academic_year_id && enrollment.enrollment_date);

    /* Récap de l'étape 1 pour affichage dans les étapes suivantes */
    const selectedStudent  = students.find(s => s.id === enrollment.student_id);
    const selectedClass    = classrooms.find(c => c.id === enrollment.class_id);
    const selectedYear     = academicYears.find(y => y.id === enrollment.academic_year_id);
    const selectedSchool   = schools.find(s => s.id === enrollment.school_id);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const payload: Record<string, string> = { ...enrollment };

        if (withPayment && payment.amount) {
            payload.first_payment_amount    = payment.amount;
            payload.first_payment_method    = payment.payment_method;
            payload.first_payment_paid_by   = payment.paid_by;
            payload.first_payment_date      = payment.paid_at;
            payload.first_payment_reference = payment.reference_number;
            payload.first_payment_notes     = payment.notes;
        }

        router.post(route('enrollments.store'), payload as never, {
            onError: (err) => {
                setErrors(err as Record<string, string>);
                setIsSubmitting(false);
                const step1Keys = ['school_id', 'student_id', 'class_id', 'academic_year_id', 'enrollment_date', 'status'];
                if (Object.keys(err).some(k => step1Keys.includes(k))) setStep(1);
            },
            onSuccess: () => setIsSubmitting(false),
        });
    };

    /* -------------------------------------------------------------- */
    /* STEPS CONFIG                                                     */
    /* -------------------------------------------------------------- */

    const STEPS = [
        { n: 1, label: 'Inscription',     icon: <GraduationCap className="w-4 h-4" /> },
        { n: 2, label: 'Récapitulatif',   icon: <FileText className="w-4 h-4" /> },
        { n: 3, label: 'Paiement',        icon: <Banknote className="w-4 h-4" /> },
    ];

    const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode; desc: string }[] = [
        { value: 'CASH',          label: 'Espèces',  icon: <Banknote className="w-5 h-5" />,  desc: 'Paiement en cash' },
        { value: 'MOBILE_MONEY',  label: 'Mobile',   icon: <Smartphone className="w-5 h-5" />, desc: 'Flooz, T-Money...' },
        { value: 'BANK_TRANSFER', label: 'Virement', icon: <Landmark className="w-5 h-5" />,   desc: 'Virement bancaire' },
        { value: 'CHEQUE',        label: 'Chèque',   icon: <FileText className="w-5 h-5" />,   desc: 'Chèque bancaire' },
    ];

    /* -------------------------------------------------------------- */
    /* RENDER                                                           */
    /* -------------------------------------------------------------- */

    return (
        <AppLayout>
            <Head title="Nouvelle inscription" />

            <div className="space-y-6">

                {/* ── En-tête ── */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.get(route('enrollments.index'))}
                        className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nouvelle inscription</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Inscrire un élève pour l'année scolaire</p>
                    </div>
                </div>

                {/* ── Stepper ── */}
                <div className="flex items-center">
                    {STEPS.map(({ n, label, icon }, idx) => (
                        <div key={n} className="flex items-center flex-1 last:flex-none">
                            {/* Step */}
                            <button
                                type="button"
                                disabled={step <= n}
                                onClick={() => step > n && setStep(n)}
                                className="flex items-center gap-2.5 group shrink-0 disabled:cursor-default"
                            >
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 font-semibold text-sm
                                    ${step === n ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/40 scale-110' :
                                      step > n   ? 'bg-green-500 text-white' :
                                                   'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}
                                >
                                    {step > n ? <Check className="w-4 h-4" /> : icon}
                                </div>
                                <div className="hidden sm:block text-left">
                                    <p className={`text-xs font-medium leading-tight transition-colors
                                        ${step === n ? 'text-blue-600 dark:text-blue-400' :
                                          step > n   ? 'text-green-600 dark:text-green-400 group-hover:text-green-700' :
                                                       'text-gray-400 dark:text-gray-500'}`}
                                    >
                                        Étape {n}
                                    </p>
                                    <p className={`text-sm font-semibold leading-tight transition-colors
                                        ${step === n ? 'text-gray-900 dark:text-white' :
                                          step > n   ? 'text-gray-600 dark:text-gray-300' :
                                                       'text-gray-400 dark:text-gray-500'}`}
                                    >
                                        {label}
                                    </p>
                                </div>
                            </button>

                            {/* Connecteur */}
                            {idx < 2 && (
                                <div className="flex-1 mx-3 h-0.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                                    <div className={`h-full transition-all duration-500 ${step > n ? 'bg-green-400 w-full' : 'w-0'}`} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* ── Breadcrumb récap (steps 2 & 3) ── */}
                {step > 1 && selectedStudent && (
                    <div className="flex items-center gap-2 flex-wrap text-sm bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-xl px-4 py-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(selectedStudent.id)}`}>
                            {initials(selectedStudent)}
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">
                            {selectedStudent.firstname} {selectedStudent.lastname}
                        </span>
                        {selectedClass && (
                            <>
                                <span className="text-gray-400">·</span>
                                <span className="text-gray-600 dark:text-gray-300">{selectedClass.name}</span>
                            </>
                        )}
                        {selectedYear && (
                            <>
                                <span className="text-gray-400">·</span>
                                <span className="text-gray-600 dark:text-gray-300">{selectedYear.year}</span>
                            </>
                        )}
                        <button type="button" onClick={() => setStep(1)}
                            className="ml-auto text-blue-600 dark:text-blue-400 text-xs hover:underline font-medium">
                            Modifier
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* ════════════════════════════════════════════════ */}
                    {/* ÉTAPE 1 — Informations de l'inscription          */}
                    {/* ════════════════════════════════════════════════ */}
                    {step === 1 && (
                        <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <SectionHeader
                                icon={<GraduationCap className="w-5 h-5" />}
                                title="Informations de l'inscription"
                                subtitle="Renseignez l'établissement, l'élève et la classe"
                                color="blue"
                            />

                            <div className="p-6 space-y-5">

                                {/* ── Bloc École + Année ── */}
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                                        Établissement
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <SelectField
                                            label="École"
                                            icon={<Building2 className="w-4 h-4" />}
                                            value={enrollment.school_id}
                                            onChange={setEnr('school_id')}
                                            error={errors.school_id}
                                            required
                                        >
                                            <option value="">Sélectionner une école</option>
                                            {schools.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                            ))}
                                        </SelectField>

                                        <SelectField
                                            label="Année académique"
                                            icon={<Calendar className="w-4 h-4" />}
                                            value={enrollment.academic_year_id}
                                            onChange={setEnr('academic_year_id')}
                                            error={errors.academic_year_id}
                                            required
                                        >
                                            <option value="">Sélectionner une année</option>
                                            {academicYears.map(y => (
                                                <option key={y.id} value={y.id}>
                                                    {y.year}{y.active ? ' ✓' : ''}
                                                </option>
                                            ))}
                                        </SelectField>
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-gray-100 dark:border-gray-700" />

                                {/* ── Bloc Élève ── */}
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                                        Élève
                                    </p>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Élève <span className="text-red-500">*</span>
                                        </label>
                                        <StudentSearchSelect
                                            students={students}
                                            value={enrollment.student_id}
                                            onChange={id => setEnrollment(prev => ({ ...prev, student_id: id }))}
                                            error={errors.student_id}
                                        />
                                        {errors.student_id && (
                                            <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                                                <X className="w-3 h-3" />{errors.student_id}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-gray-100 dark:border-gray-700" />

                                {/* ── Bloc Classe + Date + Code + Statut ── */}
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                                        Classe & détails
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <SelectField
                                            label="Classe"
                                            icon={<BookOpen className="w-4 h-4" />}
                                            value={enrollment.class_id}
                                            onChange={setEnr('class_id')}
                                            error={errors.class_id}
                                            required
                                        >
                                            <option value="">Sélectionner une classe</option>
                                            {classrooms.map(c => (
                                                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                            ))}
                                        </SelectField>

                                        <InputField
                                            label="Date d'inscription"
                                            icon={<CalendarDays className="w-4 h-4" />}
                                            type="date"
                                            value={enrollment.enrollment_date}
                                            onChange={setEnr('enrollment_date')}
                                            error={errors.enrollment_date}
                                            required
                                        />

                                        <InputField
                                            label="Code d'inscription"
                                            icon={<Hash className="w-4 h-4" />}
                                            value={enrollment.enrollment_code}
                                            onChange={setEnr('enrollment_code')}
                                            error={errors.enrollment_code}
                                            placeholder="Auto-généré si vide"
                                            hint="Laisser vide pour génération automatique"
                                        />

                                        {/* Statut — radio visuel */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                Statut <span className="text-red-500">*</span>
                                            </label>
                                            <div className="flex gap-2">
                                                {([
                                                    { v: 'PENDING',   label: 'En attente', cls: 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400' },
                                                    { v: 'ACTIVE',    label: 'Actif',       cls: 'border-green-300 bg-green-50 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' },
                                                    { v: 'CANCELLED', label: 'Annulé',      cls: 'border-red-300 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' },
                                                ] as const).map(({ v, label, cls }) => (
                                                    <button
                                                        key={v}
                                                        type="button"
                                                        onClick={() => setEnrollment(prev => ({ ...prev, status: v }))}
                                                        className={`flex-1 py-2 px-2 rounded-lg border-2 text-xs font-semibold transition-all
                                                            ${enrollment.status === v
                                                                ? cls
                                                                : 'border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer étape 1 */}
                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <p className="text-xs text-gray-400">
                                    {[enrollment.school_id, enrollment.student_id, enrollment.class_id, enrollment.academic_year_id].filter(Boolean).length} / 4 champs obligatoires remplis
                                </p>
                                <Button
                                    type="button"
                                    disabled={!step1Valid}
                                    onClick={() => setStep(2)}
                                    className="bg-blue-600 hover:bg-blue-700 gap-2 disabled:opacity-40"
                                >
                                    Suivant
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════════════════════ */}
                    {/* ÉTAPE 2 — Récapitulatif financier                */}
                    {/* ════════════════════════════════════════════════ */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <SectionHeader
                                    icon={<FileText className="w-5 h-5" />}
                                    title="Récapitulatif des frais"
                                    subtitle="Frais générés automatiquement depuis la grille tarifaire"
                                    color="purple"
                                />

                                {applicableFees.length > 0 ? (
                                    <>
                                        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                            {applicableFees.map((f, i) => (
                                                <div key={i} className="flex items-center justify-between px-6 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500 dark:text-purple-400">
                                                            <Banknote className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{f.label}</span>
                                                    </div>
                                                    <span className="font-semibold text-gray-900 dark:text-white">{fmt(f.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between px-6 py-4 bg-purple-50 dark:bg-purple-900/20 border-t-2 border-purple-100 dark:border-purple-900/40">
                                            <span className="font-bold text-gray-900 dark:text-white">Total à régler</span>
                                            <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">{fmt(totalFees)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="px-6 py-10 text-center">
                                        <div className="w-14 h-14 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center mx-auto mb-3">
                                            <Info className="w-7 h-7 text-yellow-500" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Aucun frais configuré
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            La facture sera créée vide — vous pourrez y ajouter des frais manuellement.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between">
                                <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2">
                                    <ArrowLeft className="w-4 h-4" /> Retour
                                </Button>
                                <Button type="button" onClick={() => setStep(3)} className="bg-blue-600 hover:bg-blue-700 gap-2">
                                    Suivant <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════════════════════ */}
                    {/* ÉTAPE 3 — Premier paiement                       */}
                    {/* ════════════════════════════════════════════════ */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <SectionHeader
                                    icon={<Banknote className="w-5 h-5" />}
                                    title="Premier paiement"
                                    subtitle="Optionnel — enregistrable maintenant ou plus tard"
                                    color="green"
                                />

                                <div className="p-6 space-y-5">
                                    {/* Toggle payer maintenant */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border-2 border-dashed transition-colors
                                        border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {withPayment ? 'Paiement à enregistrer maintenant' : 'Payer plus tard'}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {withPayment
                                                    ? 'Un reçu sera généré automatiquement'
                                                    : "L'inscription sera créée avec facture sans paiement"
                                                }
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setWithPayment(v => !v);
                                                if (!withPayment && totalFees > 0) {
                                                    setPayment(p => ({ ...p, amount: String(totalFees) }));
                                                }
                                            }}
                                            className={`relative w-12 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                                                ${withPayment ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform
                                                ${withPayment ? 'translate-x-6' : 'translate-x-0.5'}`}
                                            />
                                        </button>
                                    </div>

                                    {withPayment && (
                                        <div className="space-y-5">
                                            {/* Mode de paiement — cards */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Mode de paiement <span className="text-red-500">*</span>
                                                </label>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    {PAYMENT_METHODS.map(m => (
                                                        <button
                                                            key={m.value}
                                                            type="button"
                                                            onClick={() => setPayment(p => ({ ...p, payment_method: m.value }))}
                                                            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-center
                                                                ${payment.payment_method === m.value
                                                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                                                    : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                                                                }`}
                                                        >
                                                            {m.icon}
                                                            <span className="text-xs font-semibold leading-tight">{m.label}</span>
                                                            <span className="text-xs text-gray-400 leading-tight hidden sm:block">{m.desc}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Montant + Date */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                        Montant (F) <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                            <Banknote className="w-4 h-4 text-gray-400" />
                                                        </div>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            step="any"
                                                            value={payment.amount}
                                                            onChange={setPay('amount')}
                                                            placeholder={totalFees > 0 ? fmt(totalFees) : '0'}
                                                            className={`pl-9 py-2.5 text-sm ${errors.first_payment_amount ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
                                                        />
                                                    </div>
                                                    {totalFees > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPayment(p => ({ ...p, amount: String(totalFees) }))}
                                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                                                        >
                                                            Remplir le total ({fmt(totalFees)})
                                                        </button>
                                                    )}
                                                    {errors.first_payment_amount && (
                                                        <p className="text-red-500 text-xs mt-1">{errors.first_payment_amount}</p>
                                                    )}
                                                </div>

                                                <InputField
                                                    label="Date de paiement"
                                                    icon={<CalendarDays className="w-4 h-4" />}
                                                    type="date"
                                                    value={payment.paid_at}
                                                    onChange={setPay('paid_at')}
                                                    required
                                                />

                                                <InputField
                                                    label="Payé par"
                                                    icon={<User className="w-4 h-4" />}
                                                    value={payment.paid_by}
                                                    onChange={setPay('paid_by')}
                                                    placeholder="Nom du payeur"
                                                />

                                                {(payment.payment_method !== 'CASH') && (
                                                    <InputField
                                                        label="Référence / N° transaction"
                                                        icon={<Hash className="w-4 h-4" />}
                                                        value={payment.reference_number}
                                                        onChange={setPay('reference_number')}
                                                        placeholder="Ex: TXN-123456"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer étape 3 */}
                            <div className="flex justify-between items-center">
                                <Button type="button" variant="outline" onClick={() => setStep(2)} className="gap-2">
                                    <ArrowLeft className="w-4 h-4" /> Retour
                                </Button>

                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-blue-600 hover:bg-blue-700 gap-2 px-6"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                            </svg>
                                            Création en cours...
                                        </span>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            {withPayment ? 'Inscrire & enregistrer le paiement' : 'Créer l\'inscription'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </AppLayout>
    );
}
