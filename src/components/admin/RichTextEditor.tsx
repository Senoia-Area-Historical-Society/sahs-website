import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Youtube from '@tiptap/extension-youtube';
import { Iframe } from './extensions/Iframe';
import { 
  Bold, Italic, Heading1, Heading2, Heading3, 
  List, ListOrdered, Quote, Image as ImageIcon, Link as LinkIcon, Undo, Redo, AlignLeft, AlignCenter, AlignRight,
  Video, CodeXml
} from 'lucide-react';
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
  children: React.ReactNode;
}

const ToolbarButton = ({ onClick, isActive, disabled, children }: ToolbarButtonProps) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded hover:bg-tan/10 transition-colors ${
      isActive ? 'text-tan bg-tan/10' : 'text-charcoal/70'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

export default function RichTextEditor({ value, onChange, storagePath = 'content_images' }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
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
        className: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] border border-tan/30 p-4 rounded-b-md w-full max-w-none',
      },
    },
  });

  // Sync content from prop if it changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

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

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    if (url === null) {
      return
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const addYoutube = () => {
    const url = window.prompt('Enter YouTube URL')

    if (url) {
      editor.commands.setYoutubeVideo({
        src: url,
        width: 640,
        height: 480,
      })
    }
  }

  const addEmbed = () => {
    const input = window.prompt('Paste an iframe embed code or URL (e.g. Google Maps, Calendly, etc.)')
    if (!input) return

    let src = input
    // If user pasted a full iframe tag, extract the src
    const match = input.match(/src="([^"]+)"/)
    if (match) {
      src = match[1]
    }

    editor.chain().focus().setIframe({ src }).run()
  }

  return (
    <div className="w-full flex flex-col">
      <div className="border border-tan/30 border-b-0 rounded-t-md p-2 bg-cream flex flex-wrap gap-1 sticky top-0 z-10 w-full overflow-x-auto">
         {/* History */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo size={18} />
        </ToolbarButton>
        
        <div className="w-[1px] bg-tan/30 mx-1 my-1"></div>

        {/* Text Styling */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}>
          <Bold size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}>
          <Italic size={18} />
        </ToolbarButton>
        
        <div className="w-[1px] bg-tan/30 mx-1 my-1"></div>

        {/* Headings */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })}>
          <Heading1 size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })}>
          <Heading2 size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })}>
          <Heading3 size={18} />
        </ToolbarButton>

        <div className="w-[1px] bg-tan/30 mx-1 my-1"></div>

        {/* Lists & Quotes */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')}>
          <List size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')}>
          <ListOrdered size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')}>
          <Quote size={18} />
        </ToolbarButton>

        <div className="w-[1px] bg-tan/30 mx-1 my-1"></div>

        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })}>
          <AlignLeft size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })}>
          <AlignCenter size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })}>
          <AlignRight size={18} />
        </ToolbarButton>

        <div className="w-[1px] bg-tan/30 mx-1 my-1"></div>

        {/* Insertions */}
        <ToolbarButton onClick={setLink} isActive={editor.isActive('link')}>
          <LinkIcon size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={handleImageUpload}>
          <ImageIcon size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={addYoutube}>
          <Video size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={addEmbed}>
          <CodeXml size={18} />
        </ToolbarButton>

      </div>
      <EditorContent editor={editor} className="bg-white" />
    </div>
  );
}
