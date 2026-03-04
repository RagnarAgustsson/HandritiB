export const locales = ['is', 'nb', 'da', 'sv'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'is'
