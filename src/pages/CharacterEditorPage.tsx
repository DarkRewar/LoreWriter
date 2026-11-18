import { useEffect, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../db'
import { useProjectId } from '../hooks'
import type { Character, MetadataField } from '../types'
import { newId } from '../lib/ids'
import { computeAge } from '../lib/age'
import { TagInput } from '../components/TagInput'
import { MetadataEditor } from '../components/MetadataEditor'
import { PortraitPicker } from '../components/PortraitPicker'
import { useI18n } from '../i18n'

interface FormState {
  firstName: string
  lastName: string
  nickname: string
  birthDate: string
  manualAge: string
  useManualAge: boolean
  role: string
  tags: string[]
  metadata: MetadataField[]
  description: string
  portrait: string
}

const emptyForm: FormState = {
  firstName: '',
  lastName: '',
  nickname: '',
  birthDate: '',
  manualAge: '',
  useManualAge: false,
  role: '',
  tags: [],
  metadata: [],
  description: '',
  portrait: '',
}

export default function CharacterEditorPage() {
  const { t } = useI18n()
  const projectId = useProjectId()
  const { characterId } = useParams()
  const isEdit = Boolean(characterId)
  const navigate = useNavigate()

  const existing = useLiveQuery(
    () => (characterId ? db.characters.get(characterId) : undefined),
    [characterId],
  )

  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(!isEdit)

  useEffect(() => {
    if (isEdit && existing) {
      setForm({
        firstName: existing.firstName,
        lastName: existing.lastName,
        nickname: existing.nickname,
        birthDate: existing.birthDate,
        manualAge: existing.manualAge !== null ? String(existing.manualAge) : '',
        useManualAge: existing.manualAge !== null && !existing.birthDate,
        role: existing.role,
        tags: existing.tags,
        metadata: existing.metadata,
        description: existing.description,
        portrait: existing.portrait,
      })
      setLoaded(true)
    }
  }, [isEdit, existing])

  if (isEdit && existing === null) {
    return (
      <div className="page">
        <p>{t('characters.notFound')}</p>
        <Link to={`/projects/${projectId}/characters`}>{t('characters.backToList')}</Link>
      </div>
    )
  }
  if (!loaded) return <div className="page">{t('common.loading')}</div>

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const computedAge = form.birthDate ? computeAge(form.birthDate) : null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.firstName.trim() && !form.lastName.trim() && !form.nickname.trim()) {
      setError(t('characterEditor.errorName'))
      return
    }
    const now = Date.now()
    const manualAge = form.useManualAge ? (form.manualAge.trim() ? Number(form.manualAge) : null) : null
    const record: Character = {
      id: characterId ?? newId(),
      projectId,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      nickname: form.nickname.trim(),
      birthDate: form.useManualAge ? '' : form.birthDate,
      manualAge: Number.isFinite(manualAge) ? manualAge : null,
      role: form.role.trim(),
      tags: form.tags,
      metadata: form.metadata.filter((m) => m.key.trim() || m.value.trim()),
      description: form.description.trim(),
      portrait: form.portrait,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await db.characters.put(record)
    await db.projects.update(projectId, { updatedAt: now })
    navigate(`/projects/${projectId}/characters/${record.id}`)
  }

  return (
    <div className="page">
      <h1>{isEdit ? t('characterEditor.editTitle') : t('characterEditor.newTitle')}</h1>
      <form onSubmit={submit} style={{ maxWidth: 760 }}>
        <div className="panel">
          <h2>{t('characterEditor.identity')}</h2>
          <label className="field">
            <span>{t('characterEditor.firstName')}</span>
            <input type="text" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder={t('characterEditor.firstNamePlaceholder')} />
          </label>
          <label className="field">
            <span>{t('characterEditor.lastName')}</span>
            <input type="text" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder={t('characterEditor.lastNamePlaceholder')} />
          </label>
          <label className="field">
            <span>{t('characterEditor.nickname')}</span>
            <input type="text" value={form.nickname} onChange={(e) => set('nickname', e.target.value)} placeholder={t('characterEditor.nicknamePlaceholder')} />
          </label>
          <label className="field">
            <span>{t('characterEditor.role')}</span>
            <input type="text" value={form.role} onChange={(e) => set('role', e.target.value)} placeholder={t('characterEditor.rolePlaceholder')} />
          </label>
          <label className="field">
            <span>{t('characterEditor.portrait')}</span>
            <PortraitPicker value={form.portrait} onChange={(v) => set('portrait', v)} />
          </label>
        </div>

        <div className="panel">
          <h2>{t('characterEditor.age')}</h2>
          <label className="field">
            <span>{t('characterEditor.birthDate')}</span>
            <input
              type="date"
              value={form.birthDate}
              disabled={form.useManualAge}
              onChange={(e) => set('birthDate', e.target.value)}
            />
          </label>
          {computedAge !== null && !form.useManualAge && (
            <p className="muted">{t('characterEditor.computedAge', { age: computedAge, s: computedAge > 1 ? 's' : '' })}</p>
          )}
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={form.useManualAge}
              onChange={(e) => set('useManualAge', e.target.checked)}
              style={{ width: 'auto' }}
            />
            <span>{t('characterEditor.manualAge')}</span>
          </label>
          {form.useManualAge && (
            <label className="field">
              <span>{t('characterEditor.ageField')}</span>
              <input
                type="number"
                min={0}
                max={1000}
                value={form.manualAge}
                onChange={(e) => set('manualAge', e.target.value)}
                placeholder={t('characterEditor.agePlaceholder')}
              />
            </label>
          )}
        </div>

        <div className="panel">
          <h2>{t('characterEditor.tags')}</h2>
          <TagInput value={form.tags} onChange={(v) => set('tags', v)} placeholder={t('characterEditor.tagsPlaceholder')} />
        </div>

        <div className="panel">
          <h2>{t('characterEditor.freeMetadata')}</h2>
          <MetadataEditor value={form.metadata} onChange={(v) => set('metadata', v)} />
        </div>

        <div className="panel">
          <h2>{t('characterEditor.notes')}</h2>
          <label className="field">
            <span>{t('characterEditor.descLabel')}</span>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder={t('characterEditor.descPlaceholder')} />
          </label>
        </div>

        {error && <p className="form-error">{error}</p>}
        <div className="btn-row">
          <button type="submit" className="btn btn-primary">
            {t('common.save')}
          </button>
          <Link className="btn" to={isEdit ? `/projects/${projectId}/characters/${characterId}` : `/projects/${projectId}/characters`}>
            {t('common.cancel')}
          </Link>
        </div>
      </form>
    </div>
  )
}
