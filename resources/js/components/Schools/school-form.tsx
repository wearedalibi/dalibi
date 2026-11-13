import { Building2, ImageIcon, Mail, MapPin, MapPinned, Phone, Quote, Save, ShieldCheck, Smartphone, WalletCards } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/helpers/i18n';

export interface ClassroomTypeOption { id: string; name: string; period_system: string; }
export interface CurrencyOption { code: string; label: string; symbol: string; }

export interface SchoolFormData {
    name: string;
    code: string;
    logo: File | null;
    devise: string;
    currency: string;
    terme: string;
    ministry: string;
    email: string;
    phone: string;
    address: string;
    region: string;
    city: string;
    po_box: string;
    active: boolean;
    portal_enabled: boolean;
    class_type_ids: string[];
}

interface SchoolFormProps {
    mode: 'create' | 'edit';
    data: SchoolFormData;
    errors: Record<string, string>;
    processing: boolean;
    currentLogoUrl?: string | null;
    classroomTypes?: ClassroomTypeOption[];
    currencies?: CurrencyOption[];
    onCancel: () => void;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    setData: <K extends keyof SchoolFormData>(key: K, value: SchoolFormData[K]) => void;
}

export function SchoolForm({ mode, data, errors, processing, currentLogoUrl, classroomTypes = [], currencies = [], onCancel, onSubmit, setData }: Readonly<SchoolFormProps>) {
    const { t } = useTranslation();
    const toggleClassType = (id: string) => {
        const current = data.class_type_ids ?? [];
        setData('class_type_ids', current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
    };
    const fileRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(currentLogoUrl ?? null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setData('logo', file);
        setPreview(file ? URL.createObjectURL(file) : (currentLogoUrl ?? null));
    };

    let submitLabel = t('parametres.common.update');
    if (processing && mode === 'create') submitLabel = t('parametres.common.creating');
    else if (processing) submitLabel = t('parametres.common.updating');
    else if (mode === 'create') submitLabel = t('parametres.schools.submit_create');

    return (
        <form onSubmit={onSubmit} className="space-y-6">

            {/* Identité */}
            <div className="rounded-2xl p-5 bg-linear-to-br from-blue-50/60 to-white ring-1 ring-blue-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('parametres.schools.section_identity')}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">{t('parametres.schools.name')} *</label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={e => setData('name', e.target.value)}
                            disabled={processing}
                            className={errors.name ? 'border-red-500 bg-red-50/40' : ''}
                            placeholder={t('parametres.schools.name_ph')}
                        />
                        {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                    </div>

                    <div>
                        <label htmlFor="code" className="block text-sm font-medium text-gray-900 mb-2">{t('parametres.schools.code')} *</label>
                        <Input
                            id="code"
                            value={data.code}
                            onChange={e => setData('code', e.target.value)}
                            disabled={processing}
                            className={errors.code ? 'border-red-500 bg-red-50/40' : ''}
                            placeholder={t('parametres.schools.code_ph')}
                        />
                        {errors.code && <p className="text-sm text-red-600 mt-1">{errors.code}</p>}
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="terme" className="block text-sm font-medium text-gray-900 mb-2">{t('parametres.schools.terme')}</label>
                        <Input
                            id="terme"
                            value={data.terme}
                            onChange={e => setData('terme', e.target.value)}
                            disabled={processing}
                            className={errors.terme ? 'border-red-500 bg-red-50/40' : ''}
                            placeholder={t('parametres.schools.terme_ph')}
                        />
                        {errors.terme && <p className="text-sm text-red-600 mt-1">{errors.terme}</p>}
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="ministry" className="block text-sm font-medium text-gray-900 mb-2">{t('parametres.schools.ministry')}</label>
                        <Input
                            id="ministry"
                            value={data.ministry}
                            onChange={e => setData('ministry', e.target.value)}
                            disabled={processing}
                            className={errors.ministry ? 'border-red-500 bg-red-50/40' : ''}
                            placeholder={t('parametres.schools.ministry_ph')}
                        />
                        <p className="text-xs text-gray-400 mt-1">{t('parametres.schools.ministry_hint')}</p>
                        {errors.ministry && <p className="text-sm text-red-600 mt-1">{errors.ministry}</p>}
                    </div>

                    <div>
                        <label htmlFor="devise" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                            <Quote className="w-4 h-4 text-blue-500" />
                            {t('parametres.schools.devise_label')}
                        </label>
                        <Input
                            id="devise"
                            value={data.devise}
                            onChange={e => setData('devise', e.target.value)}
                            disabled={processing}
                            className={errors.devise ? 'border-red-500 bg-red-50/40' : ''}
                            placeholder={t('parametres.schools.devise_ph')}
                        />
                        {errors.devise && <p className="text-sm text-red-600 mt-1">{errors.devise}</p>}
                    </div>

                    <div>
                        <label htmlFor="currency" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                            <WalletCards className="w-4 h-4 text-emerald-500" />
                            {t('parametres.schools.currency')}
                        </label>
                        <select
                            id="currency"
                            value={data.currency}
                            onChange={e => setData('currency', e.target.value)}
                            disabled={processing}
                            className={`w-full h-10 rounded-md border bg-white px-3 text-sm ${errors.currency ? 'border-red-500 bg-red-50/40' : 'border-gray-300'}`}
                        >
                            {currencies.map(c => (
                                <option key={c.code} value={c.code}>{c.label} — {c.symbol}</option>
                            ))}
                        </select>
                        {errors.currency && <p className="text-sm text-red-600 mt-1">{errors.currency}</p>}
                    </div>
                </div>
            </div>

            {/* Logo et contact */}
            <div className="rounded-2xl p-5 bg-linear-to-br from-violet-50/60 to-white ring-1 ring-violet-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-violet-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('parametres.schools.section_logo')}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Upload logo */}
                    <div className="md:col-span-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                            <ImageIcon className="w-4 h-4 text-violet-600" />
                            {t('parametres.schools.logo_label')}
                        </label>
                        <div className="flex items-center gap-4">
                            {preview ? (
                                <img src={preview} alt="Logo" className="h-16 w-16 object-contain rounded-lg ring-1 ring-gray-200 bg-white p-1" />
                            ) : (
                                <div className="h-16 w-16 rounded-lg ring-1 ring-gray-200 bg-gray-50 flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-gray-300" />
                                </div>
                            )}
                            <div className="flex-1">
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={handleFile}
                                    disabled={processing}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileRef.current?.click()}
                                    disabled={processing}
                                    className="gap-2"
                                >
                                    <ImageIcon className="w-4 h-4" />
                                    {preview ? t('parametres.schools.change_logo') : t('parametres.schools.choose_image')}
                                </Button>
                                <p className="text-xs text-gray-400 mt-1">{t('parametres.schools.logo_hint')}</p>
                            </div>
                        </div>
                        {errors.logo && <p className="text-sm text-red-600 mt-1">{errors.logo}</p>}
                    </div>

                    <div>
                        <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                            <Mail className="w-4 h-4 text-violet-600" />
                            {t('parametres.schools.email_label')}
                        </label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={e => setData('email', e.target.value)}
                            disabled={processing}
                            className={errors.email ? 'border-red-500 bg-red-50/40' : ''}
                            placeholder={t('parametres.schools.email_ph')}
                        />
                        {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                    </div>

                    <div>
                        <label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                            <Phone className="w-4 h-4 text-violet-600" />
                            {t('parametres.schools.phone_label')}
                        </label>
                        <Input
                            id="phone"
                            value={data.phone}
                            onChange={e => setData('phone', e.target.value)}
                            disabled={processing}
                            className={errors.phone ? 'border-red-500 bg-red-50/40' : ''}
                            placeholder={t('parametres.schools.phone_ph')}
                        />
                        {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
                    </div>
                </div>
            </div>

            {/* Localisation */}
            <div className="rounded-2xl p-5 bg-linear-to-br from-emerald-50/60 to-white ring-1 ring-emerald-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                        <MapPinned className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('parametres.schools.section_location')}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="region" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                            <MapPin className="w-4 h-4 text-emerald-600" />
                            {t('parametres.schools.region_label')}
                        </label>
                        <Input id="region" value={data.region} onChange={e => setData('region', e.target.value)} disabled={processing} className={errors.region ? 'border-red-500 bg-red-50/40' : ''} />
                        {errors.region && <p className="text-sm text-red-600 mt-1">{errors.region}</p>}
                    </div>

                    <div>
                        <label htmlFor="city" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                            <MapPin className="w-4 h-4 text-emerald-600" />
                            {t('parametres.schools.city_label')}
                        </label>
                        <Input id="city" value={data.city} onChange={e => setData('city', e.target.value)} disabled={processing} className={errors.city ? 'border-red-500 bg-red-50/40' : ''} />
                        {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city}</p>}
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="po_box" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                            <WalletCards className="w-4 h-4 text-emerald-600" />
                            {t('parametres.schools.po_box_label')}
                        </label>
                        <Input id="po_box" value={data.po_box} onChange={e => setData('po_box', e.target.value)} disabled={processing} className={errors.po_box ? 'border-red-500 bg-red-50/40' : ''} placeholder={t('parametres.schools.po_box_ph')} />
                        {errors.po_box && <p className="text-sm text-red-600 mt-1">{errors.po_box}</p>}
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="address" className="block text-sm font-medium text-gray-900 mb-2">{t('parametres.schools.address_label')}</label>
                        <Textarea id="address" rows={3} value={data.address} onChange={e => setData('address', e.target.value)} disabled={processing} className={errors.address ? 'border-red-500 bg-red-50/40' : ''} />
                        {errors.address && <p className="text-sm text-red-600 mt-1">{errors.address}</p>}
                    </div>
                </div>
            </div>

            {/* Types de classe proposés */}
            <div className="rounded-2xl p-5 bg-linear-to-br from-indigo-50/60 to-white ring-1 ring-indigo-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('parametres.schools.section_class_types')}</h3>
                </div>
                {classroomTypes.length === 0 ? (
                    <p className="text-sm text-gray-400">{t('parametres.schools.no_class_types')}</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {classroomTypes.map(ct => {
                            const checked = (data.class_type_ids ?? []).includes(ct.id);
                            return (
                                <label key={ct.id} className={`flex items-center gap-3 rounded-xl ring-1 px-3 py-2.5 cursor-pointer transition ${checked ? 'ring-indigo-300 bg-indigo-50/60' : 'ring-gray-200 bg-white hover:ring-gray-300'}`}>
                                    <Checkbox checked={checked} onCheckedChange={() => toggleClassType(ct.id)} disabled={processing} />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{ct.name}</p>
                                        <p className="text-xs text-gray-400">{ct.period_system === 'semestre' ? t('parametres.schools.semester') : t('parametres.schools.trimester')}</p>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Statut */}
            <div className="rounded-2xl p-5 bg-linear-to-br from-amber-50/60 to-white ring-1 ring-amber-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 ring-1 ring-amber-100">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('parametres.schools.section_status')}</h3>
                </div>
                <div className="flex items-center gap-3">
                    <Checkbox id="active" checked={data.active} onCheckedChange={checked => setData('active', checked === true)} />
                    <label htmlFor="active" className="text-sm font-medium text-gray-700">{t('parametres.schools.active_label')}</label>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-white/70 px-3 py-3 ring-1 ring-amber-100">
                    <Checkbox id="portal_enabled" checked={data.portal_enabled} onCheckedChange={checked => setData('portal_enabled', checked === true)} className="mt-0.5" />
                    <label htmlFor="portal_enabled" className="cursor-pointer">
                        <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Smartphone className="w-4 h-4 text-amber-600" />
                            {t('parametres.schools.portal_label')}
                        </span>
                        <span className="mt-0.5 block text-xs text-gray-400">
                            {t('parametres.schools.portal_hint')}
                        </span>
                    </label>
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onCancel} disabled={processing} className="flex-1">{t('parametres.common.cancel')}</Button>
                <Button type="submit" disabled={processing} className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm">
                    <Save className="w-4 h-4" />
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
