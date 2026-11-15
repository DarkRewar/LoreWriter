import { characterDisplayName, type Character } from '../types'

export function CharacterAvatar({
  character,
  size = 40,
}: {
  character: Pick<Character, 'firstName' | 'lastName' | 'nickname' | 'portrait'>
  size?: number
}) {
  const name = characterDisplayName(character)
  if (character.portrait) {
    return <img src={character.portrait} alt={name} className="avatar" style={{ width: size, height: size }} />
  }
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) >>> 0
  const hue = hash % 360
  return (
    <span
      className="avatar avatar-initials"
      style={{ width: size, height: size, fontSize: size * 0.4, background: `hsl(${hue} 45% 32%)` }}
    >
      {initials || '?'}
    </span>
  )
}
