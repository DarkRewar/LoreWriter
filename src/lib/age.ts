/** Valide et parse une date ISO 'YYYY-MM-DD' (retourne null si invalide). */
export function parseBirthDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return dt
}

/** Âge révolu à la date `now`, ou null si la date est invalide. */
export function computeAge(birthDateISO: string, now: Date = new Date()): number | null {
  const d = parseBirthDate(birthDateISO)
  if (!d) return null
  let age = now.getFullYear() - d.getUTCFullYear()
  const nowMonthDay = now.getMonth() * 100 + now.getDate()
  const birthMonthDay = d.getUTCMonth() * 100 + d.getUTCDate()
  if (nowMonthDay < birthMonthDay) age -= 1
  return age
}

/** Date ISO -> texte localisé (ex. « 17 mai 1990 » / « May 17, 1990 » selon la locale BCP-47). */
export function formatDate(iso: string, locale = 'fr-FR'): string {
  const d = parseBirthDate(iso)
  if (!d) return ''
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatDateFr(iso: string): string {
  return formatDate(iso, 'fr-FR')
}
