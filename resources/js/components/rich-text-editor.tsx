import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import {
    AlignCenter, AlignLeft, AlignRight, Bold, Heading1, Heading2,
    Italic, List, ListOrdered, Redo, Undo,
} from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from '@/helpers/i18n';

interface Props {
    value: string;
    onChange: (html: string) => void;
    /** Expose l'éditeur au parent (pour insérer des variables). */
    onReady?: (editor: Editor) => void;
}

function ToolbarButton({ active, onClick, title, children }: Readonly<{ active?: boolean; onClick: () => void; title: string; children: React.ReactNode }>) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            className={`p-2 rounded-md transition-colors ${active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
        >
            {children}
        </button>
    );
}

export function RichTextEditor({ value, onChange, onReady }: Readonly<Props>) {
    // TipTap `useEditor` est incompatible avec le React Compiler (refs mutables) :
    // cette directive désactive sa mémoïsation pour ce composant.
    'use no memo';

    const { t } = useTranslation();

    const editor = useEditor({
        extensions: [
            StarterKit,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
        ],
        content: value,
        immediatelyRender: false,
        shouldRerenderOnTransaction: false,
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none min-h-[320px] focus:outline-none px-4 py-3',
            },
        },
    });

    useEffect(() => {
        if (editor && onReady) onReady(editor);
    }, [editor, onReady]);

    // Sync externe (ex. reset) sans casser le curseur
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value, { emitUpdate: false });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    if (!editor) return null;

    return (
        <div className="rounded-xl ring-1 ring-gray-200 bg-white overflow-hidden">
            <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-gray-50/60 px-2 py-1.5">
                <ToolbarButton title={t('common.editor.bold')} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></ToolbarButton>
                <ToolbarButton title={t('common.editor.italic')} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></ToolbarButton>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <ToolbarButton title={t('common.editor.heading1')} active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="w-4 h-4" /></ToolbarButton>
                <ToolbarButton title={t('common.editor.heading2')} active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="w-4 h-4" /></ToolbarButton>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <ToolbarButton title={t('common.editor.bullet_list')} active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></ToolbarButton>
                <ToolbarButton title={t('common.editor.numbered_list')} active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></ToolbarButton>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <ToolbarButton title={t('common.editor.align_left')} active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft className="w-4 h-4" /></ToolbarButton>
                <ToolbarButton title={t('common.editor.align_center')} active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter className="w-4 h-4" /></ToolbarButton>
                <ToolbarButton title={t('common.editor.align_right')} active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight className="w-4 h-4" /></ToolbarButton>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <ToolbarButton title={t('common.editor.undo')} onClick={() => editor.chain().focus().undo().run()}><Undo className="w-4 h-4" /></ToolbarButton>
                <ToolbarButton title={t('common.editor.redo')} onClick={() => editor.chain().focus().redo().run()}><Redo className="w-4 h-4" /></ToolbarButton>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}
