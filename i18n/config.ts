export const locales = ['is', 'nb', 'da', 'sv'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'is'

/** Format date as d.m.yyyy — hardcoded because Chrome/Safari lack is-IS locale */
export function formatDate(date: Date): string {
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`
}

/** Format date+time as d.m.yyyy, HH:MM — hardcoded for consistency */
export function formatDateTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}, ${h}:${m}`
}
