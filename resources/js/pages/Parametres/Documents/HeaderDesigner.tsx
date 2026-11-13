import { Head, router } from '@inertiajs/react';
import {
    AlignCenter, AlignLeft, AlignRight, Bold, Image as ImageIcon, Italic,
    LayoutTemplate, Plus, RotateCcw, Save, Tag, Trash2, Type,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { route } from '@/helpers/route';
import { useTranslation } from '@/helpers/i18n';
import AppLayout from '@/layouts/app-layout';

type Align = 'left' | 'center' | 'right';

interface El {
    id: string;
    type: 'text' | 'logo';
    x: number;
    y: number;
    w: number;
    content: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    align: Align;
    color: string;
}

interface Watermark {
    enabled: boolean;
    type: 'text' | 'image';
    text: string;
    image_path: string | null;
    opacity: number;
    size: number;
    rotation: number;
    color: string;
}

interface VariableCatalog {
    [group: string]: { label: string; variables: Record<string, string> };
}

interface Props {
    header: { layout: { width: number; height: number; elements: El[] }; watermark: Watermark };
    preset: string;
    presets: Record<string, string>;
    default: { layout: { width: number; height: number; elements: El[] }; watermark: Watermark };
    watermarkImageUrl: string | null;
    variables: VariableCatalog;
    canvasWidth: number;
    school: { name: string; logo_url: string | null };
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `el-${Date.now()}-${Math.random()}`);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export default function HeaderDesigner({ header, preset: initialPreset, presets, default: fallback, watermarkImageUrl, variables, canvasWidth, school }: Readonly<Props>) {
    const { t } = useTranslation();
    const [preset, setPreset] = useState<string>(initialPreset ?? 'ministeriel');
    const [elements, setElements] = useState<El[]>(header.layout.elements ?? []);
    const [height, setHeight] = useState<number>(header.layout.height ?? 130);
    const [watermark, setWatermark] = useState<Watermark>(header.watermark);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [wmFile, setWmFile] = useState<File | null>(null);
    const [wmPreview, setWmPreview] = useState<string | null>(watermarkImageUrl);
    const [saving, setSaving] = useState(false);

    const drag = useRef<{ id: string; px: number; py: number; ex: number; ey: number } | null>(null);

    const selected = elements.find((e) => e.id === selectedId) ?? null;

    // Valeurs d'exemple pour l'aperçu des variables {{ ... }}
    const samples: Record<string, string> = {
        'ecole.nom': school.name || "Nom de l'école",
        'ecole.terme': 'République Togolaise',
        'ecole.devise': 'Travail – Liberté – Patrie',
        'ecole.bp': 'BP 1234',
        'ecole.ville': 'Lomé',
        'ecole.telephone': '+228 90 00 00 00',
        'ecole.email': 'contact@ecole.tg',
    };

    const preview = (content: string) =>
        content.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => samples[k] ?? `[${k}]`);

    const update = (id: string, patch: Partial<El>) =>
        setElements((els) => els.map((e) => (e.id === id ? { ...e, ...patch } : e)));

    const addElement = (preset: Partial<El>) => {
        const el: El = {
            id: uid(), type: 'text', x: 24, y: 20, w: 240, content: t('parametres.documents.hd_block_text'),
            fontSize: 13, bold: false, italic: false, align: 'left', color: '#1a1a1a', ...preset,
        };
        setElements((els) => [...els, el]);
        setSelectedId(el.id);
    };

    const removeSelected = () => {
        if (!selectedId) return;
        setElements((els) => els.filter((e) => e.id !== selectedId));
        setSelectedId(null);
    };

    const resetDefault = () => {
        setElements(fallback.layout.elements);
        setHeight(fallback.layout.height);
        setWatermark(fallback.watermark);
        setWmFile(null);
        setSelectedId(null);
    };

    // Glisser-déposer libre (handlers au niveau du canvas)
    const onPointerDownEl = (e: React.PointerEvent, el: El) => {
        e.stopPropagation();
        setSelectedId(el.id);
        drag.current = { id: el.id, px: e.clientX, py: e.clientY, ex: el.x, ey: el.y };
    };

    useEffect(() => {
        const move = (e: PointerEvent) => {
            const d = drag.current;
            if (!d) return;
            const el = elements.find((x) => x.id === d.id);
            if (!el) return;
            const nx = clamp(d.ex + (e.clientX - d.px), 0, canvasWidth - 10);
            const ny = clamp(d.ey + (e.clientY - d.py), 0, height - 10);
            update(d.id, { x: Math.round(nx), y: Math.round(ny) });
        };
        const up = () => { drag.current = null; };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
    }, [elements, height, canvasWidth]);

    const pickWmImage = (file: File | null) => {
        setWmFile(file);
        setWmPreview(file ? URL.createObjectURL(file) : watermarkImageUrl);
    };

    const save = () => {
        setSaving(true);
        router.post(
            route('document-header.update'),
            {
                preset,
                layout: JSON.stringify({ width: canvasWidth, height, elements }),
                watermark: JSON.stringify(watermark),
                watermark_image: wmFile,
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => setSaving(false),
            },
        );
    };

    const flatVariables = Object.values(variables).flatMap((g) => Object.entries(g.variables));

    return (
        <AppLayout>
            <Head title={t('parametres.documents.hd_head')} />
            <div className="w-full space-y-6">

                {/* En-tête de page */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                            <LayoutTemplate className="h-7 w-7 text-blue-600 shrink-0" /> {t('parametres.documents.hd_title')}
                        </h1>
                        <p className="mt-2 text-gray-500">{t('parametres.documents.hd_subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="gap-2" onClick={resetDefault}>
                            <RotateCcw className="w-4 h-4" /> {t('parametres.documents.hd_reset')}
                        </Button>
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={save} disabled={saving}>
                            <Save className="w-4 h-4" /> {saving ? t('parametres.documents.hd_saving') : t('parametres.common.save')}
                        </Button>
                    </div>
                </div>

                {/* Préréglage d'en-tête */}
                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 flex flex-wrap items-center gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('parametres.documents.hd_preset_label')}</p>
                    <Select value={preset} onValueChange={setPreset}>
                        <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {Object.entries(presets).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">{t('parametres.documents.hd_watermark_both')}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                    {/* Zone de composition */}
                    <div className="space-y-4">
                        {preset !== 'personnalise' && (
                            <div className="rounded-2xl bg-blue-50/60 p-5 ring-1 ring-blue-100 text-sm text-gray-700 space-y-2">
                                <p className="font-semibold text-gray-900">{t('parametres.documents.hd_ministerial_title')}</p>
                                <p>{t('parametres.documents.hd_ministerial_p1')}</p>
                                <p className="text-xs text-gray-500">{t('parametres.documents.hd_ministerial_p2')}</p>
                            </div>
                        )}
                        {preset === 'personnalise' && (<>
                        {/* Palette */}
                        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{t('parametres.documents.hd_add_block')}</p>
                            <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => school.logo_url ? addElement({ type: 'logo', content: '', w: 70 }) : undefined} disabled={!school.logo_url}>
                                    <ImageIcon className="w-4 h-4" /> {t('parametres.documents.hd_block_logo')}
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => addElement({ content: '{{ecole.nom}}', fontSize: 16, bold: true, align: 'center', w: 360 })}>
                                    <Plus className="w-4 h-4" /> {t('parametres.documents.hd_block_name')}
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => addElement({ content: '{{ecole.devise}}', fontSize: 11, italic: true, align: 'center', w: 360, color: '#444444' })}>
                                    <Plus className="w-4 h-4" /> {t('parametres.documents.hd_block_motto')}
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => addElement({ content: '{{ecole.terme}}', fontSize: 13, bold: true, align: 'center', w: 360 })}>
                                    <Plus className="w-4 h-4" /> {t('parametres.documents.hd_block_term')}
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => addElement({ content: '{{ecole.bp}} – {{ecole.ville}} – {{ecole.telephone}}', fontSize: 10, align: 'center', w: 420, color: '#555555' })}>
                                    <Plus className="w-4 h-4" /> {t('parametres.documents.hd_block_contact')}
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => addElement({ content: t('parametres.documents.hd_default_text') })}>
                                    <Type className="w-4 h-4" /> {t('parametres.documents.hd_block_text')}
                                </Button>
                            </div>
                        </div>

                        {/* Canvas */}
                        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('parametres.documents.hd_canvas_title')}</p>
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs text-gray-500">{t('parametres.documents.hd_height')}</Label>
                                    <Input type="number" value={height} min={60} max={400}
                                        onChange={(e) => setHeight(clamp(Number(e.target.value) || 130, 60, 400))}
                                        className="h-8 w-20" />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <div
                                    className="relative mx-auto bg-white ring-1 ring-dashed ring-gray-300 select-none"
                                    style={{ width: canvasWidth, height }}
                                    onPointerDown={() => setSelectedId(null)}
                                >
                                    {elements.map((el) => (
                                        <div
                                            key={el.id}
                                            onPointerDown={(e) => onPointerDownEl(e, el)}
                                            className={`absolute cursor-move ${selectedId === el.id ? 'outline outline-2 outline-blue-500' : 'hover:outline hover:outline-1 hover:outline-blue-300'}`}
                                            style={{
                                                left: el.x, top: el.y, width: el.w,
                                                textAlign: el.align,
                                                fontSize: el.type === 'logo' ? undefined : el.fontSize,
                                                fontWeight: el.bold ? 700 : 400,
                                                fontStyle: el.italic ? 'italic' : 'normal',
                                                color: el.color, lineHeight: 1.3,
                                            }}
                                        >
                                            {el.type === 'logo'
                                                ? <img src={school.logo_url ?? ''} alt="logo" style={{ maxWidth: el.w, maxHeight: el.w, objectFit: 'contain' }} draggable={false} />
                                                : preview(el.content)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <p className="mt-2 text-xs text-gray-400">{t('parametres.documents.hd_canvas_hint')}</p>
                        </div>
                        </>)}
                    </div>

                    {/* Panneau latéral */}
                    <div className="space-y-4">
                        {preset === 'personnalise' && (
                        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{t('parametres.documents.hd_block_props')}</p>
                            {!selected ? (
                                <p className="text-sm text-gray-400">{t('parametres.documents.hd_select_block')}</p>
                            ) : selected.type === 'logo' ? (
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">{t('parametres.documents.hd_size_px')}</Label>
                                        <Input type="number" value={selected.w} min={20} max={300}
                                            onChange={(e) => update(selected.id, { w: clamp(Number(e.target.value) || 70, 20, 300) })} className="h-9" />
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full gap-1.5 border-red-200 text-red-500 hover:bg-red-50" onClick={removeSelected}>
                                        <Trash2 className="w-3.5 h-3.5" /> {t('parametres.documents.hd_delete')}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">{t('parametres.documents.hd_content')}</Label>
                                        <textarea value={selected.content} rows={2}
                                            onChange={(e) => update(selected.id, { content: e.target.value })}
                                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm" />
                                        <Select onValueChange={(v) => update(selected.id, { content: `${selected.content} {{${v}}}` })}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t('parametres.documents.hd_insert_var_ph')} /></SelectTrigger>
                                            <SelectContent>
                                                {flatVariables.map(([key, label]) => (
                                                    <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">{t('parametres.documents.hd_size')}</Label>
                                            <Input type="number" value={selected.fontSize} min={6} max={48}
                                                onChange={(e) => update(selected.id, { fontSize: clamp(Number(e.target.value) || 12, 6, 48) })} className="h-9" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">{t('parametres.documents.hd_width')}</Label>
                                            <Input type="number" value={selected.w} min={40} max={canvasWidth}
                                                onChange={(e) => update(selected.id, { w: clamp(Number(e.target.value) || 200, 40, canvasWidth) })} className="h-9" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex rounded-md ring-1 ring-gray-200 overflow-hidden">
                                            <button type="button" onClick={() => update(selected.id, { bold: !selected.bold })} className={`p-2 ${selected.bold ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}><Bold className="w-4 h-4" /></button>
                                            <button type="button" onClick={() => update(selected.id, { italic: !selected.italic })} className={`p-2 border-l border-gray-200 ${selected.italic ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}><Italic className="w-4 h-4" /></button>
                                        </div>
                                        <div className="flex rounded-md ring-1 ring-gray-200 overflow-hidden">
                                            {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([a, Icon], i) => (
                                                <button key={a} type="button" onClick={() => update(selected.id, { align: a })}
                                                    className={`p-2 ${i > 0 ? 'border-l border-gray-200' : ''} ${selected.align === a ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}>
                                                    <Icon className="w-4 h-4" />
                                                </button>
                                            ))}
                                        </div>
                                        <input type="color" value={selected.color} onChange={(e) => update(selected.id, { color: e.target.value })}
                                            className="h-9 w-9 rounded-md border border-gray-200 p-0.5" aria-label={t('parametres.documents.hd_color')} />
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full gap-1.5 border-red-200 text-red-500 hover:bg-red-50" onClick={removeSelected}>
                                        <Trash2 className="w-3.5 h-3.5" /> {t('parametres.documents.hd_delete_block')}
                                    </Button>
                                </div>
                            )}
                        </div>
                        )}

                        {/* Filigrane */}
                        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('parametres.documents.hd_watermark')}</p>
                                <label className="flex items-center gap-2 text-sm">
                                    <Checkbox checked={watermark.enabled} onCheckedChange={(v) => setWatermark({ ...watermark, enabled: Boolean(v) })} />
                                    {t('parametres.documents.hd_enable')}
                                </label>
                            </div>

                            <div className={watermark.enabled ? 'space-y-3' : 'space-y-3 opacity-50 pointer-events-none'}>
                                <Select value={watermark.type} onValueChange={(v: 'text' | 'image') => setWatermark({ ...watermark, type: v })}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text">{t('parametres.documents.hd_wm_text')}</SelectItem>
                                        <SelectItem value="image">{t('parametres.documents.hd_wm_image')}</SelectItem>
                                    </SelectContent>
                                </Select>

                                {watermark.type === 'text' ? (
                                    <div className="flex items-center gap-2">
                                        <Input value={watermark.text} placeholder={t('parametres.documents.hd_wm_text_ph')}
                                            onChange={(e) => setWatermark({ ...watermark, text: e.target.value })} className="h-9" />
                                        <input type="color" value={watermark.color} onChange={(e) => setWatermark({ ...watermark, color: e.target.value })}
                                            className="h-9 w-9 rounded-md border border-gray-200 p-0.5" aria-label={t('parametres.documents.hd_color')} />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Input type="file" accept="image/*" onChange={(e) => pickWmImage(e.target.files?.[0] ?? null)} className="h-9" />
                                        {wmPreview && <img src={wmPreview} alt="filigrane" className="h-16 object-contain opacity-60" />}
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label className="text-xs">{t('parametres.documents.hd_opacity', { n: watermark.opacity })}</Label>
                                    <input type="range" min={2} max={50} value={watermark.opacity}
                                        onChange={(e) => setWatermark({ ...watermark, opacity: Number(e.target.value) })} className="w-full" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">{t('parametres.documents.hd_wm_size', { n: watermark.size })}</Label>
                                    <input type="range" min={20} max={120} value={watermark.size}
                                        onChange={(e) => setWatermark({ ...watermark, size: Number(e.target.value) })} className="w-full" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">{t('parametres.documents.hd_rotation', { n: watermark.rotation })}</Label>
                                    <input type="range" min={-90} max={90} value={watermark.rotation}
                                        onChange={(e) => setWatermark({ ...watermark, rotation: Number(e.target.value) })} className="w-full" />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-blue-50/60 p-4 ring-1 ring-blue-100 text-xs text-blue-800 flex gap-2">
                            <Tag className="w-4 h-4 shrink-0 mt-0.5" />
                            {t('parametres.documents.hd_var_note_before')} <code className="font-mono">{'{{ecole.nom}}'}</code> {t('parametres.documents.hd_var_note_after')}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
