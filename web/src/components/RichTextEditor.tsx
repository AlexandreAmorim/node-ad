import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  ImageIcon,
  Link2,
  Undo2,
  Redo2,
  Heading2,
} from 'lucide-react'

import { uploadImagem } from '@/api/uploads'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MAX_MB = 20

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Descreva o problema…',
  className,
  minHeight = '160px',
}: RichTextEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadErro, setUploadErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        allowBase64: false,
        HTMLAttributes: { class: 'max-w-full h-auto rounded-md my-2' },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-ink underline' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          'prose-chamado focus:outline-none min-h-[120px] px-3 py-2 text-sm text-ink',
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    const atual = editor.getHTML()
    const normalizado = atual === '<p></p>' ? '' : atual
    if ((value || '') !== normalizado && value !== atual) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value, editor])

  const inserirImagem = useCallback(
    async (file: File) => {
      setUploadErro(null)
      if (file.size > MAX_MB * 1024 * 1024) {
        setUploadErro(`Imagem excede ${MAX_MB} MB`)
        return
      }
      if (!file.type.startsWith('image/')) {
        setUploadErro('Apenas imagens são permitidas')
        return
      }
      setEnviando(true)
      try {
        const { urlAbsoluta } = await uploadImagem(file)
        editor?.chain().focus().setImage({ src: urlAbsoluta, alt: file.name }).run()
      } catch (e) {
        setUploadErro(e instanceof Error ? e.message : 'Falha no upload')
      } finally {
        setEnviando(false)
      }
    },
    [editor],
  )

  if (!editor) return null

  return (
    <div className={cn('overflow-hidden rounded-md border border-line bg-card', className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-paper px-1.5 py-1">
        <ToolbarBtn
          title="Negrito"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Itálico"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Título"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Lista"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Lista numerada"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Link"
          active={editor.isActive('link')}
          onClick={() => {
            const url = window.prompt('URL do link')
            if (!url) return
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
          }}
        >
          <Link2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title={`Inserir imagem (máx. ${MAX_MB} MB)`}
          disabled={enviando}
          onClick={() => inputRef.current?.click()}
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <span className="mx-1 h-4 w-px bg-line" />
        <ToolbarBtn title="Desfazer" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Refazer" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        {enviando && (
          <span className="ml-2 text-[11px] text-muted">Enviando imagem…</span>
        )}
      </div>

      <div
        style={{ minHeight }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files?.[0]
          if (file) void inserirImagem(file)
        }}
      >
        <EditorContent editor={editor} />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/bmp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void inserirImagem(file)
        }}
      />

      {uploadErro && (
        <p className="border-t border-danger/30 bg-danger/5 px-3 py-1.5 text-xs text-danger">
          {uploadErro}
        </p>
      )}
      <p className="border-t border-line px-3 py-1 text-[10.5px] text-muted">
        Formatação de texto · imagens até {MAX_MB} MB (JPEG, PNG, GIF, WebP)
      </p>
    </div>
  )
}

function ToolbarBtn({
  children,
  onClick,
  active,
  disabled,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={title}
      disabled={disabled}
      className={cn('h-7 w-7', active && 'bg-ink/10 text-ink')}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
