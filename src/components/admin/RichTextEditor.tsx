import { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Youtube from '@tiptap/extension-youtube';
import { Iframe } from './extensions/Iframe';
import {
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Image as ImageIcon, Link as LinkIcon, Undo, Redo, AlignLeft, AlignCenter, AlignRight,
  Video, CodeXml, Minus, ExternalLink, Unlink, Check, X,
} from 'lucide-react';
import TiptapUnderline from '@tiptap/extension-underline';
import { uploadFile } from '../../services/storage';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  storagePath?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}

const ToolbarButton = ({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-2 rounded hover:bg-tan/10 transition-colors ${
      isActive ? 'text-tan bg-tan/10' : 'text-charcoal/70'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

export default function RichTextEditor({ value, onChange, storagePath = 'content_images' }: RichTextEditorProps) {
  const [linkInputVisible, setLinkInputVisible] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: 'text-tan underline decoration-tan/50 cursor-pointer hover:text-tan-dark transition-colors',
        },
      }),
      TiptapUnderline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Youtube.configure({
        width: 640,
        height: 480,
      }),
      Iframe,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        className: 'prose prose-sm sm:prose lg:prose-lg mx-auto focus:outline-none min-h-[300px] border border-tan/30 p-4 rounded-b-md w-full max-w-none',
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    if (linkInputVisible) {
      setTimeout(() => linkInputRef.current?.focus(), 50);
    }
  }, [linkInputVisible]);

  if (!editor) return null;

  const handleImageUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const url = await uploadFile(file, storagePath);
          editor.chain().focus().setImage({ src: url }).run();
        } catch (error) {
          console.error("Error uploading image: ", error);
          alert("Failed to upload image.");
        }
      }
    };
    input.click();
  };

  const openLinkInput = () => {
    const existing = editor.getAttributes('link').href || '';
    setLinkInputValue(existing);
    setLinkInputVisible(true);
  };

  const applyLink = () => {
    const url = linkInputValue.trim();
    setLinkInputVisible(false);
    setLinkInputValue('');
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const cancelLink = () => {
    setLinkInputVisible(false);
    setLinkInputValue('');
    editor.chain().focus().run();
  };

  const addYoutube = () => {
    const url = window.prompt('Enter YouTube URL');
    if (url) {
      editor.commands.setYoutubeVideo({ src: url, width: 640, height: 480 });
    }
  };

  const addEmbed = () => {
    const input = window.prompt('Paste an iframe embed code or URL (e.g. Google Maps, Calendly, etc.)');
    if (!input) return;
    let src = input;
    const match = input.match(/src="([^"]+)"/);
    if (match) src = match[1];
    editor.chain().focus().setIframe({ src }).run();
  };

  return (
    <div className="w-full flex flex-col">
      {/* Toolbar */}
      <div className="border border-tan/30 border-b-0 rounded-t-md p-2 bg-cream flex flex-wrap gap-1 sticky top-0 z-10 w-full overflow-x-auto">
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
          <Undo size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
          <Redo size={18} />
        </ToolbarButton>

        <div className="w-[1px] bg-tan/30 mx-1 my-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold">
          <Bold size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic">
          <Italic size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline">
          <UnderlineIcon size={18} />
        </ToolbarButton>

        <div className="w-[1px] bg-tan/30 mx-1 my-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Heading 1">
          <Heading1 size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Heading 2">
          <Heading2 size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Heading 3">
          <Heading3 size={18} />
        </ToolbarButton>

        <div className="w-[1px] bg-tan/30 mx-1 my-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet list">
          <List size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Numbered list">
          <ListOrdered size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Blockquote">
          <Quote size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
          <Minus size={18} />
        </ToolbarButton>

        <div className="w-[1px] bg-tan/30 mx-1 my-1" />

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Align left">
          <AlignLeft size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Align center">
          <AlignCenter size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Align right">
          <AlignRight size={18} />
        </ToolbarButton>

        <div className="w-[1px] bg-tan/30 mx-1 my-1" />

        <ToolbarButton onClick={openLinkInput} isActive={editor.isActive('link')} title="Insert / edit link">
          <LinkIcon size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={handleImageUpload} title="Insert image">
          <ImageIcon size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={addYoutube} title="Embed YouTube video">
          <Video size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={addEmbed} title="Embed iframe (Maps, Calendly, etc.)">
          <CodeXml size={18} />
        </ToolbarButton>
      </div>

      {/* Inline link input bar */}
      {linkInputVisible && (
        <div className="border border-tan/30 border-b-0 border-t-0 bg-tan/5 px-3 py-2 flex items-center gap-2">
          <LinkIcon size={14} className="text-tan shrink-0" />
          <input
            ref={linkInputRef}
            type="url"
            value={linkInputValue}
            onChange={e => setLinkInputValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
              if (e.key === 'Escape') cancelLink();
            }}
            placeholder="https://..."
            className="flex-grow text-sm font-sans bg-transparent focus:outline-none text-charcoal placeholder:text-charcoal/30"
          />
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); applyLink(); }}
            className="p-1.5 rounded bg-tan text-white hover:bg-tan-dark transition-colors"
            title="Apply link"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); cancelLink(); }}
            className="p-1.5 rounded text-charcoal/50 hover:text-charcoal hover:bg-tan/10 transition-colors"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <EditorContent editor={editor} className="bg-white" />

      {/* Link action bar — shown when cursor is inside a link */}
      {editor.isActive('link') && !linkInputVisible && (
        <div className="flex items-center gap-2 border border-tan/20 border-t-0 bg-tan/5 px-3 py-1.5 text-xs font-sans rounded-b-md">
          <LinkIcon size={12} className="text-tan shrink-0" />
          <span className="text-charcoal/60 truncate max-w-xs">{editor.getAttributes('link').href}</span>
          <div className="ml-auto flex items-center gap-1">
            <a
              href={editor.getAttributes('link').href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-0.5 rounded text-charcoal/50 hover:text-tan hover:bg-tan/10 transition-colors"
              title="Open link"
              onMouseDown={e => e.stopPropagation()}
            >
              <ExternalLink size={11} /> Open
            </a>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); openLinkInput(); }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-charcoal/50 hover:text-tan hover:bg-tan/10 transition-colors"
              title="Edit link"
            >
              <LinkIcon size={11} /> Edit
            </button>
            <button
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                editor.chain().focus().extendMarkRange('link').unsetLink().run();
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-charcoal/50 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Remove link"
            >
              <Unlink size={11} /> Remove
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center text-[11px] text-charcoal/50 mt-1.5 px-1 font-sans">
        <div />
        <div>
          {editor.getText().trim() === '' ? 0 : editor.getText().trim().split(/\s+/).length} words | {editor.getText().length} characters
        </div>
      </div>
    </div>
  );
}
