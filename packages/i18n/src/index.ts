import en from '../en.json'
import sw from '../sw.json'

export type Language = 'en' | 'sw'

const translations = { en, sw } as const

export type TranslationKey = keyof typeof en

export function t(lang: Language, path: string): string {
  const keys = path.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = translations[lang]
  for (const key of keys) {
    value = value?.[key]
  }
  if (typeof value === 'string') return value
  // Fallback to English
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fallback: any = translations['en']
  for (const key of keys) {
    fallback = fallback?.[key]
  }
  return typeof fallback === 'string' ? fallback : path
}

export { en, sw }
