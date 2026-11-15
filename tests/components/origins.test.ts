import { cleanup, fireEvent, render } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildIndex } from '../../src/lib/data/index.ts'
import { setLang, t } from '../../src/lib/i18n.svelte.ts'
import Origins from '../../src/views/Origins.svelte'
import { makeFixture } from '../fixtures/dataset.ts'

const idx = buildIndex(makeFixture())
beforeEach(() => {
  setLang('zh')
  location.hash = '#/origins'
})
afterEach(() => cleanup())

describe('Origins', () => {
  it('shows the ten-film strip with age, year and director', () => {
    render(Origins, { idx })
    const films = Array.from(document.querySelectorAll('.film')) as HTMLElement[]
    expect(films).toHaveLength(10)
    expect(films[0]).toHaveTextContent('7')
    expect(films[0]).toHaveTextContent('1964')
    expect(films[0]).toHaveTextContent('Paul Almond')
    expect(films[9]).toHaveTextContent('Asif Kapadia')
    expect(films[9]).toHaveTextContent('2026')
  })

  it('interpretation blocks carry the 解读 badge; sourced blocks show sources', () => {
    render(Origins, { idx })
    const interp = document.querySelector('[data-block="ours"]') as HTMLElement
    expect(interp).toHaveTextContent(t('badge.interpretation'))
    const maxim = document.querySelector('[data-block="maxim"]') as HTMLElement
    expect(maxim).not.toHaveTextContent(t('badge.interpretation'))
    expect(maxim).toHaveTextContent('Wikipedia · Up (film series)')
  })

  it('theme cards show their intent badge and open the library filtered by theme', async () => {
    render(Origins, { idx })
    const cards = Array.from(document.querySelectorAll('.theme')) as HTMLElement[]
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent(t('badge.sourced'))
    expect(cards[1]).toHaveTextContent(t('badge.interpretation'))
    expect(cards[0]).toHaveTextContent('你读什么报纸？')
    await fireEvent.click(cards[0].querySelector('a.open')!)
    expect(cards[0].querySelector('a.open')!.getAttribute('href')).toBe('#/questions?theme=work')
  })

  it('EN shows the maxim in English', async () => {
    render(Origins, { idx })
    setLang('en')
    await new Promise((r) => setTimeout(r))
    expect(document.querySelector('[data-block="maxim"]')).toHaveTextContent('Give me a child until he is seven and I will give you the man.')
    expect(document.body).not.toHaveTextContent('解读')
  })
})
