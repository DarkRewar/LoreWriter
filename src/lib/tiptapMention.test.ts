import { describe, expect, it } from 'vitest'
import { getSchema } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import type { Extension } from '@tiptap/core'
import { buildMentionExtension } from './tiptapMention'

describe('extension mention', () => {
  it('enregistre le nœud mention (avec attribut kind) dans le schéma', () => {
    const schema = getSchema([StarterKit, buildMentionExtension(() => [], 'p1')])
    expect(schema.nodes.mention).toBeTruthy()
    expect(Object.keys(schema.nodes.mention!.spec.attrs ?? {})).toEqual(expect.arrayContaining(['id', 'kind', 'label']))
  })

  it('conserve le plugin de suggestion « @ » du parent + ajoute le plugin de clic (régression)', () => {
    const ext = buildMentionExtension(() => [], 'p1') as Extension
    // contexte façon tiptap : this.parent = méthode addProseMirrorPlugins de l'extension parente
    const parent = (ext as unknown as { parent: Extension }).parent
    const parentPlugins = (
      parent.config.addProseMirrorPlugins as unknown as (this: unknown) => unknown[]
    ).call({ options: { ...parent.options, suggestion: ext.options.suggestion } })
    expect(parentPlugins.length).toBeGreaterThan(0) // le plugin de suggestion existe côté parent
    const all = (ext.config.addProseMirrorPlugins as unknown as (this: unknown) => unknown[]).call({
      options: ext.options,
      parent: () => parentPlugins,
    })
    // parent (suggestion @) + notre plugin de clic = au moins 2, et le plugin parent est conservé
    expect(all.length).toBe(parentPlugins.length + 1)
    expect(all.slice(0, parentPlugins.length)).toEqual(parentPlugins)
  })

  it('configure() garde la suggestion (char @) après le extend', () => {
    const ext = buildMentionExtension(() => [], 'p1') as Extension
    expect(ext.options.suggestion).toBeTruthy()
    expect((ext.options.suggestion as { char?: string }).char).toBe('@')
    expect(typeof (ext.options.suggestion as { render?: unknown }).render).toBe('function')
  })
})
