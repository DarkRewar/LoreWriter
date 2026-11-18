import type { ChangeEvent } from 'react'
import { useI18n } from '../i18n'

export function PortraitPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n()
  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const max = 256
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      onChange(canvas.toDataURL('image/jpeg', 0.85))
      URL.revokeObjectURL(url)
    }
    img.src = url
    e.target.value = ''
  }

  return (
    <div className="portrait-picker">
      {value ? (
        <img src={value} alt={t('portrait.alt')} className="portrait-preview" />
      ) : (
        <div className="portrait-preview portrait-placeholder">🖼️</div>
      )}
      <div className="portrait-actions">
        <label className="btn">
          {t('portrait.choose')}
          <input type="file" accept="image/*" hidden onChange={onFile} />
        </label>
        {value && (
          <button type="button" className="btn btn-danger" onClick={() => onChange('')}>
            {t('portrait.remove')}
          </button>
        )}
      </div>
    </div>
  )
}
