import type { MetadataField } from '../types'
import { newId } from '../lib/ids'

export function MetadataEditor({
  value,
  onChange,
}: {
  value: MetadataField[]
  onChange: (v: MetadataField[]) => void
}) {
  const update = (id: string, patch: Partial<MetadataField>) =>
    onChange(value.map((m) => (m.id === id ? { ...m, ...patch } : m)))

  return (
    <div className="metadata-editor">
      {value.map((m) => (
        <div className="metadata-row" key={m.id}>
          <input
            placeholder="Clé (ex. : métier, origine…)"
            value={m.key}
            onChange={(e) => update(m.id, { key: e.target.value })}
          />
          <input
            placeholder="Valeur"
            value={m.value}
            onChange={(e) => update(m.id, { value: e.target.value })}
          />
          <button
            type="button"
            className="btn-icon"
            aria-label="Supprimer cette métadonnée"
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
        + Ajouter une métadonnée
      </button>
    </div>
  )
}
