import { cleanup, render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import uiJson from '../../data/ui.json'
import App from '../../src/App.svelte'
import { setLang, t } from '../../src/lib/i18n.svelte.ts'
import { PARTICIPATION_TEXT } from '../../src/lib/data/participation-text.ts'
import { PARTICIPATIONS } from '../../src/lib/data/types.ts'

beforeEach(() => {
  localStorage.clear()
  location.hash = ''
  setLang('zh')
  localStorage.clear()
})
afterEach(() => cleanup())

const navTexts = () => Array.from(document.querySelectorAll('nav [data-tab]')).map((a) => a.textContent?.trim())

describe('app shell', () => {
  it('defaults to Chinese and switches to English', async () => {
    render(App)
    expect(navTexts()).toEqual(['缘起', '总览', '猜一猜', '问题库', '对比'])
    await userEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(navTexts()).toEqual(['Origins', 'Overview', 'Guess', 'Questions', 'Compare'])
    expect(localStorage.getItem('up-lang')).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('keeps English after a reload', async () => {
    localStorage.setItem('up-lang', 'en')
    render(App)
    expect(navTexts()).toEqual(['Origins', 'Overview', 'Guess', 'Questions', 'Compare'])
  })

  it('hash change switches the active tab', async () => {
    render(App)
    location.hash = '#/compare'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    await vi.waitFor(() => expect(document.querySelector('nav [aria-current="page"]')?.getAttribute('data-tab')).toBe('compare'))
  })

  it('every ui.json key resolves in both languages', async () => {
    for (const lang of ['zh', 'en'] as const) {
      setLang(lang)
      for (const k of Object.keys(uiJson)) expect(t(k)).toBeTruthy()
    }
    expect(() => t('no.such.key')).toThrow()
  })

  it('ui status texts match PARTICIPATION_TEXT', () => {
    const ui = uiJson as Record<string, { zh: string; en: string }>
    for (const p of PARTICIPATIONS) expect(ui[`status.${p}`]).toEqual(PARTICIPATION_TEXT[p])
  })
})

