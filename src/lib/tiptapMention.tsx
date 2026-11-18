import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { ReactRenderer, type Editor } from '@tiptap/react'
import Mention from '@tiptap/extension-mention'
import type { SuggestionProps } from '@tiptap/suggestion'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import { MENTION_KIND_LABELS, mentionHref, mentionRoute, parseMentionHref, searchMentions, type MentionKind, type MentionRef } from './mentions'

interface MentionAttrs {
  id: string
  kind: string
  label: string
}

type MentionSuggestionProps = SuggestionProps<MentionAttrs>

const toRef = (a: MentionAttrs): MentionRef => ({ id: a.id, kind: a.kind as MentionKind, label: a.label })

interface MentionListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

const MentionList = forwardRef<MentionListHandle, { suggestion: MentionSuggestionProps; hide: () => void }>(
  function MentionList({ suggestion, hide }, ref) {
  const items = suggestion.items.map(toRef)
  const [selected, setSelected] = useState(0)
  useEffect(() => setSelected(0), [suggestion.items])
  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (items.length === 0) return false
      if (event.key === 'ArrowUp') {
        setSelected((s) => (s + items.length - 1) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelected((s) => (s + 1) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        const item = items[selected]
        if (item) {
          suggestion.command({ id: item.id, kind: item.kind, label: item.label })
          hide()
        }
        return true
      }
      return false
    },
  }))
  if (items.length === 0) return null
  return (
    <div className="mention-list" role="listbox">
      {items.map((item, i) => (
        <button
          key={`${item.kind}/${item.id}`}
          type="button"
          role="option"
          aria-selected={i === selected}
          className={`mention-item${i === selected ? ' active' : ''}`}
          onClick={() => {
            suggestion.command({ id: item.id, kind: item.kind, label: item.label })
            hide()
          }}
          onMouseEnter={() => setSelected(i)}
        >
          <span className="mention-kind">{MENTION_KIND_LABELS[item.kind] ?? item.kind}</span>
          <span className="mention-label">@{item.label}</span>
        </button>
      ))}
    </div>
  )
})

/**
 * Extension TipTap « mention » : nœud inline cliquable (`<a href="mention://kind/id">@Label</a>`),
 * popup de suggestion au « @ » (top 3) et clic → navigation vers la page de l'entité.
 */
let currentProjectId = ''

const MentionWithKind = Mention.extend({
  addProseMirrorPlugins() {
    return [
      // indispensable : conserve le plugin de suggestion « @ » de l'extension Mention parente
      ...(this.parent?.() ?? []),
      new Plugin({
        key: new PluginKey('mention-click'),
        props: {
          handleClick: (_view, _pos, event) => {
            const target = event.target as HTMLElement | null
            const a = target?.closest?.('a[href^="mention://"]')
            if (!a) return false
            event.preventDefault()
            const parsed = parseMentionHref(a.getAttribute('href') ?? '')
            if (parsed) window.location.hash = mentionRoute(currentProjectId, parsed)
            return true
          },
        },
      }),
    ]
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      kind: {
        default: '',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-mention-kind') ?? '',
        renderHTML: (attrs: Record<string, unknown>) => ({ 'data-mention-kind': attrs.kind }),
      },
    }
  },
  parseHTML() {
    return [
      {
        tag: 'a[href^="mention://"]',
        getAttrs: (el: HTMLElement) => {
          const parsed = parseMentionHref(el.getAttribute('href') ?? '')
          const label = (el.textContent ?? '').replace(/^@/, '')
          return { id: parsed?.id ?? '', kind: parsed?.kind ?? '', label }
        },
      },
    ]
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'a',
      {
        ...HTMLAttributes,
        class: 'mention',
        href: mentionHref({ id: node.attrs.id as string, kind: node.attrs.kind as string }),
        'data-mention-id': node.attrs.id,
        'data-mention-label': node.attrs.label,
        title: `${MENTION_KIND_LABELS[node.attrs.kind as MentionKind] ?? (node.attrs.kind as string)} — cliquer pour ouvrir`,
      },
      `@${node.attrs.label as string}`,
    ]
  },
})

export function buildMentionExtension(getItems: () => MentionRef[], projectId: string) {
  currentProjectId = projectId
  return MentionWithKind.configure({
    HTMLAttributes: { class: 'mention' },
    suggestion: {
      char: '@',
      items: ({ query }) => searchMentions(getItems(), query, 3),
      render: () => {
        let component: ReactRenderer | null = null
        let popup: TippyInstance[] | null = null
        const clientRect = (props: MentionSuggestionProps) => () => props.clientRect?.() ?? new DOMRect()
        return {
          onStart: (props: MentionSuggestionProps) => {
            if (props.items.length === 0) return
            const hide = () => popup?.[0]?.hide()
            component = new ReactRenderer(MentionList, { props: { suggestion: props, hide }, editor: props.editor as Editor })
            popup = tippy(document.body, {
              getReferenceClientRect: clientRect(props),
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: 'manual',
              placement: 'bottom-start',
              theme: 'mention',
            }) as unknown as TippyInstance[]
          },
          onUpdate: (props: MentionSuggestionProps) => {
            if (props.items.length === 0) {
              popup?.[0]?.hide()
              return
            }
            component?.updateProps({ suggestion: props, hide: () => popup?.[0]?.hide() })
            popup?.[0]?.setProps({ getReferenceClientRect: clientRect(props) })
          },
          onKeyDown: (props: { event: KeyboardEvent }) => {
            if (props.event.key === 'Escape') {
              popup?.[0]?.hide()
              return true
            }
            const handle = component?.ref as MentionListHandle | undefined
            return handle ? handle.onKeyDown(props) : false
          },
          onExit: () => {
            popup?.[0]?.destroy()
            component?.destroy()
            popup = null
            component = null
          },
        }
      },
    },
  })
}
