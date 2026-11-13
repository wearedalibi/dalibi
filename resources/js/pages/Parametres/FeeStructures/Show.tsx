import { Head, router } from '@inertiajs/react';
import { useMoney } from '@/helpers/money';
import { ArrowLeft, Pencil, Trash2, DollarSign, Layers, Calendar, BookOpen, Users, Clock, CreditCard } from 'lucide-react';
import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface AcademicYear {
    id: string;
    year: string;
}

interface FeeCategory {
    id: string;
    name: string;
}

interface Classroom {
    id: string;
    name: string;
    code: string;
}

interface Installment {
    id: string;
    name: string;
    installment_number: number;
    amount: number;
    created_at: string;
    updated_at: string;
}

interface FeeStructure {
    id: string;
    amount: number;
    created_at: string;
    updated_at: string;
    academic_year: AcademicYear;
    fee_category: FeeCategory;
    classroom: Classroom;
    installments: Installment[];
}

interface ShowProps {
    feeStructure: FeeStructure;
}

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export default function Show({ feeStructure }: Readonly<ShowProps>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [installmentsModal, setInstallmentsModal] = useState(false);
    const [newInstallments, setNewInstallments] = useState<Array<{uid: string, name: string, installment_number: string, amount: string}>>([{uid: uid(), name: '', installment_number: '1', amount: '0'}]);
    const [installmentsError, setInstallmentsError] = useState<string>('');

    // Calculer le total des tranches
    const totalInstallments = newInstallments.reduce((total, inst) => {
        const amount = Number.parseFloat(inst.amount) || 0;
        return total + amount;
    }, 0);

    // Vérifier si le total dépasse le montant de la structure
    const isTotalExceeded = totalInstallments > feeStructure.amount;

    const addInstallmentRow = () => {
        const nextNumber = Math.max(...newInstallments.map(inst => Number.parseInt(inst.installment_number, 10) || 0), 0) + 1;
        const updated = [...newInstallments, {uid: uid(), name: '', installment_number: nextNumber.toString(), amount: '0'}];
        setNewInstallments(updated);

        // Vérifier le total
        const newTotal = updated.reduce((total, inst) => {
            const amount = Number.parseFloat(inst.amount) || 0;
            return total + amount;
        }, 0);

        if (newTotal > feeStructure.amount) {
            setInstallmentsError(t('parametres.fee_structures.total_exceeds', { total: formatMoney(newTotal), amount: formatMoney(feeStructure.amount) }));
        } else {
            setInstallmentsError('');
        }
    };

    const removeInstallmentRow = (index: number) => {
        const updated = newInstallments.filter((_, i) => i !== index);
        setNewInstallments(updated);

        // Vérifier le total
        const newTotal = updated.reduce((total, inst) => {
            const amount = Number.parseFloat(inst.amount) || 0;
            return total + amount;
        }, 0);

        if (newTotal > feeStructure.amount) {
            setInstallmentsError(t('parametres.fee_structures.total_exceeds', { total: formatMoney(newTotal), amount: formatMoney(feeStructure.amount) }));
        } else {
            setInstallmentsError('');
        }
    };

    const updateInstallment = (index: number, field: 'name' | 'installment_number' | 'amount', value: string) => {
        const updated = [...newInstallments];
        updated[index][field] = value || '';
        setNewInstallments(updated);

        // Vérifier le total après mise à jour
        const newTotal = updated.reduce((total, inst) => {
            const amount = Number.parseFloat(inst.amount) || 0;
            return total + amount;
        }, 0);

        if (newTotal > feeStructure.amount) {
            setInstallmentsError(t('parametres.fee_structures.total_exceeds', { total: formatMoney(newTotal), amount: formatMoney(feeStructure.amount) }));
        } else {
            setInstallmentsError('');
        }
    };

    const fmtMoney = useMoney();
    const formatMoney = (amount: number) => {
        return fmtMoney(amount);
    };

    const getCategoryColor = (categoryName: string): string => {
        const colorMap: Record<string, string> = {
            'Inscription': 'bg-red-50 text-red-700',
            'Écolage': 'bg-blue-50 text-blue-700',
            'Tenue scolaire': 'bg-purple-50 text-purple-700',
            'Transport': 'bg-amber-50 text-amber-700',
            'Cantine': 'bg-green-50 text-green-700',
            'Activité': 'bg-pink-50 text-pink-700',
        };
        return colorMap[categoryName] || 'bg-gray-50 text-gray-700';
    };

    const handleDelete = () => {
        setIsDeleting(true);
        router.delete(route('fee-structures.destroy', feeStructure.id), {
            onSuccess: () => {
                setDeleteConfirm(false);
            },
            onError: () => {
                setIsDeleting(false);
            },
        });
    };

    return (
        <AppLayout>
            <Head title={t('parametres.fee_structures.show_head')} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.visit(route('fee-structures.index'))}
                            className="text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t('parametres.fee_structures.back')}
                        </Button>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                // Pré-remplir avec les tranches existantes ou une tranche vide
                                if (feeStructure.installments && feeStructure.installments.length > 0) {
                                    setNewInstallments(feeStructure.installments.map(inst => ({
                                        uid: uid(),
                                        name: inst.name,
                                        installment_number: inst.installment_number.toString(),
                                        amount: inst.amount.toString()
                                    })));
                                } else {
                                    setNewInstallments([{uid: uid(), name: '', installment_number: '1', amount: '0'}]);
                                }
                                setInstallmentsModal(true);
                            }}
                            className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                            <Layers className="h-4 w-4 mr-2" />
                            {t('parametres.fee_structures.manage_installments')}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.visit(route('fee-structures.edit', feeStructure.id))}
                            className="border-slate-200"
                        >
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('parametres.fee_structures.edit')}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteConfirm(true)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('parametres.fee_structures.delete')}
                        </Button>
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <DollarSign className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                                {t('parametres.fee_structures.show_heading')}
                            </h1>
                            <p className="text-lg text-gray-600 mt-1">
                                {feeStructure.fee_category.name} - {feeStructure.classroom.name}
                            </p>
                        </div>
                    </div>
                    <div className="bg-linear-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">{t('parametres.fee_structures.show_amount_total')}</p>
                                <p className="text-3xl font-bold">{formatMoney(feeStructure.amount)}</p>
                                <p className="text-blue-100 text-sm mt-1">
                                    {feeStructure.academic_year.year} • {t('parametres.fee_structures.installments_count', { count: feeStructure.installments?.length || 0 })}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm ${getCategoryColor(feeStructure.fee_category.name).replace('bg-', 'text-').replace('-50', '-600')}`}>
                                    <DollarSign className="h-4 w-4" />
                                    {feeStructure.fee_category.name}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contenu principal */}
                <div className="space-y-6">
                    {/* Section Informations générales */}
                    <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <BookOpen className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-blue-900">{t('parametres.fee_structures.show_general')}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white/60 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-blue-600" />
                                    <div className="text-sm font-medium text-blue-800">{t('parametres.fee_structures.show_year')}</div>
                                </div>
                                <p className="text-lg font-semibold text-gray-900">{feeStructure.academic_year.year}</p>
                            </div>
                            <div className="bg-white/60 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="h-4 w-4 text-blue-600" />
                                    <div className="text-sm font-medium text-blue-800">{t('parametres.fee_structures.show_category')}</div>
                                </div>
                                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${getCategoryColor(feeStructure.fee_category.name)}`}>
                                    <DollarSign className="h-3.5 w-3.5" />
                                    {feeStructure.fee_category.name}
                                </span>
                            </div>
                        </div>
                        <div className="mt-4 bg-white/60 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-blue-600" />
                                <div className="text-sm font-medium text-blue-800">{t('parametres.fee_structures.show_class')}</div>
                            </div>
                            <p className="text-lg font-semibold text-gray-900">{feeStructure.classroom.name}</p>
                            <p className="text-sm text-gray-600 mt-1">{t('parametres.fee_structures.show_code')}: <span className="font-medium">{feeStructure.classroom.code}</span></p>
                        </div>
                    </div>

                    {/* Section Montant et tranches */}
                    <div className="bg-linear-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <CreditCard className="h-5 w-5 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-green-900">{t('parametres.fee_structures.show_amount_section')}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white/60 rounded-lg p-4">
                                <div className="text-sm font-medium text-green-800 mb-2">{t('parametres.fee_structures.show_amount_total')}</div>
                                <p className="text-3xl font-bold text-green-600">{formatMoney(feeStructure.amount)}</p>
                            </div>
                            <div className="bg-white/60 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Layers className="h-4 w-4 text-green-600" />
                                        <div className="text-sm font-medium text-green-800">{t('parametres.fee_structures.installments')}</div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            // Pré-remplir avec les tranches existantes ou une tranche vide
                                            if (feeStructure.installments && feeStructure.installments.length > 0) {
                                                setNewInstallments(feeStructure.installments.map(inst => ({
                                                    uid: uid(),
                                                    name: inst.name,
                                                    installment_number: inst.installment_number.toString(),
                                                    amount: inst.amount.toString()
                                                })));
                                            } else {
                                                setNewInstallments([{uid: uid(), name: '', installment_number: '1', amount: '0'}]);
                                            }
                                            setInstallmentsModal(true);
                                        }}
                                        className="border-green-300 text-green-600 hover:bg-green-50"
                                    >
                                        <Layers className="h-4 w-4 mr-2" />
                                        {t('parametres.fee_structures.manage')}
                                    </Button>
                                </div>
                                {feeStructure.installments && feeStructure.installments.length > 0 ? (
                                    <div className="space-y-2">
                                        {feeStructure.installments
                                            .toSorted((a, b) => a.installment_number - b.installment_number)
                                            .map((installment) => (
                                            <div key={installment.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                                <div>
                                                    <p className="font-medium text-gray-900">{installment.name}</p>
                                                    <p className="text-xs text-gray-600">{t('parametres.fee_structures.installment_num', { num: installment.installment_number })}</p>
                                                </div>
                                                <p className="font-semibold text-green-700">{formatMoney(installment.amount)}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">{t('parametres.fee_structures.no_installments')}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section Métadonnées */}
                    <div className="bg-linear-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-gray-100 rounded-lg">
                                <Clock className="h-5 w-5 text-gray-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">{t('parametres.fee_structures.show_system')}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white/60 rounded-lg p-4">
                                <div className="text-sm font-medium text-gray-700 mb-2">{t('parametres.fee_structures.show_created_on')}</div>
                                <p className="text-sm text-gray-900">
                                    {new Date(feeStructure.created_at).toLocaleDateString(dateLocale, {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>
                            <div className="bg-white/60 rounded-lg p-4">
                                <div className="text-sm font-medium text-gray-700 mb-2">{t('parametres.fee_structures.show_updated_on')}</div>
                                <p className="text-sm text-gray-900">
                                    {new Date(feeStructure.updated_at).toLocaleDateString(dateLocale, {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 bg-white/60 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-700 mb-2">{t('parametres.fee_structures.show_uid')}</div>
                            <p className="text-sm text-gray-600 font-mono bg-gray-100 px-3 py-1 rounded">{feeStructure.id}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dialog de confirmation de suppression */}
            <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('parametres.fee_structures.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('parametres.fee_structures.delete_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-3">
                        <AlertDialogCancel disabled={isDeleting}>{t('parametres.fee_structures.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? t('parametres.fee_structures.deleting') : t('parametres.fee_structures.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de gestion des tranches */}
            <Dialog open={installmentsModal} onOpenChange={setInstallmentsModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('parametres.fee_structures.modal_title')}</DialogTitle>
                        <DialogDescription>
                            {t('parametres.fee_structures.modal_desc')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="bg-blue-50 rounded-lg p-4 ring-1 ring-blue-100">
                            <div className="flex items-center gap-2 mb-2">
                                <CreditCard className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">{t('parametres.fee_structures.current_structure')}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">{t('parametres.fee_structures.current_total')}</span>
                                    <span className="font-semibold text-gray-900 ml-2">{formatMoney(feeStructure.amount)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">{t('parametres.fee_structures.current_installments')}</span>
                                    <span className="font-semibold text-gray-900 ml-2">{feeStructure.installments?.length || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-4 ring-1 ring-green-100">
                            <div className="flex items-center gap-2 mb-2">
                                <Layers className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-800">{t('parametres.fee_structures.configured_total')}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">{t('parametres.fee_structures.installments_total_label')}</span>
                                <span className={`font-bold text-lg ${isTotalExceeded ? 'text-red-600' : 'text-green-600'}`}>
                                    {formatMoney(totalInstallments)}
                                </span>
                            </div>
                            {installmentsError && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-sm text-red-700">{installmentsError}</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            {newInstallments.map((installment, index) => {
                                const nameId = `installment-name-${index}`;
                                const numberId = `installment-number-${index}`;
                                const amountId = `installment-amount-${index}`;

                                return (
                                <div key={installment.uid} className="flex gap-3 items-end">
                                    <div className="flex-1">
                                        <label htmlFor={nameId} className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('parametres.fee_structures.installment_name')}
                                        </label>
                                        <input
                                            id={nameId}
                                            type="text"
                                            value={installment.name}
                                            onChange={(e) => updateInstallment(index, 'name', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder={t('parametres.fee_structures.installment_name_ph')}
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label htmlFor={numberId} className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('parametres.fee_structures.installment_number_label')}
                                        </label>
                                        <input
                                            id={numberId}
                                            type="number"
                                            value={installment.installment_number}
                                            onChange={(e) => updateInstallment(index, 'installment_number', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="1"
                                            min="1"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label htmlFor={amountId} className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('parametres.fee_structures.installment_amount')}
                                        </label>
                                        <input
                                            id={amountId}
                                            type="number"
                                            value={installment.amount}
                                            onChange={(e) => updateInstallment(index, 'amount', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="0"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => removeInstallmentRow(index)}
                                        disabled={newInstallments.length === 1}
                                        className="border-red-300 text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                );
                            })}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={addInstallmentRow}
                            className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                            <Layers className="h-4 w-4 mr-2" />
                            {t('parametres.fee_structures.add_installment')}
                        </Button>
                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setInstallmentsModal(false);
                                    setNewInstallments([{uid: uid(), name: '', installment_number: '1', amount: '0'}]);
                                }}
                            >
                                {t('parametres.fee_structures.cancel')}
                            </Button>
                            <Button
                                onClick={() => {
                                    const validInstallments = newInstallments.filter(inst =>
                                        inst.name.trim() &&
                                        inst.installment_number.trim() &&
                                        inst.amount.trim() &&
                                        Number.parseFloat(inst.amount) > 0
                                    );
                                    if (validInstallments.length === 0) {
                                        alert(t('parametres.fee_structures.err_valid_installment'));
                                        return;
                                    }
                                    if (isTotalExceeded) {
                                        alert(t('parametres.fee_structures.err_total_exceeds'));
                                        return;
                                    }
                                    router.post(route('fee-structures.installments.store-multiple', feeStructure.id), {
                                        installments: validInstallments,
                                    }, {
                                        preserveScroll: true,
                                        onSuccess: () => {
                                            setInstallmentsModal(false);
                                            setNewInstallments([{uid: uid(), name: '', installment_number: '1', amount: '0'}]);
                                            setInstallmentsError('');
                                        },
                                        onError: (errs) => {
                                            setInstallmentsError(errs.installments ?? t('parametres.fee_structures.err_saving'));
                                        },
                                    });
                                }}
                                disabled={isTotalExceeded}
                                className={`bg-blue-600 hover:bg-blue-700 ${isTotalExceeded ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Layers className="h-4 w-4 mr-2" />
                                {t('parametres.fee_structures.save_installments')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
