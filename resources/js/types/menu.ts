import { BookOpen, Calendar, Clock, ClipboardList, GraduationCap, LayoutGrid, Layers, Settings, Tag, Users, Shield, Lock, Wallet, Percent, DollarSign, UserCircle, TrendingUp, ArrowLeftRight, PieChart, FileText, ListChecks, NotebookPen, SlidersHorizontal, AlertCircle, CalendarRange, UserCheck, BarChart3, ShieldCheck, HardDrive, FileBadge, ScanLine, DatabaseBackup, Archive, Globe, TrendingDown, Briefcase, Receipt, Coins, Info } from 'lucide-react';
import { route } from '@/helpers/route';
import type { NavItem } from '@/types';

// NB : `title` porte une CLÉ de traduction (ex. 'menu.dashboard'), résolue à
// l'affichage via useTranslation() dans nav-main / app-sidebar-header.
export const mainNavItems: NavItem[] = [
    {
        title: 'menu.dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'menu.calendar',
        href: route('calendar.index'),
        icon: Calendar,
        permission: 'view_calendar',
    },
    {
        title: 'menu.students',
        href: '#',
        icon: Users,
        items: [
            { title: 'menu.students_list', href: route('students.index'), icon: Users, permission: 'view_students' },
            { title: 'menu.enrollments', href: route('enrollments.index'), icon: ClipboardList, permission: 'view_enrollments' },
            { title: 'menu.roster', href: route('roster.index'), icon: ListChecks, permission: 'view_roster' },
            { title: 'menu.promotion', href: route('promotion.index'), icon: ArrowLeftRight, permission: 'execute_promotion' },
            { title: 'menu.student_stats', href: route('students.stats'), icon: BarChart3, permission: 'view_students' },
            { title: 'menu.student_scholarships', href: route('student-scholarships.index'), icon: Percent, permission: 'view_student_scholarships' },
            { title: 'menu.timetable', href: route('timetable.index'), icon: CalendarRange, permission: 'view_timetable' },
        ],
    },
    {
        title: 'menu.attendance',
        href: '#',
        icon: UserCheck,
        items: [
            { title: 'menu.attendance_entry', href: route('attendances.index'), icon: ClipboardList, permission: 'view_attendances' },
            { title: 'menu.attendance_stats', href: route('attendances.stats'), icon: BarChart3, permission: 'view_attendances' },
            { title: 'menu.absence_permissions', href: route('absence-permissions.index'), icon: ShieldCheck, permission: 'view_absence_permissions' },
        ],
    },
    {
        title: 'menu.exams',
        href: '#',
        icon: FileText,
        items: [
            { title: 'menu.evaluation_templates', href: route('evaluation-templates.index'), icon: ListChecks, permission: 'view_evaluation_templates' },
            { title: 'menu.evaluations', href: route('evaluations.index'), icon: ClipboardList, permission: 'view_evaluations' },
            { title: 'menu.exam_planning', href: route('evaluations.planning'), icon: CalendarRange, permission: 'view_evaluations' },
            { title: 'menu.official_exams', href: route('official-exams.index'), icon: GraduationCap, permission: 'view_official_exams' },
        ],
    },
    {
        title: 'menu.grades',
        href: '#',
        icon: NotebookPen,
        items: [
            { title: 'menu.grades_entry', href: route('grades.index'), icon: ClipboardList, permission: 'view_grades' },
            { title: 'menu.bulletins', href: route('bulletins.index'), icon: FileBadge, permission: 'view_bulletins' },
            { title: 'menu.bulletin_template', href: route('bulletin-templates.edit'), icon: SlidersHorizontal, permission: 'view_bulletin_templates' },
            { title: 'menu.note_reclamations', href: route('note-reclamations.index'), icon: AlertCircle, permission: 'view_note_reclamations' },
        ],
    },
    {
        title: 'menu.accounting',
        href: '#',
        icon: TrendingUp,
        items: [
            { title: 'menu.accounting_overview', href: route('accounting.index'), icon: TrendingUp, permission: 'view_finances' },
            { title: 'menu.transactions', href: route('accounting.transactions'), icon: ArrowLeftRight, permission: 'view_transactions' },
            { title: 'menu.new_expense', href: route('expenses.create'), icon: TrendingDown, permission: 'create_expenses' },
            { title: 'menu.situation', href: route('accounting.situation'), icon: PieChart, permission: 'view_finances' },
            { title: 'menu.cash_accounts', href: route('cash-accounts.index'), icon: Wallet, permission: 'view_cash_accounts' },
            { title: 'menu.verify_receipt', href: route('receipts.verify'), icon: ScanLine, permission: 'view_invoices' },
        ],
    },
    {
        title: 'menu.payroll',
        href: '#',
        icon: Briefcase,
        items: [
            { title: 'menu.payroll_overview', href: route('payroll.overview'), icon: LayoutGrid, permission: 'view_payroll' },
            { title: 'menu.personnel', href: route('personnel.index'), icon: Users, permission: 'view_employees' },
            { title: 'menu.pay_runs', href: route('pay-runs.index'), icon: Receipt, permission: 'view_payroll' },
            { title: 'menu.salary_grades', href: route('salary-grades.index'), icon: Layers, permission: 'view_salary_grades' },
            { title: 'menu.salary_components', href: route('salary-components.index'), icon: Coins, permission: 'view_salary_components' },
            { title: 'menu.payroll_settings', href: route('payroll-settings.edit'), icon: SlidersHorizontal, permission: 'edit_salary_grades' },
        ],
    },
    {
        title: 'menu.archives',
        href: '#',
        icon: Archive,
        items: [
            { title: 'menu.archived_documents', href: route('archives.index'), icon: FileText, permission: 'view_archives' },
            { title: 'menu.tags', href: route('archives.tags.index'), icon: Tag, permission: 'view_archives' },
        ],
    },
    {
        title: 'menu.administration',
        href: '#',
        icon: Shield,
        items: [
            { title: 'menu.users', href: route('users.index'), icon: Users, permission: 'view_users' },
            { title: 'menu.roles', href: route('roles.index'), icon: Shield, permission: 'manage_roles_permissions' },
            { title: 'menu.permissions', href: route('permissions.index'), icon: Lock, permission: 'manage_roles_permissions' },
            { title: 'menu.subject_assignments', href: route('subject-assignments.index'), icon: ClipboardList, permission: 'view_subject_assignments' },
            { title: 'menu.audit_logs', href: route('audit-logs.index'), icon: ScanLine, permission: 'view_audit_logs' },
            { title: 'menu.portal_access', href: route('guardians.index'), icon: UserCheck, permission: 'view_portal_accounts' },
        ],
    },
    {
        title: 'menu.statistics',
        href: route('statistics.index'),
        icon: PieChart,
        permission: 'view_statistics',
    },
    {
        title: 'menu.settings',
        href: '#',
        icon: Settings,
        items: [
            { title: 'menu.school', href: route('schools.index'), icon: BookOpen, permission: 'view_schools' },
            { title: 'menu.classrooms', href: route('classrooms.index'), icon: Layers, permission: 'view_classes' },
            { title: 'menu.classroom_types', href: route('classroom-types.index'), icon: Tag, permission: 'view_classroom_types' },
            { title: 'menu.subjects', href: route('subjects.index'), icon: BookOpen, permission: 'view_subjects' },
            { title: 'menu.countries', href: route('countries.index'), icon: Globe, permission: 'view_countries' },
            { title: 'menu.evaluation_types', href: route('evaluation-types.index'), icon: Tag, permission: 'view_evaluation_types' },
            { title: 'menu.academic_years', href: route('academic-years.index'), icon: Calendar, permission: 'view_academic_years' },
            { title: 'menu.academic_periods', href: route('academic-periods.index'), icon: Clock, permission: 'view_academic_periods' },
            { title: 'menu.fee_categories', href: route('fee-categories.index'), icon: Percent, permission: 'view_fee_categories' },
            { title: 'menu.fee_structures', href: route('fee-structures.index'), icon: DollarSign, permission: 'view_fee_structures' },
            { title: 'menu.scholarships', href: route('scholarships.index'), icon: Percent, permission: 'view_scholarships' },
            { title: 'menu.grading_configs', href: route('grading-configs.index'), icon: SlidersHorizontal, permission: 'view_grading_configs' },
            { title: 'menu.file_storage', href: route('file-storage.index'), icon: HardDrive, permission: 'manage_file_storage' },
            { title: 'menu.document_templates', href: route('document-templates.index'), icon: FileBadge, permission: 'view_documents' },
            { title: 'menu.backups', href: route('backups.index'), icon: DatabaseBackup, permission: 'view_backups' },
            { title: 'menu.about', href: route('about.index'), icon: Info },
        ],
    },
    {
        title: 'menu.my_account',
        href: '/settings/profile',
        icon: UserCircle,
        // Les réglages du compte n'ont pas de préfixe commun exclusif : sans ces
        // chemins, l'entrée s'éteindrait sur Mot de passe, 2FA ou Apparence.
        match: ['/settings/password', '/settings/two-factor', '/settings/appearance'],
    },
];
