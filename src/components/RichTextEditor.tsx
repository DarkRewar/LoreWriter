import { useEffect, useMemo, type ReactNode } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { buildMentionExtension } from '../lib/tiptapMention'
import { useProjectId } from '../hooks'
import { useI18n } from '../i18n'
import type { MentionRef } from '../lib/mentions'

function ToolbarButton({
  active,
  disabled,
  onClick,
  className,
  title,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  className?: string
  title: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`tb-btn${className ? ` ${className}` : ''}${active ? ' active' : ''}`}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  )
}

function ToolbarSeparator() {
  return <span className="tb-sep" aria-hidden="true" />
}

export function RichTextEditor({
  content,
  onUpdate,
  placeholder,
  footer,
  compact = false,
  mentions,
}: {
  content: string
  onUpdate: (html: string) => void
  placeholder?: string
  footer?: ReactNode
  /** Mode compact : sans barre d'outils (ex. répliques de dialogue). */
  compact?: boolean
  /** Active les mentions « @ » ; retourne la liste des entités référençables. */
  mentions?: () => MentionRef[]
}) {
  const projectId = useProjectId()
  const { t } = useI18n()
  const mentionExt = useMemo(
    () => (mentions ? buildMentionExtension(mentions, projectId) : null),
    [mentions, projectId],
  )
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? t('editor.placeholder') }),
      ...(mentionExt ? [mentionExt] : []),
    ],
    content,
    onUpdate: ({ editor: ed }) => onUpdate(ed.getHTML()),
  }, [mentionExt, t])

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false)
    }
  }, [content, editor])

  if (!editor) return null

  return (
    <div className={`rich-editor${compact ? ' compact' : ''}`}>
      {!compact && (
      <div className="rich-toolbar" role="toolbar" aria-label={t('editor.toolbar')}>
        <ToolbarButton
          className="tb-b"
          title={t('editor.bold')}
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          className="tb-i"
          title={t('editor.italic')}
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          className="tb-s"
          title={t('editor.strike')}
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          S
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton
          title={t('editor.h2')}
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title={t('editor.h3')}
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton
          title={t('editor.bullet')}
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • Liste
        </ToolbarButton>
        <ToolbarButton
          title={t('editor.ordered')}
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. Liste
        </ToolbarButton>
        <ToolbarButton
          title={t('editor.quote')}
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          ❝
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton
          title={t('editor.clear')}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          ✕
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton title={t('editor.undo')} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          ↶
        </ToolbarButton>
        <ToolbarButton title={t('editor.redo')} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          ↷
        </ToolbarButton>
      </div>
      )}
      <EditorContent editor={editor} className="rich-content" />
      {footer && <div className="rich-status">{footer}</div>}
    </div>
  )
}
