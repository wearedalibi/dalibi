import { BookOpen, Calendar, Clock, ClipboardList, GraduationCap, LayoutGrid, Layers, Settings, Tag, Users, Shield, Lock, Wallet, Percent, DollarSign, UserCircle, TrendingUp, ArrowLeftRight, PieChart, FileText, ListChecks, NotebookPen, SlidersHorizontal, AlertCircle, CalendarRange, UserCheck, BarChart3, ShieldCheck, HardDrive, FileBadge, ScanLine, DatabaseBackup, Archive, Globe, TrendingDown, Briefcase, Receipt, Coins, Info } from 'lucide-react';
import { route } from '@/helpers/route';
import type { NavItem } from '@/types';

export const mainNavItems: NavItem[] = [
    {
        title: 'Tableau de bord',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Calendrier',
        href: route('calendar.index'),
        icon: Calendar,
        permission: 'view_calendar',
    },
    {
        title: 'Élèves',
        href: '#',
        icon: Users,
        items: [
            { title: 'Élèves', href: route('students.index'), icon: Users, permission: 'view_students' },
            { title: 'Inscriptions & Paiements', href: route('enrollments.index'), icon: ClipboardList, permission: 'view_enrollments' },
            { title: 'Effectifs / Listes', href: route('roster.index'), icon: ListChecks, permission: 'view_roster' },
            { title: 'Passage de classe', href: route('promotion.index'), icon: ArrowLeftRight, permission: 'execute_promotion' },
            { title: 'Statistiques élèves', href: route('students.stats'), icon: BarChart3, permission: 'view_students' },
            { title: 'Bourses d\'étudiants', href: route('student-scholarships.index'), icon: Percent, permission: 'view_student_scholarships' },
            { title: 'Emploi du temps', href: route('timetable.index'), icon: CalendarRange, permission: 'view_timetable' },
        ],
    },
    {
        title: 'Présences',
        href: '#',
        icon: UserCheck,
        items: [
            { title: 'Saisie de l\'appel', href: route('attendances.index'), icon: ClipboardList, permission: 'view_attendances' },
            { title: 'Statistiques', href: route('attendances.stats'), icon: BarChart3, permission: 'view_attendances' },
            { title: 'Demandes de permission', href: route('absence-permissions.index'), icon: ShieldCheck, permission: 'view_absence_permissions' },
        ],
    },
    {
        title: 'Examens',
        href: '#',
        icon: FileText,
        items: [
            { title: 'Modèles d\'évaluation', href: route('evaluation-templates.index'), icon: ListChecks, permission: 'view_evaluation_templates' },
            { title: 'Évaluations par classe', href: route('evaluations.index'), icon: ClipboardList, permission: 'view_evaluations' },
            { title: 'Planning des examens', href: route('evaluations.planning'), icon: CalendarRange, permission: 'view_evaluations' },
            { title: 'Examens officiels', href: route('official-exams.index'), icon: GraduationCap, permission: 'view_official_exams' },
        ],
    },
    {
        title: 'Notes',
        href: '#',
        icon: NotebookPen,
        items: [
            { title: 'Saisie de notes', href: route('grades.index'), icon: ClipboardList, permission: 'view_grades' },
            { title: 'Bulletins', href: route('bulletins.index'), icon: FileBadge, permission: 'view_bulletins' },
            { title: 'Modèle de bulletin', href: route('bulletin-templates.edit'), icon: SlidersHorizontal, permission: 'view_bulletin_templates' },
            { title: 'Réclamations', href: route('note-reclamations.index'), icon: AlertCircle, permission: 'view_note_reclamations' },
        ],
    },
    {
        title: 'Comptabilité',
        href: '#',
        icon: TrendingUp,
        items: [
            { title: 'Vue d\'ensemble', href: route('accounting.index'), icon: TrendingUp, permission: 'view_finances' },
            { title: 'Journal des transactions', href: route('accounting.transactions'), icon: ArrowLeftRight, permission: 'view_transactions' },
            { title: 'Nouvelle dépense', href: route('expenses.create'), icon: TrendingDown, permission: 'create_expenses' },
            { title: 'Situation par classe', href: route('accounting.situation'), icon: PieChart, permission: 'view_finances' },
            { title: 'Caisses', href: route('cash-accounts.index'), icon: Wallet, permission: 'view_cash_accounts' },
            { title: 'Vérifier un reçu', href: route('receipts.verify'), icon: ScanLine, permission: 'view_invoices' },
        ],
    },
    {
        title: 'Personnel & Paie',
        href: '#',
        icon: Briefcase,
        items: [
            { title: 'Vue d\'ensemble', href: route('payroll.overview'), icon: LayoutGrid, permission: 'view_payroll' },
            { title: 'Personnel', href: route('personnel.index'), icon: Users, permission: 'view_employees' },
            { title: 'Cycles de paie', href: route('pay-runs.index'), icon: Receipt, permission: 'view_payroll' },
            { title: 'Grilles salariales', href: route('salary-grades.index'), icon: Layers, permission: 'view_salary_grades' },
            { title: 'Rubriques de paie', href: route('salary-components.index'), icon: Coins, permission: 'view_salary_components' },
            { title: 'Réglages (CNSS, ITS)', href: route('payroll-settings.edit'), icon: SlidersHorizontal, permission: 'edit_salary_grades' },
        ],
    },
    {
        title: 'Archives',
        href: '#',
        icon: Archive,
        items: [
            { title: 'Documents archivés', href: route('archives.index'), icon: FileText, permission: 'view_archives' },
            { title: 'Tags', href: route('archives.tags.index'), icon: Tag, permission: 'view_archives' },
        ],
    },
    {
        title: 'Administration',
        href: '#',
        icon: Shield,
        items: [
            { title: 'Utilisateurs', href: route('users.index'), icon: Users, permission: 'view_users' },
            { title: 'Rôles', href: route('roles.index'), icon: Shield, permission: 'manage_roles_permissions' },
            { title: 'Permissions', href: route('permissions.index'), icon: Lock, permission: 'manage_roles_permissions' },
            { title: 'Affectations', href: route('subject-assignments.index'), icon: ClipboardList, permission: 'view_subject_assignments' },
            { title: "Journal d'audit", href: route('audit-logs.index'), icon: ScanLine, permission: 'view_audit_logs' },
            { title: 'Accès portail', href: route('guardians.index'), icon: UserCheck, permission: 'view_portal_accounts' },
        ],
    },
    {
        title: 'Statistiques',
        href: route('statistics.index'),
        icon: PieChart,
        permission: 'view_statistics',
    },
    {
        title: 'Paramètres',
        href: '#',
        icon: Settings,
        items: [
            { title: 'École', href: route('schools.index'), icon: BookOpen, permission: 'view_schools' },
            { title: 'Classes', href: route('classrooms.index'), icon: Layers, permission: 'view_classes' },
            { title: 'Types de classes', href: route('classroom-types.index'), icon: Tag, permission: 'view_classroom_types' },
            { title: 'Matières', href: route('subjects.index'), icon: BookOpen, permission: 'view_subjects' },
            { title: 'Pays', href: route('countries.index'), icon: Globe, permission: 'view_countries' },
            { title: 'Types d\'évaluation', href: route('evaluation-types.index'), icon: Tag, permission: 'view_evaluation_types' },
            { title: 'Années académiques', href: route('academic-years.index'), icon: Calendar, permission: 'view_academic_years' },
            { title: 'Périodes académiques', href: route('academic-periods.index'), icon: Clock, permission: 'view_academic_periods' },
            { title: 'Catégories de frais', href: route('fee-categories.index'), icon: Percent, permission: 'view_fee_categories' },
            { title: 'Structures de frais', href: route('fee-structures.index'), icon: DollarSign, permission: 'view_fee_structures' },
            { title: 'Bourses', href: route('scholarships.index'), icon: Percent, permission: 'view_scholarships' },
            { title: 'Calcul des moyennes', href: route('grading-configs.index'), icon: SlidersHorizontal, permission: 'view_grading_configs' },
            { title: 'Fichiers & Stockage', href: route('file-storage.index'), icon: HardDrive, permission: 'manage_file_storage' },
            { title: 'Modèles de documents', href: route('document-templates.index'), icon: FileBadge, permission: 'view_documents' },
            { title: 'Sauvegardes', href: route('backups.index'), icon: DatabaseBackup, permission: 'view_backups' },
            { title: 'À propos', href: route('about.index'), icon: Info },
        ],
    },
    {
        title: 'Mon compte',
        href: '/settings/profile',
        icon: UserCircle,
        // Les réglages du compte n'ont pas de préfixe commun exclusif : sans ces
        // chemins, l'entrée s'éteindrait sur Mot de passe, 2FA ou Apparence.
        match: ['/settings/password', '/settings/two-factor', '/settings/appearance'],
    },
];
