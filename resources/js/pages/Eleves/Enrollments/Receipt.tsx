import { Head } from '@inertiajs/react';
import { OfficialHeader } from '@/components/documents/official-header';

interface School { name: string; code: string; }
interface Student { firstname: string; lastname: string; matricule?: string | null; }
interface Classroom { name: string; code: string; }
interface AcademicYear { year: string; }
interface User { firstname?: string | null; lastname?: string | null; email?: string | null; }

interface Enrollment {
    id: string;
    enrollment_code: string;
    enrollment_date: string;
    status: 'PENDING' | 'ACTIVE' | 'CANCELLED';
    created_at: string;
    school?: School | null;
    student?: Student | null;
    classroom?: Classroom | null;
    academic_year?: AcademicYear | null;
    enrolled_by?: User | null;
}

interface ReceiptProps {
    enrollment: Enrollment;
    header?: string | null;
    headerCss?: string | null;
}

const statusLabel: Record<Enrollment['status'], string> = {
    PENDING:   'En attente',
    ACTIVE:    'Active',
    CANCELLED: 'Annulée',
};

const statusClass: Record<Enrollment['status'], string> = {
    PENDING:   'bg-yellow-100 text-yellow-700',
    ACTIVE:    'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
};

export default function Receipt({ enrollment, header, headerCss }: Readonly<ReceiptProps>) {
    const enrolledByName = [enrollment.enrolled_by?.firstname, enrollment.enrolled_by?.lastname].filter(Boolean).join(' ');
    const studentName = enrollment.student ? `${enrollment.student.lastname} ${enrollment.student.firstname}` : '—';
    const enrollmentDate = new Date(enrollment.enrollment_date).toLocaleDateString('fr-FR');
    const issuedAt = new Date(enrollment.created_at).toLocaleString('fr-FR');

    const field = (label: string, value: string) => (
        <div>
            <p className="text-gray-400 text-[10px] uppercase tracking-wide">{label}</p>
            <p className="font-semibold text-gray-900">{value}</p>
        </div>
    );

    return (
        <>
            <Head title={`Confirmation - ${enrollment.enrollment_code}`} />

            <div className="confirmation-page min-h-screen bg-gray-100 print:bg-white p-6 print:p-0">
                <div className="mx-auto max-w-2xl">
                    <div className="print-toolbar flex justify-end mb-4 print:hidden">
                        <button
                            onClick={() => window.print()}
                            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                            Imprimer
                        </button>
                    </div>

                    <div className="bg-white text-gray-900 border border-gray-300 rounded-lg p-10 print:border-0 print:rounded-none print:p-0">
                        {/* En-tête officielle unifiée */}
                        <OfficialHeader header={header} headerCss={headerCss} />

                        {/* Titre + n° */}
                        <div className="flex items-start justify-between border-b-2 border-gray-900 pb-3 mb-6">
                            <h1 className="text-xl font-bold uppercase tracking-wide">Confirmation d'inscription</h1>
                            <div className="text-right text-sm">
                                <p><span className="text-gray-500">N° </span><span className="font-bold">{enrollment.enrollment_code}</span></p>
                                <p className="text-gray-500">Le {enrollmentDate}</p>
                            </div>
                        </div>

                        {/* Détails */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm mb-6">
                            {field('Élève', studentName)}
                            {field('Matricule', enrollment.student?.matricule ?? '—')}
                            {field('Classe', enrollment.classroom ? `${enrollment.classroom.name} (${enrollment.classroom.code})` : '—')}
                            {field('Année académique', enrollment.academic_year?.year ?? '—')}
                            <div>
                                <p className="text-gray-400 text-[10px] uppercase tracking-wide">Statut</p>
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClass[enrollment.status]}`}>
                                    {statusLabel[enrollment.status]}
                                </span>
                            </div>
                            {field('Enregistrée par', enrolledByName || enrollment.enrolled_by?.email || '—')}
                        </div>

                        {/* Mention */}
                        <p className="text-sm text-gray-700 leading-relaxed border-l-4 border-blue-600 pl-4 py-1 mb-10">
                            La direction confirme l'inscription de l'élève <span className="font-semibold">{studentName}</span> en
                            classe de <span className="font-semibold">{enrollment.classroom?.name ?? '—'}</span> pour l'année
                            académique <span className="font-semibold">{enrollment.academic_year?.year ?? '—'}</span>.
                        </p>

                        {/* Signature & cachet */}
                        <div className="grid grid-cols-2 gap-8 text-xs">
                            <div>
                                <p className="text-gray-500 mb-1">Cachet de l'établissement</p>
                                <div className="h-20 border border-dashed border-gray-300 rounded" />
                            </div>
                            <div className="text-center">
                                <p className="text-gray-500 mb-1">La Direction</p>
                                <div className="h-20 border-b border-gray-300" />
                            </div>
                        </div>

                        <p className="text-[10px] text-gray-400 mt-6">Document établi le {issuedAt}. À conserver.</p>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 14mm; }
                    html, body { background: #fff !important; }
                    .print-toolbar { display: none !important; }
                    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </>
    );
}
