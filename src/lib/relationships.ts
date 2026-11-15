import type { Relationship, RelationshipType } from '../types'

export interface RelationshipTypeInfo {
  value: RelationshipType
  label: string
  color: string
  inverse: RelationshipType
}

export const RELATIONSHIP_TYPES: RelationshipTypeInfo[] = [
  { value: 'parent', label: 'parent de', color: '#8f4a1d', inverse: 'child' },
  { value: 'child', label: 'enfant de', color: '#8f4a1d', inverse: 'parent' },
  { value: 'sibling', label: 'fratrie avec', color: '#d9930d', inverse: 'sibling' },
  { value: 'spouse', label: 'conjoint·e de', color: '#d1345b', inverse: 'spouse' },
  { value: 'partner', label: 'partenaire de', color: '#d1345b', inverse: 'partner' },
  { value: 'family', label: 'famille avec', color: '#9b4d78', inverse: 'family' },
  { value: 'friend', label: 'ami·e avec', color: '#3f9d63', inverse: 'friend' },
  { value: 'ally', label: 'allié·e avec', color: '#2f8f83', inverse: 'ally' },
  { value: 'acquaintance', label: 'connaissance de', color: '#8d7d68', inverse: 'acquaintance' },
  { value: 'colleague', label: 'collègue avec', color: '#e07b39', inverse: 'colleague' },
  { value: 'mentor', label: 'mentor de', color: '#6b8e23', inverse: 'student' },
  { value: 'student', label: 'élève de', color: '#6b8e23', inverse: 'mentor' },
  { value: 'rival', label: 'rival·e de', color: '#cd5c5c', inverse: 'rival' },
  { value: 'enemy', label: 'ennemi·e de', color: '#a52a2a', inverse: 'enemy' },
  { value: 'other', label: 'autre relation avec', color: '#8d7d68', inverse: 'other' },
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
