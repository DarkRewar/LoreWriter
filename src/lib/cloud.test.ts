import { describe, expect, it } from 'vitest'
import { b64encodeUnicode, cloudFilePath, type CloudConfig } from './cloud'

const cfg = (over: Partial<CloudConfig> = {}): CloudConfig => ({
  provider: 'webdav',
  baseUrl: 'https://cloud.example.com/remote.php/dav/files/alice/',
  username: 'alice',
  password: 'secret',
  folder: '/LoreWriter/',
  enabled: true,
  ...over,
})

describe('cloudFilePath', () => {
  it('joint base, dossier et fichier en normalisant les slashs', () => {
    expect(cloudFilePath(cfg(), 'p1')).toBe(
      'https://cloud.example.com/remote.php/dav/files/alice/LoreWriter/lorewriter/p1.json',
    )
  })

  it('encode les segments spéciaux', () => {
    expect(cloudFilePath(cfg({ folder: 'Mes dossiers' }), 'a b')).toContain('Mes%20dossiers')
    expect(cloudFilePath(cfg(), 'a b')).toContain('a%20b.json')
  })

  it('fonctionne sans dossier', () => {
    expect(cloudFilePath(cfg({ folder: '' }), 'p1')).toBe(
      'https://cloud.example.com/remote.php/dav/files/alice/lorewriter/p1.json',
    )
  })
})

describe('b64encodeUnicode', () => {
  it('encode comme Basic auth, y compris les accents', () => {
    expect(b64encodeUnicode('alice:secret')).toBe('YWxpY2U6c2VjcmV0')
    const accented = b64encodeUnicode('éàù:pw')
    const bytes = Uint8Array.from(atob(accented), (c) => c.charCodeAt(0))
    expect(new TextDecoder().decode(bytes)).toBe('éàù:pw')
  })
})
