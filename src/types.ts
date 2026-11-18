export interface MetadataField {
  id: string
  key: string
  value: string
}

export interface Project {
  id: string
  name: string
  description: string
  createdAt: number
  updatedAt: number
}

export interface Character {
  id: string
  projectId: string
  firstName: string
  lastName: string
  nickname: string
  /** Date de naissance au format ISO 'YYYY-MM-DD', ou chaîne vide. */
  birthDate: string
  /** Âge saisi manuellement quand la date de naissance est inconnue. */
  manualAge: number | null
  role: string
  tags: string[]
  metadata: MetadataField[]
  description: string
  /** Portrait encodé en data URL, ou chaîne vide. */
  portrait: string
  createdAt: number
  updatedAt: number
}

export type RelationshipType =
  | 'parent'
  | 'child'
  | 'sibling'
  | 'spouse'
  | 'partner'
  | 'family'
  | 'friend'
  | 'ally'
  | 'acquaintance'
  | 'colleague'
  | 'mentor'
  | 'student'
  | 'rival'
  | 'enemy'
  | 'other'

export interface Relationship {
  id: string
  projectId: string
  sourceId: string
  targetId: string
  type: RelationshipType
  label: string
  createdAt: number
  updatedAt: number
}

export interface DialogueLine {
  id: string
  /** Identifiant du personnage qui parle, ou chaîne vide pour le narrateur. */
  characterId: string
  text: string
}

export interface DialogueScene {
  id: string
  projectId: string
  title: string
  description: string
  /** Intrigue à laquelle la scène est reliée, ou chaîne vide pour aucune. */
  plotId: string
  lines: DialogueLine[]
  createdAt: number
  updatedAt: number
}

export interface Novel {
  id: string
  projectId: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface Chapter {
  id: string
  projectId: string
  /** Roman auquel appartient le chapitre. */
  novelId: string
  title: string
  /** Contenu riche au format HTML (éditeur TipTap). */
  content: string
  order: number
  createdAt: number
  updatedAt: number
}

export interface WikiEntry {
  id: string
  projectId: string
  /** Intitulé de l'entrée (le mot du dictionnaire). */
  title: string
  /** Description riche au format HTML (éditeur TipTap), exportable en Markdown. */
  content: string
  createdAt: number
  updatedAt: number
}

export type PlotStatus = 'idea' | 'draft' | 'wip' | 'done'

export interface Plot {
  id: string
  projectId: string
  title: string
  synopsis: string
  status: PlotStatus
  tags: string[]
  characterIds: string[]
  createdAt: number
  updatedAt: number
}

export function characterDisplayName(
  c: Pick<Character, 'firstName' | 'lastName' | 'nickname'>,
): string {
  const full = [c.firstName.trim(), c.lastName.trim()].filter(Boolean).join(' ')
  return full || c.nickname.trim() || 'Sans nom'
}
