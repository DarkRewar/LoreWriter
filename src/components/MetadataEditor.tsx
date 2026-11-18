import type { MetadataField } from '../types'
import { newId } from '../lib/ids'
import { useI18n } from '../i18n'

export function MetadataEditor({
  value,
  onChange,
}: {
  value: MetadataField[]
  onChange: (v: MetadataField[]) => void
}) {
  const { t } = useI18n()
  const update = (id: string, patch: Partial<MetadataField>) =>
    onChange(value.map((m) => (m.id === id ? { ...m, ...patch } : m)))

  return (
    <div className="metadata-editor">
      {value.map((m) => (
        <div className="metadata-row" key={m.id}>
          <input
            placeholder={t('metadata.keyPlaceholder')}
            value={m.key}
            onChange={(e) => update(m.id, { key: e.target.value })}
          />
          <input
            placeholder={t('metadata.valuePlaceholder')}
            value={m.value}
            onChange={(e) => update(m.id, { value: e.target.value })}
          />
          <button
            type="button"
            className="btn-icon"
            aria-label={t('metadata.removeAria')}
            onClick={() => onChange(value.filter((x) => x.id !== m.id))}
          >
            🗑
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn"
        onClick={() => onChange([...value, { id: newId(), key: '', value: '' }])}
      >
        {t('metadata.add')}
      </button>
    </div>
  )
}
