import { useState, type KeyboardEvent } from 'react'
import { useI18n } from '../i18n'

export function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const { t } = useI18n()
  const [draft, setDraft] = useState('')

  const commit = (raw: string) => {
    const t = raw.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setDraft('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(draft)
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div
      className="tag-input"
      onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.focus()}
    >
      {value.map((tag) => (
        <span key={tag} className="tag">
          {tag}
          <button type="button" aria-label={t('tag.removeAria', { tag })} onClick={() => onChange(value.filter((x) => x !== tag))}>
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        placeholder={value.length === 0 ? placeholder : ''}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
      />
    </div>
  )
}
