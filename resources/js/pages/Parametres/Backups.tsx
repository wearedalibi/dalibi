import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertCircle, AlertTriangle, Archive, CheckCircle2, Clock, Cloud, Database, DatabaseBackup,
    Download, HardDrive, Lock, Play, ShieldCheck, Trash2, Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

interface BackupRow {
    id: string; filename: string; format: string; disk: string; size: number;
    status: string; error: string | null; scheduled: boolean;
    locked?: boolean; label?: string | null;
    includes_media?: boolean; checksum?: string | null;
    created_by: string | null; created_at: string | null;
}
interface AcademicYearRow { id: string; year: string; archived: boolean; }
interface Settings { frequency: string; time: string; day_of_week: string; formats: string; retention: string; }
interface Props { backups: BackupRow[]; settings: Settings; storageDriver: string; academicYears: AcademicYearRow[]; tables: string[]; }

const ALL_TABLES = '__all__';

const DAY_KEYS = ['1', '2', '3', '4', '5', '6', '7'] as const;

export default function Backups({ backups, settings, storageDriver, academicYears, tables }: Readonly<Props>) {
    const { t } = useTranslation();
    const fmtSize = (b: number) => b > 1048576
        ? t('parametres.backups.size_mb', { n: (b / 1048576).toFixed(1) })
        : t('parametres.backups.size_kb', { n: Math.max(1, Math.round(b / 1024)) });
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [restoreTable, setRestoreTable] = useState<string>(ALL_TABLES);
    const [runFormats, setRunFormats] = useState<string[]>(['json', 'sql']);
    const [withMedia, setWithMedia] = useState(false);
    const [running, setRunning] = useState(false);

    const [archiveYear, setArchiveYear] = useState<string>('');
    const [archiving, setArchiving] = useState(false);
    const runArchive = () => {
        if (!archiveYear) return;
        setArchiving(true);
        router.post(route('backups.archive'), { academic_year_id: archiveYear }, {
            preserveScroll: true,
            onSuccess: () => setArchiveYear(''),
            onFinish: () => setArchiving(false),
        });
    };

    const restoreInputRef = useRef<HTMLInputElement>(null);
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [restoreConfirm, setRestoreConfirm] = useState(false);
    const [restoring, setRestoring] = useState(false);

    const runRestore = () => {
        if (!restoreFile) return;
        setRestoring(true);
        router.post(route('backups.restore'), {
            file: restoreFile,
            only_table: restoreTable === ALL_TABLES ? null : restoreTable,
        }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => { setRestoreFile(null); if (restoreInputRef.current) restoreInputRef.current.value = ''; },
            onFinish: () => { setRestoring(false); setRestoreConfirm(false); },
        });
    };

    const toggle = (list: string[], set: (v: string[]) => void, f: string) =>
        set(list.includes(f) ? list.filter(x => x !== f) : [...list, f]);

    const runNow = () => {
        if (runFormats.length === 0) return;
        setRunning(true);
        router.post(route('backups.store'), { formats: runFormats, with_media: withMedia }, {
            preserveScroll: true,
            onFinish: () => setRunning(false),
        });
    };

    const { data, setData, post, processing } = useForm({
        frequency: settings.frequency || 'none',
        time: settings.time || '02:00',
        day_of_week: settings.day_of_week || '1',
        formats: (settings.formats || 'json,sql').split(',').filter(Boolean),
        retention: settings.retention || '10',
    });

    const saveSchedule = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('backups.schedule'), { preserveScroll: true });
    };

    const isRemote = storageDriver === 's3';

    return (
        <AppLayout>
            <Head title={t('parametres.backups.head')} />
            <div className="w-full space-y-6">

                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <DatabaseBackup className="w-7 h-7 text-blue-600" /> {t('parametres.backups.title')}
                    </h1>
                    <p className="mt-2 text-gray-500">{t('parametres.backups.subtitle')}</p>
                </div>

                {/* Destination de stockage */}
                <div className={`rounded-2xl p-4 ring-1 flex items-center gap-3 ${isRemote ? 'bg-emerald-50 ring-emerald-100' : 'bg-amber-50 ring-amber-100'}`}>
                    {isRemote ? <Cloud className="w-5 h-5 text-emerald-600" /> : <HardDrive className="w-5 h-5 text-amber-600" />}
                    <div className="text-sm">
                        <p className="font-semibold text-gray-900">
                            {t('parametres.backups.dest_label')} {isRemote ? t('parametres.backups.dest_remote') : t('parametres.backups.dest_local')}
                        </p>
                        <p className="text-gray-500">
                            {isRemote
                                ? t('parametres.backups.dest_remote_desc')
                                : t('parametres.backups.dest_local_desc')}
                        </p>
                    </div>
                </div>

                {/* Sauvegarde manuelle */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <Play className="w-4 h-4 text-blue-600" /> {t('parametres.backups.manual_title')}
                    </h2>
                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-4">
                            {['json', 'sql'].map(f => (
                                <label key={f} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <Checkbox checked={runFormats.includes(f)} onCheckedChange={() => toggle(runFormats, setRunFormats, f)} />
                                    <span className="uppercase font-medium text-gray-700">{f}</span>
                                </label>
                            ))}
                        </div>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={withMedia} onCheckedChange={() => setWithMedia(v => !v)} />
                            <span className="font-medium text-gray-700">{t('parametres.backups.include_media')}</span>
                        </label>
                        <Button onClick={runNow} disabled={running || runFormats.length === 0} className="bg-blue-600 hover:bg-blue-700 gap-2">
                            <Database className="w-4 h-4" /> {running ? t('parametres.backups.running') : t('parametres.backups.run_backup')}
                        </Button>
                    </div>
                    <p className="mt-3 text-xs text-gray-400">
                        {t('parametres.backups.manual_hint_before')} <strong>.zip</strong> {t('parametres.backups.manual_hint_after')}
                    </p>
                </div>

                {/* Archive d'année scolaire */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
                        <Archive className="w-4 h-4 text-cyan-600" /> {t('parametres.backups.archive_title')}
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                        {t('parametres.backups.archive_desc_before')} <strong>{t('parametres.backups.archive_desc_locked')}</strong> {t('parametres.backups.archive_desc_after')}
                    </p>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1.5 min-w-56">
                            <label className="text-sm font-medium text-gray-700">{t('parametres.backups.academic_year')}</label>
                            <Select value={archiveYear} onValueChange={setArchiveYear}>
                                <SelectTrigger><SelectValue placeholder={t('parametres.backups.choose_year')} /></SelectTrigger>
                                <SelectContent>
                                    {academicYears.map(y => (
                                        <SelectItem key={y.id} value={y.id} disabled={y.archived}>
                                            {y.year}{y.archived ? t('parametres.backups.already_archived') : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={runArchive} disabled={archiving || !archiveYear} className="bg-cyan-600 hover:bg-cyan-700 gap-2">
                            <Archive className="w-4 h-4" /> {archiving ? t('parametres.backups.archiving') : t('parametres.backups.archive_year')}
                        </Button>
                    </div>
                </div>

                {/* Planification */}
                <form onSubmit={saveSchedule} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5 space-y-4">
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600" /> {t('parametres.backups.schedule_title')}
                    </h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">{t('parametres.backups.frequency')}</label>
                            <Select value={data.frequency} onValueChange={v => setData('frequency', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t('parametres.backups.freq_none')}</SelectItem>
                                    <SelectItem value="daily">{t('parametres.backups.freq_daily')}</SelectItem>
                                    <SelectItem value="weekly">{t('parametres.backups.freq_weekly')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">{t('parametres.backups.time')}</label>
                            <Input type="time" value={data.time} onChange={e => setData('time', e.target.value)} />
                        </div>
                        {data.frequency === 'weekly' && (
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">{t('parametres.backups.day')}</label>
                                <Select value={data.day_of_week} onValueChange={v => setData('day_of_week', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {DAY_KEYS.map(d => <SelectItem key={d} value={d}>{t(`parametres.backups.day_${d}`)}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">{t('parametres.backups.retention')}</label>
                            <Input type="number" min={0} max={365} value={data.retention} onChange={e => setData('retention', e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">{t('parametres.backups.formats_generated')}</label>
                        <div className="flex items-center gap-4">
                            {['json', 'sql'].map(f => (
                                <label key={f} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <Checkbox checked={data.formats.includes(f)} onCheckedChange={() => setData('formats', data.formats.includes(f) ? data.formats.filter(x => x !== f) : [...data.formats, f])} />
                                    <span className="uppercase font-medium text-gray-700">{f}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <p className="text-xs text-gray-400">
                        {t('parametres.backups.schedule_hint_before')}
                        (<code>php artisan schedule:run</code> {t('parametres.backups.schedule_hint_after')}
                    </p>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={processing} className="bg-indigo-600 hover:bg-indigo-700">{t('parametres.backups.save_schedule')}</Button>
                    </div>
                </form>

                {/* Restauration */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-red-100 p-5 space-y-4">
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Upload className="w-4 h-4 text-red-600" /> {t('parametres.backups.restore_title')}
                    </h2>
                    <div className="flex items-start gap-3 rounded-xl bg-red-50 ring-1 ring-red-100 p-3 text-sm">
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <p className="text-red-700">
                            {t('parametres.backups.restore_warn_before')} <strong>{t('parametres.backups.restore_warn_bold')}</strong> {t('parametres.backups.restore_warn_after')}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <input
                            ref={restoreInputRef}
                            type="file"
                            accept=".json,.sql,.gz,.dump,.zip"
                            onChange={e => setRestoreFile(e.target.files?.[0] ?? null)}
                            className="block text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-red-50 file:px-3 file:py-1.5 file:text-red-700 file:text-sm hover:file:bg-red-100"
                        />
                        <Button
                            onClick={() => setRestoreConfirm(true)}
                            disabled={!restoreFile || restoring}
                            className="bg-red-600 hover:bg-red-700 gap-2"
                        >
                            <Upload className="w-4 h-4" /> {restoring ? t('parametres.backups.restoring') : t('parametres.backups.restore')}
                        </Button>
                    </div>
                    <div className="space-y-1.5 max-w-md">
                        <label className="text-sm font-medium text-gray-700">{t('parametres.backups.restore_one_table')}</label>
                        <Select value={restoreTable} onValueChange={setRestoreTable}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_TABLES}>{t('parametres.backups.all_tables')}</SelectItem>
                                {tables.map(tbl => <SelectItem key={tbl} value={tbl}>{tbl}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400">
                            {t('parametres.backups.restore_table_hint_before')} <strong>.json</strong> {t('parametres.backups.restore_table_hint_after')}
                        </p>
                    </div>
                    <p className="text-xs text-gray-400">{t('parametres.backups.accepted_formats')}</p>
                </div>

                {/* Historique */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <h2 className="font-semibold text-gray-900 px-5 pt-5 pb-3">{t('parametres.backups.history_title')}</h2>
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead>{t('parametres.backups.th_file')}</TableHead>
                                <TableHead>{t('parametres.backups.th_format')}</TableHead>
                                <TableHead>{t('parametres.backups.th_size')}</TableHead>
                                <TableHead>{t('parametres.backups.th_origin')}</TableHead>
                                <TableHead>{t('parametres.backups.th_status')}</TableHead>
                                <TableHead>{t('parametres.backups.th_date')}</TableHead>
                                <TableHead className="text-center w-28">{t('parametres.common.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {backups.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="py-12 text-center text-gray-400">{t('parametres.backups.empty')}</TableCell></TableRow>
                            ) : backups.map(b => (
                                <TableRow key={b.id} className="hover:bg-gray-50">
                                    <TableCell className="font-mono text-xs text-gray-700">
                                        {b.filename}
                                        {b.locked && (
                                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 font-sans text-[11px] font-medium text-cyan-700 ring-1 ring-cyan-100">
                                                <Lock className="w-3 h-3" /> {b.label ?? t('parametres.backups.badge_archive')}
                                            </span>
                                        )}
                                        {b.includes_media && (
                                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 font-sans text-[11px] font-medium text-violet-700 ring-1 ring-violet-100">
                                                <Archive className="w-3 h-3" /> {t('parametres.backups.badge_media')}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell><span className="text-xs font-bold uppercase text-blue-600">{b.format}</span></TableCell>
                                    <TableCell className="text-sm text-gray-600">{b.status === 'completed' ? fmtSize(b.size) : '—'}</TableCell>
                                    <TableCell className="text-xs text-gray-500">{b.scheduled ? t('parametres.backups.origin_scheduled') : (b.created_by ?? t('parametres.backups.origin_manual'))}</TableCell>
                                    <TableCell>
                                        {b.status === 'completed' ? (
                                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> {t('parametres.backups.status_ok')}</span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs text-red-600" title={b.error ?? ''}><AlertCircle className="w-3.5 h-3.5" /> {t('parametres.backups.status_fail')}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600">{b.created_at}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-center gap-1.5">
                                            {b.status === 'completed' && (
                                                <a href={route('backups.download', b.id)}>
                                                    <Button variant="outline" size="sm" className="gap-1 text-xs"><Download className="w-3.5 h-3.5" /></Button>
                                                </a>
                                            )}
                                            {b.status === 'completed' && b.checksum && (
                                                <Button variant="outline" size="sm" className="text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                                    title={t('parametres.backups.verify_integrity')}
                                                    onClick={() => router.post(route('backups.verify', b.id), {}, { preserveScroll: true })}>
                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                            <Button variant="outline" size="sm" className="border-red-200 text-red-500 hover:bg-red-50" onClick={() => setDeleteId(b.id)}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <AlertDialog open={restoreConfirm} onOpenChange={setRestoreConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('parametres.backups.restore_confirm_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('parametres.backups.restore_confirm_desc', { name: restoreFile?.name ?? '' })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('parametres.common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={runRestore}>
                            {t('parametres.backups.restore_now')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('parametres.backups.delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('parametres.backups.delete_desc')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel>{t('parametres.common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && router.delete(route('backups.destroy', deleteId), { preserveScroll: true, onSuccess: () => setDeleteId(null) })}>
                            {t('parametres.common.delete')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
