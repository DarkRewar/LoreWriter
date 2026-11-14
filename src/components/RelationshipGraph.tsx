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
      'background-color': '#1d2b4a',
      'border-width': '2px',
      'border-color': '#3b5b8a',
      color: '#e8ecf4',
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
    style: { 'border-color': '#e8c268', 'border-width': '3px' },
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
      color: '#9aa7bd',
      'font-size': '9px',
      'text-background-color': '#0b1020',
      'text-background-opacity': 0.8,
      'text-background-padding': '2px',
    },
  },
] as unknown as cytoscape.StylesheetStyle[]

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
      const id = evt.target.id()
      navigate(`/projects/${projectId}/characters/${id}`)
    })
    cyRef.current = cy
    return () => {
      cy.destroy()
      cyRef.current = null
    }
  }, [projectId, navigate])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    const nodes: cytoscape.ElementDefinition[] = characters.map((c) => ({
      data: {
        id: c.id,
        label: characterDisplayName(c) + (c.nickname ? `\n« ${c.nickname} »` : ''),
      },
    }))
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
    cy.layout({ name: 'cose', animate: true, nodeRepulsion: 9000, idealEdgeLength: 150, padding: 30 } as cytoscape.LayoutOptions).run()
  }, [characters, relationships])

  if (characters.length === 0) {
    return <p className="muted">Créez d'abord des personnages pour voir le diagramme.</p>
  }
  return <div ref={containerRef} className="graph-container" />
}
