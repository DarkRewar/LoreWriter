import type { Chapter } from '../types'

/**
 * Conversion bidirectionnelle HTML <-> Markdown, limitée au sous-ensemble
 * produit par l'éditeur riche (TipTap) : paragraphes, titres h1-h6, gras,
 * italique, barré, code, listes à puces/numérotées, citations, sauts de
 * ligne et filets. Fonctionne sans DOM (utilisable en test Node).
 */

interface HtmlNode {
  tag: string
  children: HtmlNode[]
  text?: string
}

const VOID_TAGS = new Set(['br', 'hr', 'img', 'input'])

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
}

function parseHtmlFragment(html: string): HtmlNode[] {
  const root: HtmlNode = { tag: '#root', children: [] }
  const stack: HtmlNode[] = [root]
  const tokens = html.match(/<[^>]*>|[^<]+/g) ?? []
  for (const tok of tokens) {
    if (tok.startsWith('</')) {
      const tag = tok.slice(2, -1).trim().toLowerCase()
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) {
          stack.length = i
          break
        }
      }
    } else if (tok.startsWith('<')) {
      const selfClose = tok.endsWith('/>')
      const m = /^<([a-zA-Z][a-zA-Z0-9]*)/.exec(tok)
      const tag = m ? m[1].toLowerCase() : 'span'
      const el: HtmlNode = { tag, children: [] }
      stack[stack.length - 1].children.push(el)
      if (!selfClose && !VOID_TAGS.has(tag)) stack.push(el)
    } else {
      stack[stack.length - 1].children.push({ tag: '#text', children: [], text: decodeEntities(tok) })
    }
  }
  return root.children
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Échappe les caractères spéciaux markdown dans un texte brut. */
function escapeInlineText(s: string): string {
  return s.replace(/([\\`*_[\]~<>|#])/g, '\\$1')
}

/** Échappe un début de ligne qui serait sinon relu comme un bloc markdown. */
function fixLineStart(line: string): string {
  return line.replace(/^(\d+)([.)])(\s|$)/, '$1\\$2$3').replace(/^([-+])(\s|$)/, '\\$1$2')
}

function inlineMd(nodes: HtmlNode[]): string {
  let out = ''
  for (const n of nodes) {
    if (n.tag === '#text') {
      out += escapeInlineText(n.text ?? '')
    } else if (n.tag === 'br') {
      out += '\n'
    } else if (n.tag === 'strong' || n.tag === 'b') {
      const inner = inlineMd(n.children)
      out += inner ? `**${inner}**` : ''
    } else if (n.tag === 'em' || n.tag === 'i') {
      const inner = inlineMd(n.children)
      out += inner ? `*${inner}*` : ''
    } else if (n.tag === 's' || n.tag === 'strike' || n.tag === 'del') {
      const inner = inlineMd(n.children)
      out += inner ? `~~${inner}~~` : ''
    } else if (n.tag === 'code') {
      const inner = inlineMd(n.children).replace(/`/g, '')
      out += inner ? `\`${inner}\`` : ''
    } else {
      out += inlineMd(n.children)
    }
  }
  return out
}

function listItemMd(li: HtmlNode): string {
  const inlineParts: HtmlNode[] = []
  const subBlocks: string[] = []
  for (const c of li.children) {
    if (c.tag === 'ul' || c.tag === 'ol') subBlocks.push(listMd(c))
    else if (c.tag === 'p') {
      const t = inlineMd(c.children).trim()
      if (t) subBlocks.push(t)
    } else inlineParts.push(c)
  }
  const first = inlineMd(inlineParts).trim()
  const body = [first, ...subBlocks.filter(Boolean)].join('\n')
  return body
    .split('\n')
    .map((l, i) => (i === 0 ? l : `  ${l}`))
    .join('\n')
}

function listMd(n: HtmlNode): string {
  const ordered = n.tag === 'ol'
  const items: string[] = []
  let i = 1
  for (const li of n.children) {
    if (li.tag !== 'li') continue
    const marker = ordered ? `${i++}. ` : '- '
    const lines = listItemMd(li).split('\n')
    items.push(marker + lines[0] + lines.slice(1).map((l) => `  ${l}`).join('\n'))
  }
  return items.join('\n')
}

function blockMd(nodes: HtmlNode[]): string {
  const blocks: string[] = []
  let para: HtmlNode[] = []
  const flushPara = () => {
    const text = inlineMd(para).trim()
    para = []
    if (text) blocks.push(text.split('\n').map(fixLineStart).join('\n'))
  }
  for (const n of nodes) {
    if (n.tag === '#text' || n.tag === 'br') {
      para.push(n)
      continue
    }
    const hm = /^h([1-6])$/.exec(n.tag)
    if (n.tag === 'p') {
      flushPara()
      const t = inlineMd(n.children).trim()
      if (t) blocks.push(t.split('\n').map(fixLineStart).join('\n'))
    } else if (hm) {
      flushPara()
      const t = inlineMd(n.children).trim()
      if (t) blocks.push(`${'#'.repeat(Number(hm[1]))} ${t.split('\n').map(fixLineStart).join('\n')}`)
    } else if (n.tag === 'blockquote') {
      flushPara()
      const inner = blockMd(n.children).trim()
      if (inner) blocks.push(inner.split('\n').map((l) => (l ? `> ${l}` : '>')).join('\n'))
    } else if (n.tag === 'ul' || n.tag === 'ol') {
      flushPara()
      const l = listMd(n)
      if (l) blocks.push(l)
    } else if (n.tag === 'hr') {
      flushPara()
      blocks.push('---')
    } else if (n.tag === 'pre') {
      flushPara()
      const code = n.children.map((c) => c.text ?? inlineMd(c.children)).join('')
      blocks.push(`\`\`\`\n${code.replace(/\n+$/, '')}\n\`\`\``)
    } else {
      flushPara()
      const inner = blockMd(n.children).trim()
      if (inner) blocks.push(inner)
    }
  }
  flushPara()
  return blocks.join('\n\n')
}

export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return ''
  return blockMd(parseHtmlFragment(html)).replace(/\n{3,}/g, '\n\n').trim()
}

/* ---------- Markdown -> HTML ---------- */

const BLOCK_START = /^(#{1,6}\s|>|---\s*$|\*\*\*\s*$|___\s*$|\s*[-*+]\s|\s*\d+[.)]\s)/

function inlineHtml(text: string): string {
  let s = text.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, (_, c) => `\u0000${c.charCodeAt(0)}\u0000`)
  s = escapeHtml(s)
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  s = s.replace(/(\*\*|__)(.+?)\1/g, '<strong>$2</strong>')
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
  s = s.replace(/(?<![\w])_([^_\n]+)_(?![\w])/g, '<em>$1</em>')
  s = s.replace(/~~(.+?)~~/g, '<s>$1</s>')
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
  s = s.replace(/\u0000(\d+)\u0000/g, (_, d) => escapeHtml(String.fromCodePoint(Number(d))))
  return s
}

export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const blocks: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1].length
      blocks.push(`<h${level}>${inlineHtml(h[2])}</h${level}>`)
      i++
      continue
    }
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push('<hr>')
      i++
      continue
    }
    if (/^>\s?/.test(line)) {
      const qlines: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        qlines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push(`<blockquote><p>${qlines.map(inlineHtml).join('<br>')}</p></blockquote>`)
      continue
    }
    const ul = /^\s*[-*+]\s+/.exec(line)
    if (ul) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''))
        i++
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !BLOCK_START.test(lines[i])) {
          items[items.length - 1] += '\n' + lines[i].trim()
          i++
        }
      }
      blocks.push(`<ul>${items.map((it) => `<li>${inlineHtml(it)}</li>`).join('')}</ul>`)
      continue
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''))
        i++
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !BLOCK_START.test(lines[i])) {
          items[items.length - 1] += '\n' + lines[i].trim()
          i++
        }
      }
      blocks.push(`<ol>${items.map((it) => `<li>${inlineHtml(it)}</li>`).join('')}</ol>`)
      continue
    }
    const plines: string[] = []
    while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i])) {
      plines.push(lines[i])
      i++
    }
    blocks.push(`<p>${plines.map(inlineHtml).join('<br>')}</p>`)
  }
  return blocks.join('\n')
}

/* ---------- Fichier chapitre (.md avec frontmatter) ---------- */

/** Sérialise un chapitre en fichier Markdown dédié (frontmatter + contenu). */
export function serializeChapterFile(ch: Chapter): string {
  const meta = [
    `id: ${JSON.stringify(ch.id)}`,
    `projectId: ${JSON.stringify(ch.projectId)}`,
    `title: ${JSON.stringify(ch.title)}`,
    `order: ${String(ch.order)}`,
    `createdAt: ${String(ch.createdAt)}`,
    `updatedAt: ${String(ch.updatedAt)}`,
  ]
  return `---\n${meta.join('\n')}\n---\n\n${htmlToMarkdown(ch.content)}\n`
}

/** Relit un fichier Markdown de chapitre (frontmatter + contenu). */
export function parseChapterFile(text: string): Chapter {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  if (!m) throw new Error('Fichier de chapitre invalide : frontmatter manquant.')
  const meta: Record<string, string> = {}
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
  const str = (key: string): string => {
    const v = meta[key]
    if (v === undefined) return ''
    if (v.startsWith('"')) {
      try {
        return JSON.parse(v) as string
      } catch {
        return v
      }
    }
    return v
  }
  const num = (key: string): number => {
    const n = Number(meta[key])
    return Number.isFinite(n) ? n : 0
  }
  const id = str('id')
  if (!id) throw new Error('Fichier de chapitre invalide : id manquant.')
  return {
    id,
    projectId: str('projectId'),
    title: str('title'),
    order: num('order'),
    content: markdownToHtml(text.slice(m[0].length)),
    createdAt: num('createdAt'),
    updatedAt: num('updatedAt'),
  }
}
