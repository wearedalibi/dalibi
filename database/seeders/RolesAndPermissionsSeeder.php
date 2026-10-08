<?php

namespace Database\Seeders;

use App\Constants\Permissions;
use App\Constants\Roles;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()['cache']->forget('spatie.permission.cache');

        // 1) Création de TOUTES les permissions (générées par module)
        $labels = Permissions::labels();
        foreach (Permissions::all() as $name) {
            Permission::firstOrCreate(['name' => $name], ['description' => $labels[$name] ?? $name]);
        }

        // 2) Administrateur : toutes les permissions
        Role::firstOrCreate(['name' => Roles::ADMINISTRATOR])
            ->syncPermissions(Permission::pluck('name'));

        // 3) Directeur
        $director = $this->expand([
            'schools' => ['view'],
            'academic_years' => ['view', 'create', 'edit'],
            'academic_periods' => ['view', 'create', 'edit'],
            'classes' => ['view', 'create', 'edit'],
            'classroom_types' => ['view'],
            'calendar' => ['view', 'create', 'edit', 'delete'],
            'subjects' => ['view', 'create', 'edit'],
            'countries' => ['view', 'create', 'edit'],
            'subject_assignments' => ['view', 'create', 'edit'],
            'class_subjects' => ['view', 'create', 'edit'],
            'students' => ['view', 'create', 'edit'],
            'enrollments' => ['view', 'create', 'edit'],
            'roster' => ['view', 'export'],
            'promotion' => ['execute'],
            'timetable' => ['view', 'create', 'edit'],
            'student_scholarships' => ['view'],
            'attendances' => ['view'],
            'absence_permissions' => ['view', 'review'],
            'evaluations' => ['view'],
            'evaluation_templates' => ['view', 'generate'],
            'evaluation_types' => ['view', 'create', 'edit', 'delete'],
            'marks' => ['view'],
            'official_exams' => ['view', 'create', 'edit'],
            'grades' => ['view'],
            'bulletins' => ['view', 'validate', 'download'],
            'bulletin_templates' => ['view', 'edit'],
            'note_reclamations' => ['view', 'review'],
            'finances' => ['view'],
            'employees' => ['view', 'create', 'edit'],
            'salary_grades' => ['view'],
            'salary_components' => ['view'],
            'payroll' => ['view', 'create', 'validate'],
            'reports' => ['view', 'export'],
            'statistics' => ['view', 'export'],
            'archives' => ['view'],
            'documents' => ['view', 'generate'],
            'document_headers' => ['view', 'edit'],
            'grading_configs' => ['view'],
            'fee_categories' => ['view'],
            'fee_structures' => ['view'],
            'scholarships' => ['view'],
            'users' => ['view', 'create', 'edit'],
            'audit_logs' => ['view'],
        ], [Permissions::VIEW_STUDENT_PARENTS_INFO]);
        Role::firstOrCreate(['name' => Roles::DIRECTOR])->syncPermissions($director);

        // 4) Enseignant
        $teacher = $this->expand([
            'classes' => ['view'],
            'subjects' => ['view'],
            'students' => ['view'],
            'timetable' => ['view'],
            'roster' => ['view'],
            'calendar' => ['view'],
            'grades' => ['view', 'create', 'edit'],
            'bulletins' => ['view'],
            'marks' => ['view', 'create', 'edit'],
            'evaluations' => ['view', 'edit'],
            'evaluation_templates' => ['view'],
            'attendances' => ['view', 'create', 'edit'],
            'absence_permissions' => ['view', 'create'],
            'note_reclamations' => ['view', 'create'],
        ], [Permissions::VIEW_STUDENT_PARENTS_INFO]);
        Role::firstOrCreate(['name' => Roles::TEACHER])->syncPermissions($teacher);

        // 5) Comptabilité
        $accounting = $this->expand([
            'schools' => ['view'],
            'academic_years' => ['view'],
            'students' => ['view'],
            'finances' => ['view', 'create', 'edit', 'delete'],
            'cash_accounts' => ['view', 'create', 'edit', 'delete'],
            'invoices' => ['view', 'create'],
            'transactions' => ['view', 'create'],
            'expenses' => ['view', 'create', 'edit', 'delete'],
            'employees' => ['view', 'create', 'edit', 'delete'],
            'salary_grades' => ['view', 'create', 'edit', 'delete'],
            'salary_components' => ['view', 'create', 'edit', 'delete'],
            'payroll' => ['view', 'create', 'validate', 'pay', 'cancel'],
            'fee_categories' => ['view', 'create', 'edit'],
            'fee_structures' => ['view', 'create', 'edit'],
            'reports' => ['view', 'export'],
            'statistics' => ['view', 'export'],
            'users' => ['view'],
        ]);
        Role::firstOrCreate(['name' => Roles::ACCOUNTING])->syncPermissions($accounting);

        // 6) Secrétariat
        $secretary = $this->expand([
            'schools' => ['view'],
            'academic_years' => ['view'],
            'academic_periods' => ['view'],
            'classes' => ['view'],
            'calendar' => ['view', 'create', 'edit'],
            'students' => ['view', 'create', 'edit'],
            'enrollments' => ['view', 'create', 'edit'],
            'roster' => ['view', 'export'],
            'promotion' => ['execute'],
            'timetable' => ['view', 'create', 'edit'],
            'student_scholarships' => ['view'],
            'attendances' => ['view'],
            'absence_permissions' => ['view', 'create'],
            'official_exams' => ['view'],
            'bulletins' => ['view', 'download'],
            'bulletin_templates' => ['view'],
            'documents' => ['view', 'create', 'edit', 'generate'],
            'document_headers' => ['view', 'edit'],
            'archives' => ['view', 'create', 'edit', 'delete'],
            'users' => ['view', 'create', 'edit'],
            'portal_accounts' => ['view', 'create', 'edit', 'delete'],
            'reports' => ['view'],
            'statistics' => ['view', 'export'],
        ], [Permissions::VIEW_STUDENT_PARENTS_INFO]);
        Role::firstOrCreate(['name' => Roles::SECRETARIAT])->syncPermissions($secretary);

        $this->command?->info('Rôles et permissions synchronisés ('.count(Permissions::all()).' permissions).');
    }

    /**
     * Développe une carte module => [capacités] en noms de permissions.
     *
     * @param  array<string, array<int,string>>  $map
     * @param  array<int,string>  $extra
     * @return array<int,string>
     */
    private function expand(array $map, array $extra = []): array
    {
        $names = $extra;
        foreach ($map as $module => $abilities) {
            foreach ($abilities as $ability) {
                $names[] = Permissions::name($ability, $module);
            }
        }

        return array_values(array_unique($names));
    }
}
