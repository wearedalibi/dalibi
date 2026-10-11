<?php

namespace App\Constants;

/**
 * Permissions disponibles dans l'application.
 *
 * Les permissions sont organisées par MODULE (aligné sur les grands menus).
 * Chaque module déclare ses « capacités » (view, create, edit, delete, …) ;
 * le nom de la permission est de la forme "{capacité}_{module}" (ex. view_students).
 *
 * Les constantes ci-dessous restent disponibles pour le code existant.
 */
class Permissions
{
    /* ── Constantes héritées (référencées dans le code) ─────────────── */
    public const VIEW_SCHOOLS = 'view_schools';

    public const CREATE_SCHOOLS = 'create_schools';

    public const EDIT_SCHOOLS = 'edit_schools';

    public const DELETE_SCHOOLS = 'delete_schools';

    public const VIEW_ACADEMIC_YEARS = 'view_academic_years';

    public const CREATE_ACADEMIC_YEARS = 'create_academic_years';

    public const EDIT_ACADEMIC_YEARS = 'edit_academic_years';

    public const DELETE_ACADEMIC_YEARS = 'delete_academic_years';

    public const VIEW_CLASSES = 'view_classes';

    public const CREATE_CLASSES = 'create_classes';

    public const EDIT_CLASSES = 'edit_classes';

    public const DELETE_CLASSES = 'delete_classes';

    public const VIEW_STUDENTS = 'view_students';

    public const CREATE_STUDENTS = 'create_students';

    public const EDIT_STUDENTS = 'edit_students';

    public const DELETE_STUDENTS = 'delete_students';

    public const VIEW_STUDENT_PARENTS_INFO = 'view_student_parents_info';

    public const VIEW_SUBJECTS = 'view_subjects';

    public const CREATE_SUBJECTS = 'create_subjects';

    public const EDIT_SUBJECTS = 'edit_subjects';

    public const DELETE_SUBJECTS = 'delete_subjects';

    public const VIEW_GRADES = 'view_grades';

    public const CREATE_GRADES = 'create_grades';

    public const EDIT_GRADES = 'edit_grades';

    public const DELETE_GRADES = 'delete_grades';

    public const VIEW_ATTENDANCES = 'view_attendances';

    public const CREATE_ATTENDANCES = 'create_attendances';

    public const EDIT_ATTENDANCES = 'edit_attendances';

    public const DELETE_ATTENDANCES = 'delete_attendances';

    public const VIEW_USERS = 'view_users';

    public const CREATE_USERS = 'create_users';

    public const EDIT_USERS = 'edit_users';

    public const DELETE_USERS = 'delete_users';

    public const VIEW_REPORTS = 'view_reports';

    public const EXPORT_REPORTS = 'export_reports';

    public const VIEW_FINANCES = 'view_finances';

    public const CREATE_FINANCES = 'create_finances';

    public const EDIT_FINANCES = 'edit_finances';

    public const DELETE_FINANCES = 'delete_finances';

    public const MANAGE_SETTINGS = 'manage_settings';

    public const MANAGE_ROLES_PERMISSIONS = 'manage_roles_permissions';

    /* ── Libellés des capacités ─────────────────────────────────────── */
    private const ABILITY_LABELS = [
        'view' => 'Voir',
        'create' => 'Créer',
        'edit' => 'Modifier',
        'delete' => 'Supprimer',
        'pay' => 'Payer',
        'cancel' => 'Annuler',
        'export' => 'Exporter',
        'generate' => 'Générer',
        'review' => 'Traiter',
        'restore' => 'Restaurer',
        'execute' => 'Exécuter',
        'manage' => 'Gérer',
        'validate' => 'Valider',
        'download' => 'Télécharger',
    ];

    /**
     * Carte des modules : clé => [groupe de menu, libellé, capacités].
     *
     * @return array<string, array{0:string, 1:string, 2:array<int,string>}>
     */
    public static function modules(): array
    {
        $crud = ['view', 'create', 'edit', 'delete'];

        return [
            // Élèves
            'students' => ['Élèves', 'Élèves', $crud],
            'enrollments' => ['Élèves', 'Inscriptions', $crud],
            'roster' => ['Élèves', 'Effectifs / listes', ['view', 'export']],
            'promotion' => ['Élèves', 'Passage de classe', ['execute']],
            'timetable' => ['Élèves', 'Emploi du temps', $crud],
            'student_scholarships' => ['Élèves', "Bourses d'élèves", $crud],

            // Calendrier
            'calendar' => ['Calendrier', 'Calendrier académique', $crud],

            // Statistiques
            'statistics' => ['Statistiques', 'Statistiques', ['view', 'export']],

            // Présences
            'attendances' => ['Présences', 'Présences', $crud],
            'absence_permissions' => ['Présences', 'Demandes de permission', ['view', 'create', 'review', 'delete']],

            // Examens
            'evaluations' => ['Examens', 'Évaluations par classe', $crud],
            'evaluation_templates' => ['Examens', "Modèles d'évaluation", ['view', 'create', 'edit', 'delete', 'generate']],
            'marks' => ['Examens', 'Saisie des notes', ['view', 'create', 'edit']],
            'official_exams' => ['Examens', 'Examens officiels', $crud],

            // Notes
            'grades' => ['Notes', 'Notes (trimestre)', $crud],
            'note_reclamations' => ['Notes', 'Réclamations de notes', ['view', 'create', 'review']],
            'bulletins' => ['Notes', 'Bulletins', ['view', 'validate', 'download']],
            'bulletin_templates' => ['Notes', 'Modèle de bulletin', ['view', 'edit']],

            // Comptabilité
            'finances' => ['Comptabilité', 'Finances', $crud],
            'cash_accounts' => ['Comptabilité', 'Caisses', $crud],
            'invoices' => ['Comptabilité', 'Factures & paiements', ['view', 'create']],
            'transactions' => ['Comptabilité', 'Transactions', ['view', 'create']],
            'expenses' => ['Comptabilité', 'Dépenses', $crud],

            // Personnel & Paie
            'employees' => ['Personnel & Paie', 'Employés', $crud],
            'salary_grades' => ['Personnel & Paie', 'Grilles salariales', $crud],
            'salary_components' => ['Personnel & Paie', 'Rubriques de paie', $crud],
            'payroll' => ['Personnel & Paie', 'Paie', ['view', 'create', 'validate', 'pay', 'cancel', 'delete']],

            // Archives
            'archives' => ['Archives', 'Archives documentaires', $crud],

            // Administration
            'users' => ['Administration', 'Utilisateurs', $crud],
            'roles_permissions' => ['Administration', 'Rôles & permissions', ['manage']],
            'subject_assignments' => ['Administration', 'Affectations matières', $crud],
            'audit_logs' => ['Administration', "Journal d'audit", ['view']],
            'portal_accounts' => ['Administration', 'Accès portail (tuteurs)', $crud],

            // Paramètres
            'schools' => ['Paramètres', 'Écoles', $crud],
            'academic_years' => ['Paramètres', 'Années académiques', $crud],
            'academic_periods' => ['Paramètres', 'Périodes académiques', $crud],
            'classes' => ['Paramètres', 'Classes', $crud],
            'classroom_types' => ['Paramètres', 'Types de classes', $crud],
            'subjects' => ['Paramètres', 'Matières', $crud],
            'countries' => ['Paramètres', 'Pays', $crud],
            'class_subjects' => ['Paramètres', 'Matières par classe', $crud],
            'evaluation_types' => ['Paramètres', "Types d'évaluation", $crud],
            'fee_categories' => ['Paramètres', 'Catégories de frais', $crud],
            'fee_structures' => ['Paramètres', 'Structures de frais', $crud],
            'scholarships' => ['Paramètres', 'Bourses', $crud],
            'grading_configs' => ['Paramètres', 'Calcul des moyennes', $crud],
            'documents' => ['Paramètres', 'Modèles de documents', ['view', 'create', 'edit', 'delete', 'generate']],
            'document_headers' => ['Paramètres', 'En-tête des documents', ['view', 'edit']],
            'file_storage' => ['Paramètres', 'Fichiers & stockage', ['manage']],
            'backups' => ['Paramètres', 'Sauvegardes', ['view', 'create', 'restore', 'delete']],
            'settings' => ['Paramètres', 'Paramètres généraux', ['manage']],
            'reports' => ['Paramètres', 'Rapports', ['view', 'export']],
        ];
    }

    /** Construit le nom d'une permission ("{ability}_{module}"). */
    public static function name(string $ability, string $module): string
    {
        return $ability.'_'.$module;
    }

    /**
     * Toutes les permissions (noms à plat).
     *
     * @return array<int,string>
     */
    public static function all(): array
    {
        $perms = [];
        foreach (self::modules() as $module => $def) {
            foreach ($def[2] as $ability) {
                $perms[] = self::name($ability, $module);
            }
        }
        $perms[] = self::VIEW_STUDENT_PARENTS_INFO;

        return array_values(array_unique($perms));
    }

    /**
     * Libellés lisibles par nom de permission.
     *
     * @return array<string,string>
     */
    public static function labels(): array
    {
        $labels = [self::VIEW_STUDENT_PARENTS_INFO => 'Voir les informations des parents'];
        foreach (self::modules() as $module => $def) {
            [, $label, $abilities] = $def;
            foreach ($abilities as $ability) {
                $verb = self::ABILITY_LABELS[$ability] ?? ucfirst($ability);
                $labels[self::name($ability, $module)] = $verb.' — '.$label;
            }
        }

        return $labels;
    }

    public static function label(string $permission): string
    {
        return self::labels()[$permission] ?? $permission;
    }
}
