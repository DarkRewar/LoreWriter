import type { Relationship, RelationshipType } from '../types'

export interface RelationshipTypeInfo {
  value: RelationshipType
  label: string
  color: string
  inverse: RelationshipType
}

export const RELATIONSHIP_TYPES: RelationshipTypeInfo[] = [
  { value: 'parent', label: 'parent de', color: '#7c9ef8', inverse: 'child' },
  { value: 'child', label: 'enfant de', color: '#7c9ef8', inverse: 'parent' },
  { value: 'sibling', label: 'fratrie avec', color: '#8fd3a8', inverse: 'sibling' },
  { value: 'spouse', label: 'conjoint·e de', color: '#f28fb2', inverse: 'spouse' },
  { value: 'partner', label: 'partenaire de', color: '#f28fb2', inverse: 'partner' },
  { value: 'family', label: 'famille avec', color: '#c9a2f5', inverse: 'family' },
  { value: 'friend', label: 'ami·e avec', color: '#5ec8d8', inverse: 'friend' },
  { value: 'ally', label: 'allié·e avec', color: '#8fd3a8', inverse: 'ally' },
  { value: 'acquaintance', label: 'connaissance de', color: '#9aa7bd', inverse: 'acquaintance' },
  { value: 'colleague', label: 'collègue avec', color: '#e8c268', inverse: 'colleague' },
  { value: 'mentor', label: 'mentor de', color: '#f0a35e', inverse: 'student' },
  { value: 'student', label: 'élève de', color: '#f0a35e', inverse: 'mentor' },
  { value: 'rival', label: 'rival·e de', color: '#e07a6a', inverse: 'rival' },
  { value: 'enemy', label: 'ennemi·e de', color: '#d9534f', inverse: 'enemy' },
  { value: 'other', label: 'autre relation avec', color: '#9aa7bd', inverse: 'other' },
]

const FALLBACK = RELATIONSHIP_TYPES[RELATIONSHIP_TYPES.length - 1]

export function relationshipTypeInfo(t: RelationshipType): RelationshipTypeInfo {
  return RELATIONSHIP_TYPES.find((r) => r.value === t) ?? FALLBACK
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
