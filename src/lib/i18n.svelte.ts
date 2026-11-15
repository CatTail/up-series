import uiJson from '../../data/ui.json'
import type { Bilingual, Lang } from './data/types.ts'

const KEY = 'up-lang'
const ui = uiJson as Record<string, Bilingual>

function stored(): Lang {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'zh' || v === 'en') return v
  } catch {
    /* storage unavailable (file:// in some browsers) */
  }
  return 'zh'
}

export const i18n = $state<{ lang: Lang }>({ lang: stored() })

function applyDocLang(l: Lang) {
  if (typeof document !== 'undefined') document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en'
}
applyDocLang(i18n.lang)

/** Re-read the stored choice (called when the app starts). */
export function initLang(): void {
  i18n.lang = stored()
  applyDocLang(i18n.lang)
}

export function setLang(l: Lang): void {
  i18n.lang = l
  try {
    localStorage.setItem(KEY, l)
  } catch {
    /* ignore */
  }
  applyDocLang(l)
}

/** UI string for the current language. Throws on a missing key so tests catch typos. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const v = ui[key]
  if (!v) throw new Error(`missing ui key: ${key}`)
  let s = v[i18n.lang]
  if (vars) for (const [k, x] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(x))
  return s
}

export function pick(b: Bilingual): string {
  return b[i18n.lang]
}
