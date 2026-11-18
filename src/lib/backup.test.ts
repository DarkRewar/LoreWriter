import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../db', () => ({ db: {} }))

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
})

import { lastBackupAt, markBackupDone, shouldBackupNow, type CloudConfig } from './cloud'
import { backupFileName } from './backup'

const cfg = (over: Partial<CloudConfig> = {}): CloudConfig => ({
  provider: 'webdav',
  baseUrl: 'https://dav.example.com/files/alice',
  username: 'alice',
  password: 'secret',
  folder: 'LoreWriter',
  enabled: true,
  ...over,
})

const HOUR = 60 * 60 * 1000

beforeEach(() => store.clear())

describe('shouldBackupNow', () => {
  it('désactivé par défaut (backupMode absent)', () => {
    expect(shouldBackupNow(cfg(), 'p1')).toBe(false)
  })

  it('jamais si la synchro est désactivée', () => {
    expect(shouldBackupNow(cfg({ enabled: false, backupMode: 'each-sync' }), 'p1')).toBe(false)
  })

  it('each-sync : toujours après une synchro réussie', () => {
    expect(shouldBackupNow(cfg({ backupMode: 'each-sync' }), 'p1')).toBe(true)
    markBackupDone('p1', Date.now())
    expect(shouldBackupNow(cfg({ backupMode: 'each-sync' }), 'p1')).toBe(true)
  })

  it('daily : oui la première fois, non si la dernière date de moins de 24 h, oui après 24 h', () => {
    const now = Date.now()
    expect(shouldBackupNow(cfg({ backupMode: 'daily' }), 'p1', now)).toBe(true)
    markBackupDone('p1', now - 2 * HOUR)
    expect(shouldBackupNow(cfg({ backupMode: 'daily' }), 'p1', now)).toBe(false)
    markBackupDone('p1', now - 25 * HOUR)
    expect(shouldBackupNow(cfg({ backupMode: 'daily' }), 'p1', now)).toBe(true)
  })

  it('lastBackupAt/markBackupDone : aller-retour via localStorage', () => {
    expect(lastBackupAt('p1')).toBeNull()
    markBackupDone('p1', 123456)
    expect(lastBackupAt('p1')).toBe(123456)
  })
})

describe('backupFileName', () => {
  it('nom horodaté et nettoyé', () => {
    const name = backupFileName('Mon projet: "lore"', new Date(2026, 10, 18, 9, 5).getTime())
    expect(name).toBe('Mon projet- -lore--20261118-0905.lore')
  })

  it('repli "projet" si le nom est vide', () => {
    expect(backupFileName('   ', Date.now())).toMatch(/^projet-\d{8}-\d{4}\.lore$/)
  })
})
