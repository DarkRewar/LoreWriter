import { describe, expect, it } from 'vitest'
import { computeAge, formatDateFr, parseBirthDate } from './age'

describe('parseBirthDate', () => {
  it('accepte une date valide', () => {
    expect(parseBirthDate('1990-05-17')?.toISOString()).toBe('1990-05-17T00:00:00.000Z')
  })

  it('rejette une date invalide', () => {
    expect(parseBirthDate('2021-02-30')).toBeNull()
    expect(parseBirthDate('17/05/1990')).toBeNull()
    expect(parseBirthDate('')).toBeNull()
  })
})

describe('computeAge', () => {
  const now = new Date(2026, 10, 14) // 14 novembre 2026

  it('calcule l\'âge révolu', () => {
    expect(computeAge('1990-05-17', now)).toBe(36)
  })

  it('décrémente si l\'anniversaire n\'est pas encore passé', () => {
    expect(computeAge('1990-12-25', now)).toBe(35)
  })

  it('gère le jour même de l\'anniversaire', () => {
    expect(computeAge('2000-11-14', now)).toBe(26)
  })

  it('retourne null si la date est invalide', () => {
    expect(computeAge('nimp', now)).toBeNull()
  })
})

describe('formatDateFr', () => {
  it('formate en français', () => {
    expect(formatDateFr('1990-05-17')).toBe('17 mai 1990')
    expect(formatDateFr('')).toBe('')
  })
})
