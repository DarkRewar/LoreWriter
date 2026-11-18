import { describe, expect, it } from 'vitest'
import {
  b64encodeUnicode,
  cloudBaseFileUrl,
  cloudChapterFileUrl,
  cloudChaptersDirUrl,
  cloudDialogueFileUrl,
  cloudDialoguesDirUrl,
  cloudFilePath,
  cloudProjectDirUrl,
  parsePropfindHrefs,
  type CloudConfig,
} from './cloud'

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

describe('chemins multi-fichiers', () => {
  it('construit dossier, base, chapitres et dialogues', () => {
    expect(cloudProjectDirUrl(cfg(), 'p1')).toBe(
      'https://cloud.example.com/remote.php/dav/files/alice/LoreWriter/lorewriter/p1/',
    )
    expect(cloudBaseFileUrl(cfg(), 'p1')).toBe(
      'https://cloud.example.com/remote.php/dav/files/alice/LoreWriter/lorewriter/p1/project.json',
    )
    expect(cloudChaptersDirUrl(cfg(), 'p1')).toBe(
      'https://cloud.example.com/remote.php/dav/files/alice/LoreWriter/lorewriter/p1/chapters/',
    )
    expect(cloudDialoguesDirUrl(cfg(), 'p1')).toBe(
      'https://cloud.example.com/remote.php/dav/files/alice/LoreWriter/lorewriter/p1/dialogues/',
    )
    expect(cloudChapterFileUrl(cfg(), 'p1', 'ch 1')).toBe(
      'https://cloud.example.com/remote.php/dav/files/alice/LoreWriter/lorewriter/p1/chapters/ch%201.md',
    )
    expect(cloudDialogueFileUrl(cfg(), 'p1', 's1')).toBe(
      'https://cloud.example.com/remote.php/dav/files/alice/LoreWriter/lorewriter/p1/dialogues/s1.json',
    )
  })
})

describe('parsePropfindHrefs', () => {
  const dir = 'https://cloud.example.com/dav/LoreWriter/lorewriter/p1/chapters/'
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:href>/dav/LoreWriter/lorewriter/p1/chapters/</d:href>
    <d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat>
  </d:response>
  <d:response>
    <d:href>/dav/LoreWriter/lorewriter/p1/chapters/ch1.md</d:href>
    <d:propstat><d:prop><d:resourcetype/></d:prop></d:propstat>
  </d:response>
  <d:response>
    <d:href>https://cloud.example.com/dav/LoreWriter/lorewriter/p1/chapters/ch%202.md</d:href>
    <d:propstat><d:prop><d:resourcetype/></d:prop></d:propstat>
  </d:response>
  <d:response>
    <d:href>/dav/LoreWriter/lorewriter/p2/chapters/x.md</d:href>
    <d:propstat><d:prop><d:resourcetype/></d:prop></d:propstat>
  </d:response>
</d:multistatus>`

  it('liste uniquement les fichiers enfants du dossier, décodés', () => {
    expect(parsePropfindHrefs(xml, dir)).toEqual(['ch1.md', 'ch 2.md'])
  })

  it('retourne une liste vide pour une URL invalide', () => {
    expect(parsePropfindHrefs(xml, '://oops')).toEqual([])
  })

  it('parse une vraie réponse multistatus style Nextcloud (préfixes d:, propstat, hrefs encodés)', () => {
    const dir = 'https://cloud.example.com/remote.php/dav/files/alice/LoreWriter/lorewriter/p1/chapters/'
    const nextcloudXml = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:s="http://sabredav.org/ns" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:response>
    <d:href>/remote.php/dav/files/alice/LoreWriter/lorewriter/p1/chapters/</d:href>
    <d:propstat>
      <d:prop>
        <d:resourcetype><d:collection/></d:resourcetype>
        <d:getlastmodified>Mon, 16 Nov 2026 10:00:00 GMT</d:getlastmodified>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
  <d:response>
    <d:href>/remote.php/dav/files/alice/LoreWriter/lorewriter/p1/chapters/ch1.md</d:href>
    <d:propstat>
      <d:prop><d:resourcetype/><d:getcontentlength>112</d:getcontentlength></d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
  <d:response>
    <d:href>/remote.php/dav/files/alice/LoreWriter/lorewriter/p1/chapters/ch%202%20%C3%A9t%C3%A9.md</d:href>
    <d:propstat>
      <d:prop><d:resourcetype/></d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>`
    expect(parsePropfindHrefs(nextcloudXml, dir)).toEqual(['ch1.md', 'ch 2 été.md'])
  })

  it('parse aussi une réponse sans préfixe de namespace (rclone/dufs)', () => {
    const dir = 'https://cloud.example.com/LoreWriter/lorewriter/p1/dialogues/'
    const plainXml = `<?xml version="1.0" encoding="utf-8"?>
<multistatus xmlns="DAV:">
  <response><href>/LoreWriter/lorewriter/p1/dialogues/</href></response>
  <response><href>/LoreWriter/lorewriter/p1/dialogues/s1.json</href></response>
</multistatus>`
    expect(parsePropfindHrefs(plainXml, dir)).toEqual(['s1.json'])
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
