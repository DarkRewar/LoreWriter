import type { Relationship, RelationshipType } from '../types'
import { tStandalone, type MessageKey } from '../i18n'

export interface RelationshipTypeInfo {
  value: RelationshipType
  label: string
  color: string
  inverse: RelationshipType
}

/** Définitions des types de lien (label traduit à l'appel via i18n — le type lui-même reste en anglais). */
const TYPE_DEFS: Array<Omit<RelationshipTypeInfo, 'label'>> = [
  { value: 'parent', color: '#8f4a1d', inverse: 'child' },
  { value: 'child', color: '#8f4a1d', inverse: 'parent' },
  { value: 'sibling', color: '#d9930d', inverse: 'sibling' },
  { value: 'spouse', color: '#d1345b', inverse: 'spouse' },
  { value: 'partner', color: '#d1345b', inverse: 'partner' },
  { value: 'family', color: '#9b4d78', inverse: 'family' },
  { value: 'friend', color: '#3f9d63', inverse: 'friend' },
  { value: 'ally', color: '#2f8f83', inverse: 'ally' },
  { value: 'acquaintance', color: '#8d7d68', inverse: 'acquaintance' },
  { value: 'colleague', color: '#e07b39', inverse: 'colleague' },
  { value: 'mentor', color: '#6b8e23', inverse: 'student' },
  { value: 'student', color: '#6b8e23', inverse: 'mentor' },
  { value: 'rival', color: '#cd5c5c', inverse: 'rival' },
  { value: 'enemy', color: '#a52a2a', inverse: 'enemy' },
  { value: 'other', color: '#8d7d68', inverse: 'other' },
]

export const RELATIONSHIP_TYPE_VALUES: RelationshipType[] = TYPE_DEFS.map((d) => d.value)

const FALLBACK = TYPE_DEFS[TYPE_DEFS.length - 1]

/** Infos d'un type de lien, avec le label traduit dans la langue active de l'interface. */
export function relationshipTypeInfo(t: RelationshipType): RelationshipTypeInfo {
  const def = TYPE_DEFS.find((d) => d.value === t) ?? FALLBACK
  return { ...def, label: tStandalone(`relations.types.${def.value}` as MessageKey) }
}

/** Vrai si la relation existe déjà (même paire non ordonnée + même type). */
export function isDuplicateRelationship(
  existing: Array<Pick<Relationship, 'id' | 'sourceId' | 'targetId' | 'type'>>,
  sourceId: string,
  targetId: string,
  type: RelationshipType,
  ignoreId?: string,
): boolean {
  return existing.some(
    (r) =>
      r.id !== ignoreId &&
      r.type === type &&
      ((r.sourceId === sourceId && r.targetId === targetId) ||
        (r.sourceId === targetId && r.targetId === sourceId)),
  )
}
