import {
    User,
    Globe,
    Phone,
    MapPin,
    Camera,
    FileText,
    Calendar,
    UserSquare,
    Mail,
    Heart,
    AlertCircle,
    Droplet,
    Shield,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { TOGO_REGIONS, prefecturesOf } from '@/data/togo';
import { useTranslation } from '@/helpers/i18n';

const selectCls = 'flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400';

export interface StudentFormPayload {
    matricule: string;
    firstname: string;
    lastname: string;
    gender: 'male' | 'female' | '';
    birth_date: string;
    place_of_birth: string;
    region: string;
    prefecture: string;
    nationality: string;
    address: string;
    city: string;
    phone: string;
    email: string;
    profile_photo: File | string;
    active: boolean;
    information: {
        birth_certificate_number: string;
        birth_certificate_issue_date: string;
        birth_certificate_issue_place: string;
        admission_type: 'new' | 'transfer' | 're_admission';
    };
    parent: {
        father_firstname: string;
        father_lastname: string;
        father_profession: string;
        father_phone: string;
        mother_firstname: string;
        mother_lastname: string;
        mother_profession: string;
        mother_phone: string;
        email: string;
    };
    medical: {
        blood_group: string;
        allergies: string;
        vaccinations: string;
        emergency_contact_name: string;
        emergency_contact_phone: string;
    };
}

interface StudentFormStepsProps {
    mode: 'create' | 'edit';
    initialValues: StudentFormPayload;
    errors: Record<string, string>;
    isSubmitting: boolean;
    onCancel: () => void;
    onSubmit: (data: StudentFormPayload) => void;
}

export function StudentFormSteps({
    mode,
    initialValues,
    errors,
    isSubmitting,
    onCancel,
    onSubmit,
}: Readonly<StudentFormStepsProps>) {
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<StudentFormPayload>(initialValues);

    const stepLabels = [
        t('students.form.steps.student'),
        t('students.form.steps.admin'),
        t('students.form.steps.parents'),
        t('students.form.steps.health'),
        t('students.form.steps.summary'),
    ];

    const buttonLabel = useMemo(() => {
        if (mode === 'create') {
            return isSubmitting ? t('students.form.adding') : t('common.actions.add');
        }

        return isSubmitting ? t('students.form.saving') : t('common.actions.save');
    }, [mode, isSubmitting, t]);

    const setField = <K extends keyof StudentFormPayload>(field: K, value: StudentFormPayload[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const setSectionField = <K extends keyof StudentFormPayload, S extends keyof StudentFormPayload[K] & string>(
        section: K,
        field: S,
        value: StudentFormPayload[K][S],
    ) => {
        setFormData((prev) => ({
            ...prev,
            [section]: {
                ...(prev[section] as object),
                [field]: value,
            },
        }));
    };

    const getError = (path: string) => errors[path];

    const canGoNext = () => {
        if (currentStep === 0) {
            return Boolean(formData.firstname && formData.lastname && formData.gender && formData.birth_date);
        }

        if (currentStep === 1) {
            return Boolean(formData.information.admission_type);
        }

        if (currentStep === 2) {
            return Boolean(
                formData.parent.father_firstname &&
                formData.parent.father_lastname &&
                formData.parent.mother_firstname &&
                formData.parent.mother_lastname
            );
        }

        return true;
    };

    const handleSubmit = (event: { preventDefault: () => void }) => {
        event.preventDefault();

        if (currentStep < stepLabels.length - 1) {
            if (canGoNext()) {
                setCurrentStep((prev) => prev + 1);
            }
            return;
        }

        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {stepLabels.map((label, index) => {
                        const isActive = currentStep === index;
                        const isCompleted = currentStep > index;
                        let buttonClasses = 'bg-gray-50 text-gray-600 hover:bg-gray-100';

                        if (isActive) {
                            buttonClasses = 'bg-blue-600 text-white';
                        } else if (isCompleted) {
                            buttonClasses = 'bg-blue-50 text-blue-700';
                        }

                        return (
                            <button
                                key={label}
                                type="button"
                                onClick={() => setCurrentStep(index)}
                                className={`rounded-lg px-4 py-3 text-left transition-colors ${buttonClasses}`}
                            >
                                <p className="text-xs font-semibold uppercase tracking-wide">{t('students.form.step', { n: index + 1 })}</p>
                                <p className="text-sm font-medium mt-1">{label}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm space-y-5">
                {currentStep === 0 && (
                    <div className="space-y-6">
                        {/* Section Identité */}
                        <div className="border border-blue-100 rounded-xl p-5 bg-linear-to-br from-blue-50/50 to-transparent">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                                    <User className="w-5 h-5 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">{t('students.form.sec.identity')}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="matricule" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.matricule')}</label>
                                    <Input
                                        id="matricule"
                                        value={formData.matricule}
                                        onChange={(event) => setField('matricule', event.target.value)}
                                        className={getError('matricule') ? 'border-red-500' : ''}
                                    />
                                    {getError('matricule') && <p className="text-sm text-red-600 mt-1">{getError('matricule')}</p>}
                                </div>

                                <div>
                                    <label htmlFor="gender" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.gender')}</label>
                                    <select
                                        id="gender"
                                        value={formData.gender}
                                        onChange={(event) => setField('gender', event.target.value as 'male' | 'female' | '')}
                                        className={`w-full px-3 py-2 rounded-lg border bg-white ${getError('gender') ? 'border-red-500' : 'border-gray-300'}`}
                                    >
                                        <option value="">{t('students.form.select')}</option>
                                        <option value="male">{t('students.gender.male')}</option>
                                        <option value="female">{t('students.gender.female')}</option>
                                    </select>
                                    {getError('gender') && <p className="text-sm text-red-600 mt-1">{getError('gender')}</p>}
                                </div>

                                <div>
                                    <label htmlFor="firstname" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.firstname')}</label>
                                    <Input
                                        id="firstname"
                                        value={formData.firstname}
                                        onChange={(event) => setField('firstname', event.target.value)}
                                        className={getError('firstname') ? 'border-red-500' : ''}
                                    />
                                    {getError('firstname') && <p className="text-sm text-red-600 mt-1">{getError('firstname')}</p>}
                                </div>

                                <div>
                                    <label htmlFor="lastname" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.lastname')}</label>
                                    <Input
                                        id="lastname"
                                        value={formData.lastname}
                                        onChange={(event) => setField('lastname', event.target.value)}
                                        className={getError('lastname') ? 'border-red-500' : ''}
                                    />
                                    {getError('lastname') && <p className="text-sm text-red-600 mt-1">{getError('lastname')}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Section Naissance */}
                        <div className="border border-emerald-100 rounded-xl p-5 bg-linear-to-br from-emerald-50/50 to-transparent">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-emerald-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">{t('students.form.sec.birth')}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="birth_date" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.birth_date')}</label>
                                    <Input
                                        id="birth_date"
                                        type="date"
                                        value={formData.birth_date}
                                        onChange={(event) => setField('birth_date', event.target.value)}
                                        className={getError('birth_date') ? 'border-red-500' : ''}
                                    />
                                    {getError('birth_date') && <p className="text-sm text-red-600 mt-1">{getError('birth_date')}</p>}
                                </div>

                                <div>
                                    <label htmlFor="place_of_birth" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.place_of_birth')}</label>
                                    <Input
                                        id="place_of_birth"
                                        value={formData.place_of_birth}
                                        onChange={(event) => setField('place_of_birth', event.target.value)}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="nationality" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                                        <Globe className="w-4 h-4 text-emerald-600" />
                                        {t('students.form.lbl.nationality')}
                                    </label>
                                    <Input
                                        id="nationality"
                                        value={formData.nationality}
                                        onChange={(event) => setField('nationality', event.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section Contact */}
                        <div className="border border-violet-100 rounded-xl p-5 bg-linear-to-br from-violet-50/50 to-transparent">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center">
                                    <Phone className="w-5 h-5 text-violet-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">{t('students.form.sec.contact')}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                                        <Phone className="w-4 h-4 text-violet-600" />
                                        {t('students.form.lbl.phone')}
                                    </label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(event) => setField('phone', event.target.value)}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                                        <Mail className="w-4 h-4 text-violet-600" />
                                        {t('students.form.lbl.email')}
                                    </label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(event) => setField('email', event.target.value)}
                                        className={getError('email') ? 'border-red-500' : ''}
                                    />
                                    {getError('email') && <p className="text-sm text-red-600 mt-1">{getError('email')}</p>}
                                </div>

                                <div>
                                    <label htmlFor="city" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                                        <MapPin className="w-4 h-4 text-violet-600" />
                                        {t('students.form.lbl.city')}
                                    </label>
                                    <Input
                                        id="city"
                                        value={formData.city}
                                        onChange={(event) => setField('city', event.target.value)}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="region" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                                        <MapPin className="w-4 h-4 text-violet-600" />
                                        {t('students.form.lbl.region')}
                                    </label>
                                    <select
                                        id="region"
                                        className={selectCls}
                                        value={formData.region}
                                        onChange={(event) => {
                                            setField('region', event.target.value);
                                            setField('prefecture', '');
                                        }}
                                    >
                                        <option value="">—</option>
                                        {TOGO_REGIONS.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="prefecture" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                                        <MapPin className="w-4 h-4 text-violet-600" />
                                        {t('students.form.lbl.prefecture')}
                                    </label>
                                    <select
                                        id="prefecture"
                                        className={selectCls}
                                        value={formData.prefecture}
                                        disabled={!formData.region}
                                        onChange={(event) => setField('prefecture', event.target.value)}
                                    >
                                        <option value="">—</option>
                                        {prefecturesOf(formData.region).map((p) => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="address" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                                        <MapPin className="w-4 h-4 text-violet-600" />
                                        {t('students.form.lbl.address')}
                                    </label>
                                    <Input
                                        id="address"
                                        value={formData.address}
                                        onChange={(event) => setField('address', event.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section Photo et Statut */}
                        <div className="border border-amber-100 rounded-xl p-5 bg-linear-to-br from-amber-50/50 to-transparent">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                                    <Camera className="w-5 h-5 text-amber-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">{t('students.form.sec.photo_status')}</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="profile_photo" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.profile_photo')}</label>
                                    <input
                                        id="profile_photo"
                                        type="file"
                                        accept="image/*"
                                        onChange={(event) => setField('profile_photo', event.target.files?.[0] ?? '')}
                                        className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    {formData.profile_photo instanceof File ? (
                                        <p className="text-xs text-emerald-600 mt-1">{t('students.form.photo_selected', { name: formData.profile_photo.name })}</p>
                                    ) : (
                                        <p className="text-xs text-gray-400 mt-1">
                                            {t('students.form.photo_hint')}{mode === 'edit' ? t('students.form.photo_hint_keep') : ''}
                                        </p>
                                    )}
                                    {getError('profile_photo') && <p className="text-sm text-red-600 mt-1">{getError('profile_photo')}</p>}
                                </div>

                                <div className="flex items-center space-x-3 pt-2">
                                    <Checkbox
                                        id="active"
                                        checked={formData.active}
                                        onCheckedChange={(checked) => setField('active', checked === true)}
                                    />
                                    <label htmlFor="active" className="text-sm font-medium text-gray-700">{t('students.form.lbl.active')}</label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 1 && (
                    <div className="space-y-6">
                        {/* Section Documents administratifs */}
                        <div className="border border-indigo-100 rounded-xl p-5 bg-linear-to-br from-indigo-50/50 to-transparent">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-indigo-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">{t('students.form.sec.admission')}</h3>
                            </div>
                            <div>
                                <label htmlFor="admission_type" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.admission_type')}</label>
                                <select
                                    id="admission_type"
                                    value={formData.information.admission_type}
                                    onChange={(event) => setSectionField('information', 'admission_type', event.target.value as 'new' | 'transfer' | 're_admission')}
                                    className={`w-full px-3 py-2 rounded-lg border bg-white ${getError('information.admission_type') ? 'border-red-500' : 'border-gray-300'}`}
                                >
                                    <option value="new">{t('students.admission.new')}</option>
                                    <option value="transfer">{t('students.admission.transfer')}</option>
                                    <option value="re_admission">{t('students.admission.re_admission')}</option>
                                </select>
                                {getError('information.admission_type') && <p className="text-sm text-red-600 mt-1">{getError('information.admission_type')}</p>}
                            </div>
                        </div>

                        {/* Section Acte de naissance */}
                        <div className="border border-teal-100 rounded-xl p-5 bg-linear-to-br from-teal-50/50 to-transparent">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-teal-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">{t('students.form.sec.birth_cert')}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="birth_certificate_number" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.birth_cert_number')}</label>
                                    <Input
                                        id="birth_certificate_number"
                                        value={formData.information.birth_certificate_number}
                                        onChange={(event) => setSectionField('information', 'birth_certificate_number', event.target.value)}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="birth_certificate_issue_date" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.issue_date')}</label>
                                    <Input
                                        id="birth_certificate_issue_date"
                                        type="date"
                                        value={formData.information.birth_certificate_issue_date}
                                        onChange={(event) => setSectionField('information', 'birth_certificate_issue_date', event.target.value)}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="birth_certificate_issue_place" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.issue_place')}</label>
                                    <Input
                                        id="birth_certificate_issue_place"
                                        value={formData.information.birth_certificate_issue_place}
                                        onChange={(event) => setSectionField('information', 'birth_certificate_issue_place', event.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="space-y-6">
                        {/* Informations du père */}
                        <div className="border border-blue-100 rounded-xl p-5 bg-linear-to-br from-blue-50/50 to-transparent">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                                    <UserSquare className="w-5 h-5 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">{t('students.form.sec.father')}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="father_firstname" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.father_firstname')}</label>
                                    <Input
                                        id="father_firstname"
                                        value={formData.parent.father_firstname}
                                        onChange={(event) => setSectionField('parent', 'father_firstname', event.target.value)}
                                        className={getError('parent.father_firstname') ? 'border-red-500' : ''}
                                    />
                                    {getError('parent.father_firstname') && <p className="text-sm text-red-600 mt-1">{getError('parent.father_firstname')}</p>}
                                </div>
                                <div>
                                    <label htmlFor="father_lastname" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.father_lastname')}</label>
                                    <Input
                                        id="father_lastname"
                                        value={formData.parent.father_lastname}
                                        onChange={(event) => setSectionField('parent', 'father_lastname', event.target.value)}
                                        className={getError('parent.father_lastname') ? 'border-red-500' : ''}
                                    />
                                    {getError('parent.father_lastname') && <p className="text-sm text-red-600 mt-1">{getError('parent.father_lastname')}</p>}
                                </div>
                                <div>
                                    <label htmlFor="father_profession" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.father_profession')}</label>
                                    <Input
                                        id="father_profession"
                                        value={formData.parent.father_profession}
                                        onChange={(event) => setSectionField('parent', 'father_profession', event.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="father_phone" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                                        <Phone className="w-4 h-4 text-blue-600" />
                                        {t('students.form.lbl.father_phone')}
                                    </label>
                                    <Input
                                        id="father_phone"
                                        value={formData.parent.father_phone}
                                        onChange={(event) => setSectionField('parent', 'father_phone', event.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Informations de la mère */}
                        <div className="border border-pink-100 rounded-xl p-5 bg-linear-to-br from-pink-50/50 to-transparent">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center">
                                    <UserSquare className="w-5 h-5 text-pink-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">{t('students.form.sec.mother')}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="mother_firstname" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.mother_firstname')}</label>
                                    <Input
                                        id="mother_firstname"
                                        value={formData.parent.mother_firstname}
                                        onChange={(event) => setSectionField('parent', 'mother_firstname', event.target.value)}
                                        className={getError('parent.mother_firstname') ? 'border-red-500' : ''}
                                    />
                                    {getError('parent.mother_firstname') && <p className="text-sm text-red-600 mt-1">{getError('parent.mother_firstname')}</p>}
                                </div>
                                <div>
                                    <label htmlFor="mother_lastname" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.mother_lastname')}</label>
                                    <Input
                                        id="mother_lastname"
                                        value={formData.parent.mother_lastname}
                                        onChange={(event) => setSectionField('parent', 'mother_lastname', event.target.value)}
                                        className={getError('parent.mother_lastname') ? 'border-red-500' : ''}
                                    />
                                    {getError('parent.mother_lastname') && <p className="text-sm text-red-600 mt-1">{getError('parent.mother_lastname')}</p>}
                                </div>
                                <div>
                                    <label htmlFor="mother_profession" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.mother_profession')}</label>
                                    <Input
                                        id="mother_profession"
                                        value={formData.parent.mother_profession}
                                        onChange={(event) => setSectionField('parent', 'mother_profession', event.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="mother_phone" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                                        <Phone className="w-4 h-4 text-pink-600" />
                                        {t('students.form.lbl.mother_phone')}
                                    </label>
                                    <Input
                                        id="mother_phone"
                                        value={formData.parent.mother_phone}
                                        onChange={(event) => setSectionField('parent', 'mother_phone', event.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Email parent/tuteur */}
                        <div className="border border-purple-100 rounded-xl p-5 bg-linear-to-br from-purple-50/50 to-transparent">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                                    <Mail className="w-5 h-5 text-purple-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">{t('students.form.sec.parents_contact')}</h3>
                            </div>
                            <div>
                                <label htmlFor="parent_email" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                                    <Mail className="w-4 h-4 text-purple-600" />
                                    {t('students.form.lbl.parent_email')}
                                </label>
                                <Input
                                    id="parent_email"
                                    type="email"
                                    value={formData.parent.email}
                                    onChange={(event) => setSectionField('parent', 'email', event.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="space-y-6">
                        {/* Section Groupe sanguin et contact d'urgence */}
                        <div className="border border-red-100 rounded-xl p-5 bg-linear-to-br from-red-50/50 to-transparent">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                                    <Droplet className="w-5 h-5 text-red-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">{t('students.form.sec.medical')}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="blood_group" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                                        <Droplet className="w-4 h-4 text-red-600" />
                                        {t('students.form.lbl.blood_group')}
                                    </label>
                                    <Input
                                        id="blood_group"
                                        value={formData.medical.blood_group}
                                        onChange={(event) => setSectionField('medical', 'blood_group', event.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="vaccinations" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                                        <Shield className="w-4 h-4 text-red-600" />
                                        {t('students.form.lbl.vaccinations')}
                                    </label>
                                    <Input
                                        id="vaccinations"
                                        value={formData.medical.vaccinations}
                                        onChange={(event) => setSectionField('medical', 'vaccinations', event.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section Contact d'urgence */}
                        <div className="border border-orange-100 rounded-xl p-5 bg-linear-to-br from-orange-50/50 to-transparent">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5 text-orange-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">{t('students.form.sec.emergency')}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="emergency_contact_name" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.emergency_contact')}</label>
                                    <Input
                                        id="emergency_contact_name"
                                        value={formData.medical.emergency_contact_name}
                                        onChange={(event) => setSectionField('medical', 'emergency_contact_name', event.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="emergency_contact_phone" className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                                        <Phone className="w-4 h-4 text-orange-600" />
                                        {t('students.form.lbl.emergency_phone')}
                                    </label>
                                    <Input
                                        id="emergency_contact_phone"
                                        value={formData.medical.emergency_contact_phone}
                                        onChange={(event) => setSectionField('medical', 'emergency_contact_phone', event.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section Allergies */}
                        <div className="border border-rose-100 rounded-xl p-5 bg-linear-to-br from-rose-50/50 to-transparent">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center">
                                    <Heart className="w-5 h-5 text-rose-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">{t('students.form.sec.allergies')}</h3>
                            </div>
                            <div>
                                <label htmlFor="allergies" className="block text-sm font-medium text-gray-900 mb-2">{t('students.form.lbl.allergies')}</label>
                                <textarea
                                    id="allergies"
                                    value={formData.medical.allergies}
                                    onChange={(event) => setSectionField('medical', 'allergies', event.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 4 && (() => {
                    const genderLabel = ({ male: t('students.gender.male'), female: t('students.gender.female'), '': '—' } as Record<string, string>)[formData.gender] ?? '—';
                    const admissionLabel = ({ new: t('students.admission.new'), transfer: t('students.admission.transfer'), re_admission: t('students.admission.re_admission') } as Record<string, string>)[formData.information.admission_type] ?? '—';
                    const photoLabel = formData.profile_photo instanceof File
                        ? formData.profile_photo.name
                        : (formData.profile_photo ? t('students.form.photo_kept') : t('students.form.photo_none'));
                    const val = (v: string) => (v && v.trim() !== '' ? v : '—');
                    const full = (last: string, first: string) => val(`${last} ${first}`.trim());
                    const sections: { title: string; rows: [string, string][] }[] = [
                        { title: t('students.form.recap.identity'), rows: [[t('students.form.recap.matricule'), val(formData.matricule)], [t('students.form.recap.lastname'), val(formData.lastname)], [t('students.form.recap.firstname'), val(formData.firstname)], [t('students.form.recap.gender'), genderLabel]] },
                        { title: t('students.form.recap.birth'), rows: [[t('students.form.recap.date'), val(formData.birth_date)], [t('students.form.recap.place'), val(formData.place_of_birth)]] },
                        { title: t('students.form.recap.origin_contact'), rows: [[t('students.form.recap.region'), val(formData.region)], [t('students.form.recap.prefecture'), val(formData.prefecture)], [t('students.form.recap.city'), val(formData.city)], [t('students.form.recap.address'), val(formData.address)], [t('students.form.recap.nationality'), val(formData.nationality)], [t('students.form.recap.phone'), val(formData.phone)], [t('students.form.recap.email'), val(formData.email)]] },
                        { title: t('students.form.recap.admin'), rows: [[t('students.form.recap.admission_type'), admissionLabel], [t('students.form.recap.birth_cert'), val(formData.information.birth_certificate_number)]] },
                        { title: t('students.form.recap.parents'), rows: [[t('students.form.recap.father'), full(formData.parent.father_lastname, formData.parent.father_firstname)], [t('students.form.recap.father_phone'), val(formData.parent.father_phone)], [t('students.form.recap.mother'), full(formData.parent.mother_lastname, formData.parent.mother_firstname)], [t('students.form.recap.mother_phone'), val(formData.parent.mother_phone)]] },
                        { title: t('students.form.recap.health'), rows: [[t('students.form.recap.blood_group'), val(formData.medical.blood_group)], [t('students.form.recap.emergency'), val(formData.medical.emergency_contact_name)], [t('students.form.recap.emergency_phone'), val(formData.medical.emergency_contact_phone)]] },
                        { title: t('students.form.recap.photo_status'), rows: [[t('students.form.recap.photo'), photoLabel], [t('students.form.recap.status'), formData.active ? t('common.status.active') : t('common.status.inactive')]] },
                    ];

                    return (
                        <div className="space-y-5">
                            <div className="border border-blue-100 rounded-xl p-5 bg-linear-to-br from-blue-50/50 to-transparent">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{t('students.form.sec.summary')}</h3>
                                        <p className="text-sm text-gray-500">{t('students.form.summary_hint')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                {sections.map((s) => (
                                    <div key={s.title} className="rounded-xl border border-gray-100 p-4">
                                        <h4 className="font-semibold text-sm text-gray-900 mb-3">{s.title}</h4>
                                        <dl className="space-y-1.5">
                                            {s.rows.map(([label, value]) => (
                                                <div key={label} className="flex justify-between gap-3 text-sm">
                                                    <dt className="text-gray-500 shrink-0">{label}</dt>
                                                    <dd className="text-gray-900 font-medium text-right break-words">{value}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}
            </div>

            <div className="flex items-center justify-between gap-3">
                <div>
                    {currentStep > 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCurrentStep((prev) => prev - 1)}
                            className="border-gray-300 text-gray-700"
                        >
                            {t('common.actions.back')}
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" onClick={onCancel} className="border-gray-300 text-gray-700">
                        {t('common.actions.cancel')}
                    </Button>

                    {currentStep < stepLabels.length - 1 ? (
                        <Button type="submit" disabled={!canGoNext()} className="bg-blue-600 hover:bg-blue-700">
                            {t('common.actions.next')}
                        </Button>
                    ) : (
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                            {buttonLabel}
                        </Button>
                    )}
                </div>
            </div>
        </form>
    );
}
