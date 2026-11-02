import { UserCircle, Wallet, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/helpers/i18n';

export interface UserOption { id: string; name: string; email: string | null; }
export interface ContractType { value: string; label: string; }
export interface SalaryGradeOption { id: string; name: string; base_amount: number; }

export interface EmployeeFormData {
    user_id: string;
    employee_number: string;
    job_title: string;
    department: string;
    contract_type: string;
    salary_grade_id: string;
    hire_date: string;
    end_date: string;
    base_salary: string;
    payment_method: string;
    bank_name: string;
    bank_account: string;
    momo_number: string;
    cnss_number: string;
    status: string;
    notes: string;
}

const PAYMENT_METHODS = [
    { value: 'CASH', key: 'method_cash' },
    { value: 'MOBILE_MONEY', key: 'method_mobile_money' },
    { value: 'BANK_TRANSFER', key: 'method_bank_transfer' },
    { value: 'CHEQUE', key: 'method_cheque' },
];

const STATUSES = [
    { value: 'active', key: 'status_active' },
    { value: 'suspended', key: 'status_suspended' },
    { value: 'terminated', key: 'status_terminated' },
];

interface Props {
    mode: 'create' | 'edit';
    data: EmployeeFormData;
    errors: Record<string, string>;
    processing: boolean;
    contractTypes: ContractType[];
    salaryGrades?: SalaryGradeOption[];
    users?: UserOption[];
    employeeName?: string;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    onCancel: () => void;
    setData: <K extends keyof EmployeeFormData>(key: K, value: EmployeeFormData[K]) => void;
}

function Err({ msg }: { msg?: string }) {
    return msg ? <p className="text-red-600 text-sm mt-1">{msg}</p> : null;
}

export function EmployeeForm({ mode, data, errors, processing, contractTypes, salaryGrades = [], users = [], employeeName, onSubmit, onCancel, setData }: Readonly<Props>) {
    const { t } = useTranslation();
    const ef = (k: string, params?: Record<string, string | number>) => t('administration.users.employee_form.' + k, params);
    const selectedGrade = salaryGrades.find(g => g.id === data.salary_grade_id) ?? null;
    const isMoMo = data.payment_method === 'MOBILE_MONEY';
    const isBank = data.payment_method === 'BANK_TRANSFER' || data.payment_method === 'CHEQUE';

    let submitLabel = ef('update');
    if (processing && mode === 'create') submitLabel = ef('saving');
    else if (processing) submitLabel = ef('updating');
    else if (mode === 'create') submitLabel = ef('create');

    return (
        <form onSubmit={onSubmit} className="space-y-6 max-w-4xl">

            {/* Identité & poste */}
            <div className="rounded-2xl bg-linear-to-br from-blue-50 to-white ring-1 ring-blue-100 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-blue-700">
                    <UserCircle className="h-4 w-4" />
                    <p className="text-sm font-semibold">{ef('identity')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mode === 'create' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">{ef('user')}</label>
                            <Select value={data.user_id} onValueChange={(v) => setData('user_id', v)}>
                                <SelectTrigger className={errors.user_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={ef('select_user')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.name}{u.email ? ` — ${u.email}` : ''}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Err msg={errors.user_id} />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">{ef('employee')}</label>
                            <Input value={employeeName ?? ''} disabled />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">{ef('employee_number')}</label>
                        <Input value={data.employee_number} onChange={e => setData('employee_number', e.target.value)} placeholder={ef('employee_number_ph')} className={errors.employee_number ? 'border-red-500' : ''} />
                        <Err msg={errors.employee_number} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">{ef('job')}</label>
                        <Input value={data.job_title} onChange={e => setData('job_title', e.target.value)} placeholder={ef('job_ph')} className={errors.job_title ? 'border-red-500' : ''} />
                        <Err msg={errors.job_title} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">{ef('department')}</label>
                        <Input value={data.department} onChange={e => setData('department', e.target.value)} placeholder={ef('department_ph')} />
                        <Err msg={errors.department} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">{ef('contract')}</label>
                        <Select value={data.contract_type} onValueChange={(v) => setData('contract_type', v)}>
                            <SelectTrigger className={errors.contract_type ? 'border-red-500' : ''}>
                                <SelectValue placeholder={ef('select')} />
                            </SelectTrigger>
                            <SelectContent>
                                {contractTypes.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Err msg={errors.contract_type} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">{ef('status')}</label>
                        <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                            <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                                <SelectValue placeholder={ef('select')} />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{ef(s.key)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Err msg={errors.status} />
                    </div>
                </div>
            </div>

            {/* Rémunération */}
            <div className="rounded-2xl bg-linear-to-br from-emerald-50 to-white ring-1 ring-emerald-100 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-emerald-700">
                    <Wallet className="h-4 w-4" />
                    <p className="text-sm font-semibold">{ef('remuneration')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-900 mb-2">{ef('grade')}</label>
                        <Select value={data.salary_grade_id || 'none'} onValueChange={(v) => setData('salary_grade_id', v === 'none' ? '' : v)}>
                            <SelectTrigger><SelectValue placeholder={ef('no_grade_ph')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{ef('no_grade')}</SelectItem>
                                {salaryGrades.map(g => <SelectItem key={g.id} value={g.id}>{g.name} — {g.base_amount.toLocaleString('fr-FR')} F</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {selectedGrade && <p className="text-xs text-emerald-600 mt-1">{ef('grade_base', { amount: `${selectedGrade.base_amount.toLocaleString('fr-FR')} F` })}</p>}
                        <Err msg={errors.salary_grade_id} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                            {selectedGrade ? ef('base_ignored') : ef('base')}
                        </label>
                        <Input type="number" min={0} value={data.base_salary} onChange={e => setData('base_salary', e.target.value)} placeholder={ef('base_ph')} disabled={!!selectedGrade} className={errors.base_salary ? 'border-red-500' : ''} />
                        <Err msg={errors.base_salary} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">{ef('payment_method')}</label>
                        <Select value={data.payment_method} onValueChange={(v) => setData('payment_method', v)}>
                            <SelectTrigger className={errors.payment_method ? 'border-red-500' : ''}>
                                <SelectValue placeholder={ef('select')} />
                            </SelectTrigger>
                            <SelectContent>
                                {PAYMENT_METHODS.map(p => <SelectItem key={p.value} value={p.value}>{ef(p.key)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Err msg={errors.payment_method} />
                    </div>

                    {isMoMo && (
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">{ef('momo_number')}</label>
                            <Input value={data.momo_number} onChange={e => setData('momo_number', e.target.value)} placeholder={ef('momo_number_ph')} />
                            <Err msg={errors.momo_number} />
                        </div>
                    )}

                    {isBank && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">{ef('bank_name')}</label>
                                <Input value={data.bank_name} onChange={e => setData('bank_name', e.target.value)} placeholder={ef('bank_name_ph')} />
                                <Err msg={errors.bank_name} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">{ef('bank_account')}</label>
                                <Input value={data.bank_account} onChange={e => setData('bank_account', e.target.value)} />
                                <Err msg={errors.bank_account} />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">{ef('cnss_number')}</label>
                        <Input value={data.cnss_number} onChange={e => setData('cnss_number', e.target.value)} placeholder={ef('cnss_number_ph')} />
                        <Err msg={errors.cnss_number} />
                    </div>
                </div>
            </div>

            {/* Dates & notes */}
            <div className="rounded-2xl bg-linear-to-br from-slate-50 to-white ring-1 ring-slate-100 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-600">
                    <CalendarDays className="h-4 w-4" />
                    <p className="text-sm font-semibold">{ef('contract_notes')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">{ef('hire_date')}</label>
                        <Input type="date" value={data.hire_date} onChange={e => setData('hire_date', e.target.value)} className={errors.hire_date ? 'border-red-500' : ''} />
                        <Err msg={errors.hire_date} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">{ef('end_date')}</label>
                        <Input type="date" value={data.end_date} onChange={e => setData('end_date', e.target.value)} className={errors.end_date ? 'border-red-500' : ''} />
                        <Err msg={errors.end_date} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-900 mb-2">{ef('notes')}</label>
                        <textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <Err msg={errors.notes} />
                    </div>
                </div>
            </div>

            <div className="flex gap-3">
                <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700">{submitLabel}</Button>
                <Button type="button" variant="outline" className="border-slate-200 text-gray-700" onClick={onCancel}>{ef('cancel')}</Button>
            </div>
        </form>
    );
}
