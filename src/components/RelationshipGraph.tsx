import cytoscape from 'cytoscape'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { characterDisplayName, type Character, type Relationship } from '../types'
import { relationshipTypeInfo } from '../lib/relationships'

const stylesheet = [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      'background-color': '#fffdf7',
      'border-width': '2px',
      'border-color': '#d3bf9d',
      color: '#3c2f22',
      'font-size': '11px',
      'text-wrap': 'wrap',
      'text-max-width': '110px',
      width: '110px',
      height: '44px',
      shape: 'round-rectangle',
      padding: '8px',
    },
  },
  {
    selector: 'node:selected',
    style: { 'border-color': '#c05f3c', 'border-width': '3px' },
  },
  {
    selector: 'edge',
    style: {
      label: 'data(label)',
      width: '2px',
      'line-color': 'data(color)',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': 'data(color)',
      'arrow-scale': 1.2,
      'curve-style': 'bezier',
      color: '#8b7a63',
      'font-size': '9px',
      'text-background-color': '#fffdf7',
      'text-background-opacity': 0.8,
      'text-background-padding': '2px',
    },
  },
] as unknown as cytoscape.StylesheetStyle[]

interface SavedPos {
  id: string
  x: number
  y: number
}

const layoutKey = (projectId: string) => `lorewriter:graph-layout:${projectId}`

function loadLayout(projectId: string): SavedPos[] {
  try {
    const raw = localStorage.getItem(layoutKey(projectId))
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? (parsed as SavedPos[]) : []
  } catch {
    return []
  }
}

function saveLayout(projectId: string, cy: cytoscape.Core): void {
  const positions: SavedPos[] = []
  cy.nodes().forEach((n) => {
    const p = n.position()
    positions.push({ id: n.id(), x: p.x, y: p.y })
  })
  try {
    localStorage.setItem(layoutKey(projectId), JSON.stringify(positions))
  } catch {
    // stockage plein ou indisponible : on ignore, le layout restera déterministe
  }
}

export function RelationshipGraph({
  characters,
  relationships,
  projectId,
}: {
  characters: Character[]
  relationships: Relationship[]
  projectId: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!containerRef.current) return
    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: stylesheet,
      layout: { name: 'grid' },
      wheelSensitivity: 0.3,
    })
    cy.on('tap', 'node', (evt) => {
      navigate(`/projects/${projectId}/characters/${evt.target.id()}`)
    })
    cy.on('dragfree', 'node', () => saveLayout(projectId, cy))
    cy.on('layoutstop', () => saveLayout(projectId, cy))
    cyRef.current = cy
    return () => {
      cy.destroy()
      cyRef.current = null
    }
  }, [projectId, navigate])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    const saved = new Map(loadLayout(projectId).map((p) => [p.id, p]))
    const allSaved = characters.length > 0 && characters.every((c) => saved.has(c.id))

    const nodes: cytoscape.ElementDefinition[] = characters.map((c, i) => {
      const el: cytoscape.ElementDefinition = {
        data: {
          id: c.id,
          label: characterDisplayName(c) + (c.nickname ? `\n« ${c.nickname} »` : ''),
        },
      }
      const p = saved.get(c.id)
      if (p) {
        el.position = { x: p.x, y: p.y }
      } else if (!allSaved) {
        // Position initiale déterministe (cercle) : le rendu ne change plus d'un rafraîchissement à l'autre.
        const angle = (2 * Math.PI * i) / Math.max(characters.length, 1)
        const radius = 80 + 30 * characters.length
        el.position = { x: radius * Math.cos(angle), y: radius * Math.sin(angle) }
      }
      return el
    })

    const edges: cytoscape.ElementDefinition[] = relationships
      .filter((r) => characters.some((c) => c.id === r.sourceId) && characters.some((c) => c.id === r.targetId))
      .map((r) => {
        const info = relationshipTypeInfo(r.type)
        return {
          data: {
            id: r.id,
            source: r.sourceId,
            target: r.targetId,
            label: r.label || info.label,
            color: info.color,
          },
        }
      })

    cy.elements().remove()
    cy.add([...nodes, ...edges])
    const layout: cytoscape.LayoutOptions = allSaved
      ? { name: 'preset' }
      : ({ name: 'cose', animate: false, randomize: false, nodeRepulsion: 9000, idealEdgeLength: 150, padding: 30 } as cytoscape.LayoutOptions)
    cy.layout(layout).run()
  }, [characters, relationships, projectId])

  if (characters.length === 0) {
    return <p className="muted">Créez d'abord des personnages pour voir le diagramme.</p>
  }
  return <div ref={containerRef} className="graph-container" />
}
