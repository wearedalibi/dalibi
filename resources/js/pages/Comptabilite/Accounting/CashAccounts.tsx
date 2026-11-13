import { Head, router } from '@inertiajs/react';
import { Wallet, Plus, Pencil, Trash2, Banknote, Smartphone, Building2, CheckCircle2, XCircle } from 'lucide-react';
import { useMoney } from '@/helpers/money';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/icon-button';
import { Input } from '@/components/ui/input';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type AccountType = 'CASH' | 'MOBILE_MONEY' | 'BANK';

interface CashAccount {
    id: string;
    name: string;
    type: AccountType;
    balance: number;
    active: boolean;
    description?: string | null;
    payments_count: number;
}

interface Props { accounts: CashAccount[]; }

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const typeConfig: Record<AccountType, { icon: React.ReactNode; bg: string; color: string }> = {
    CASH:         { icon: <Banknote className="w-5 h-5" />,    bg: 'bg-green-50 dark:bg-green-900/20',  color: 'text-green-600 dark:text-green-400' },
    MOBILE_MONEY: { icon: <Smartphone className="w-5 h-5" />,  bg: 'bg-orange-50 dark:bg-orange-900/20',color: 'text-orange-600 dark:text-orange-400' },
    BANK:         { icon: <Building2 className="w-5 h-5" />,   bg: 'bg-blue-50 dark:bg-blue-900/20',    color: 'text-blue-600 dark:text-blue-400' },
};

/* ------------------------------------------------------------------ */
/* Formulaire (création / édition)                                     */
/* ------------------------------------------------------------------ */
function AccountForm({ initial, onSubmit, onCancel, submitLabel }: {
    initial: { name: string; type: AccountType; description: string };
    onSubmit: (data: typeof initial) => void;
    onCancel: () => void;
    submitLabel: string;
}) {
    const { t } = useTranslation();
    const [form, setForm] = useState(initial);
    const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [k]: e.target.value }));

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
            <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('comptabilite.cash.name')}</label>
                <Input value={form.name} onChange={f('name')} placeholder={t('comptabilite.cash.name_ph')} />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('comptabilite.cash.type_label')}</label>
                <select
                    value={form.type}
                    onChange={f('type')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-card dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="CASH">{t('comptabilite.cash.opt_cash')}</option>
                    <option value="MOBILE_MONEY">{t('comptabilite.cash.opt_mobile')}</option>
                    <option value="BANK">{t('comptabilite.cash.opt_bank')}</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('comptabilite.cash.description')}</label>
                <Input value={form.description} onChange={f('description')} placeholder={t('comptabilite.cash.description_ph')} />
            </div>
            <div className="sm:col-span-3 flex gap-2">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => onSubmit(form)}>
                    {submitLabel}
                </Button>
                <Button size="sm" variant="outline" onClick={onCancel}>{t('common.actions.cancel')}</Button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                  */
/* ------------------------------------------------------------------ */
export default function CashAccounts({ accounts }: Readonly<Props>) {
    const fmt = useMoney();
    const { t } = useTranslation();
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId]   = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const totalBalance = accounts.filter(a => a.active).reduce((s, a) => s + a.balance, 0);

    const handleCreate = (data: { name: string; type: AccountType; description: string }) => {
        router.post(route('cash-accounts.store'), data, {
            onSuccess: () => setShowCreate(false),
        });
    };

    const handleUpdate = (id: string, data: { name: string; type: AccountType; description: string }) => {
        router.put(route('cash-accounts.update', id), data, {
            onSuccess: () => setEditingId(null),
        });
    };

    const handleDelete = (id: string) => {
        router.delete(route('cash-accounts.destroy', id), {
            onSuccess: () => setDeletingId(null),
        });
    };

    return (
        <AppLayout>
            <Head title={t('comptabilite.cash.head')} />

            <div className="space-y-6">

                {/* ── En-tête ── */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            {t('comptabilite.cash.title')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {t('comptabilite.cash.subtitle')}
                        </p>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => setShowCreate(v => !v)}>
                        <Plus className="w-4 h-4" /> {t('comptabilite.cash.new')}
                    </Button>
                </div>

                {/* ── Solde global ── */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
                    <p className="text-sm font-medium text-blue-100 mb-1">{t('comptabilite.cash.global_balance')}</p>
                    <p className="text-4xl font-extrabold">{fmt(totalBalance)}</p>
                    <p className="text-blue-200 text-xs mt-2">{t('comptabilite.cash.active_count', { count: accounts.filter(a => a.active).length })}</p>
                </div>

                {/* ── Formulaire création ── */}
                {showCreate && (
                    <AccountForm
                        initial={{ name: '', type: 'CASH', description: '' }}
                        onSubmit={handleCreate}
                        onCancel={() => setShowCreate(false)}
                        submitLabel={t('comptabilite.cash.create_submit')}
                    />
                )}

                {/* ── Grille des caisses ── */}
                {accounts.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>{t('comptabilite.cash.empty')}</p>
                        <p className="text-sm mt-1">{t('comptabilite.cash.empty_hint')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {accounts.map(account => {
                            const tc = typeConfig[account.type];
                            const isEditing = editingId === account.id;

                            return (
                                <div key={account.id} className={`bg-white dark:bg-card rounded-xl border dark:border-gray-700 shadow-sm overflow-hidden ${!account.active ? 'opacity-60' : ''}`}>
                                    {isEditing ? (
                                        <div className="p-4">
                                            <AccountForm
                                                initial={{ name: account.name, type: account.type, description: account.description ?? '' }}
                                                onSubmit={d => handleUpdate(account.id, d)}
                                                onCancel={() => setEditingId(null)}
                                                submitLabel={t('common.actions.save')}
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            {/* Header carte */}
                                            <div className={`p-4 flex items-center gap-3 ${tc.bg}`}>
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tc.bg} ${tc.color}`}>
                                                    {tc.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-semibold text-sm ${tc.color}`}>{t(`comptabilite.cash.type.${account.type}`)}</p>
                                                    <p className="font-bold text-gray-900 dark:text-white truncate">{account.name}</p>
                                                </div>
                                                {account.active
                                                    ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                                    : <XCircle className="w-4 h-4 text-gray-400 shrink-0" />
                                                }
                                            </div>

                                            {/* Body */}
                                            <div className="p-4 space-y-3">
                                                <div>
                                                    <p className="text-xs text-gray-400">{t('comptabilite.cash.current_balance')}</p>
                                                    <p className={`text-2xl font-extrabold ${account.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600'}`}>
                                                        {fmt(account.balance)}
                                                    </p>
                                                </div>
                                                {account.description && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">{account.description}</p>
                                                )}
                                                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                                                    <span className="text-xs text-gray-400">
                                                        {t('comptabilite.cash.payments_count', { count: account.payments_count })}
                                                    </span>
                                                    <div className="flex gap-1.5">
                                                        <Button size="sm" variant="outline" className="gap-1 text-xs"
                                                            onClick={() => setEditingId(account.id)}>
                                                            <Pencil className="w-3.5 h-3.5" /> {t('common.actions.edit')}
                                                        </Button>
                                                        <IconButton
                                                            label={t('common.actions.delete')}
                                                            icon={<Trash2 className="w-3.5 h-3.5" />}
                                                            className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                                                            onClick={() => setDeletingId(account.id)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('comptabilite.cash.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('comptabilite.cash.delete_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('common.actions.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700"
                            onClick={() => deletingId && handleDelete(deletingId)}>
                            {t('common.actions.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
