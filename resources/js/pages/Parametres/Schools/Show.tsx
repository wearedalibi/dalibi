import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Building2, CalendarClock, CheckCircle2, ImageIcon, Mail, MapPin, Pencil, Phone, Quote, XCircle, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface School {
    id: string;
    name: string;
    code: string;
    logo: string | null;
    logo_url: string | null;
    devise: string | null;
    terme: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    region: string | null;
    city: string | null;
    po_box: string | null;
    active: boolean;
    created_at: string;
    updated_at: string;
}

interface ShowProps {
    school: School;
}

export default function Show({ school }: Readonly<ShowProps>) {
    const { t, locale } = useTranslation();
    const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';
    const logoUrl = school.logo_url ?? null;

    return (
        <AppLayout>
            <Head title={school.name} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={route('schools.index')}>
                            <Button variant="ghost" size="sm" className="p-2">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-4">
                            {logoUrl ? (
                                <img src={logoUrl} alt={`Logo ${school.name}`} className="h-14 w-14 object-contain rounded-xl ring-1 ring-gray-200 bg-white p-1" />
                            ) : (
                                <div className="h-14 w-14 rounded-xl ring-1 ring-gray-200 bg-gray-50 flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-gray-300" />
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{school.terme ?? 'République Togolaise'}</p>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3"><School className="h-7 w-7 text-blue-600 shrink-0" />{school.name}</h1>
                                {school.devise && (
                                    <p className="text-sm text-gray-500 italic mt-0.5 flex items-center gap-1">
                                        <Quote className="w-3 h-3" />
                                        {school.devise}
                                    </p>
                                )}
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-xs text-gray-400 font-mono">{school.code}</span>
                                    {school.active ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                                            <CheckCircle2 className="w-3 h-3" /> {t('parametres.schools.active')}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                                            <XCircle className="w-3 h-3" /> {t('parametres.schools.inactive')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <Link href={route('schools.edit', school.id)}>
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm">
                            <Pencil className="w-4 h-4" />
                            {t('parametres.common.edit')}
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Informations générales */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-blue-600" />
                            {t('parametres.schools.section_general')}
                        </h2>

                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">{t('parametres.schools.terme_entity')}</p>
                            <p className="text-sm font-medium text-gray-900 mt-0.5">{school.terme || '-'}</p>
                        </div>

                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                <Quote className="w-3 h-3" /> {t('parametres.schools.devise')}
                            </p>
                            <p className="text-sm font-medium text-gray-900 italic mt-0.5">{school.devise || '-'}</p>
                        </div>

                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {t('parametres.schools.email')}
                            </p>
                            <p className="text-sm font-medium text-gray-900 mt-0.5">{school.email || '-'}</p>
                        </div>

                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {t('parametres.schools.phone')}
                            </p>
                            <p className="text-sm font-medium text-gray-900 mt-0.5">{school.phone || '-'}</p>
                        </div>
                    </div>

                    {/* Localisation + Timeline */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100 space-y-3">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-emerald-600" />
                                {t('parametres.schools.section_location')}
                            </h2>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">{t('parametres.schools.region')}</p>
                                <p className="text-sm font-medium text-gray-900 mt-0.5">{school.region || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">{t('parametres.schools.city')}</p>
                                <p className="text-sm font-medium text-gray-900 mt-0.5">{school.city || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">{t('parametres.schools.po_box')}</p>
                                <p className="text-sm font-medium text-gray-900 mt-0.5">{school.po_box || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">{t('parametres.schools.address')}</p>
                                <p className="text-sm font-medium text-gray-900 mt-0.5 whitespace-pre-wrap">{school.address || '-'}</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100 space-y-3">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <CalendarClock className="w-5 h-5 text-violet-600" />
                                {t('parametres.schools.section_events')}
                            </h2>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">{t('parametres.schools.created_on')}</p>
                                <p className="text-sm font-medium text-gray-900 mt-0.5">
                                    {new Date(school.created_at).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">{t('parametres.schools.updated_on')}</p>
                                <p className="text-sm font-medium text-gray-900 mt-0.5">
                                    {new Date(school.updated_at).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
