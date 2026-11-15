import { cleanup, fireEvent, render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildIndex } from '../../src/lib/data/index.ts'
import { setLang, t } from '../../src/lib/i18n.svelte.ts'
import Questions from '../../src/views/Questions.svelte'
import { makeFixture } from '../fixtures/dataset.ts'

const idx = buildIndex(makeFixture())
beforeEach(() => {
  setLang('zh')
  location.hash = '#/questions'
})
afterEach(() => cleanup())
const rows = () => Array.from(document.querySelectorAll('.qrow')) as HTMLElement[]
const row = (id: string) => document.querySelector(`.qrow[data-q="${id}"]`) as HTMLElement

describe('Questions view', () => {
  it('lists every question and the count', () => {
    render(Questions, { idx })
    expect(rows()).toHaveLength(3)
    expect(screen.getByText(t('questions.count', { n: 3 }))).toBeInTheDocument()
  })

  it('shows "没有找到" when the search has no results', async () => {
    render(Questions, { idx })
    await userEvent.type(screen.getByRole('searchbox'), 'zzzzqqq')
    expect(rows()).toHaveLength(0)
    expect(screen.getByText(t('questions.empty'))).toBeInTheDocument()
  })

  it('search syncs to the route and finds cabbie / 出租车', async () => {
    render(Questions, { idx })
    await userEvent.type(screen.getByRole('searchbox'), 'CABBIE?')
    expect(rows().map((r) => r.dataset.q)).toEqual(['f28-001'])
    expect(location.hash).toBe('#/questions?q=CABBIE%3F')
    await userEvent.clear(screen.getByRole('searchbox'))
    await userEvent.type(screen.getByRole('searchbox'), '出租车')
    expect(rows().map((r) => r.dataset.q)).toEqual(['f28-001'])
  })

  it('film_only shows "只归到影片", fromRecap shows "来自回放"', () => {
    render(Questions, { idx })
    expect(row('f28-001')).toHaveTextContent('只归到影片')
    expect(row('f28-002')).toHaveTextContent('来自回放')
    expect(row('f28-002')).toHaveTextContent('Suzy')
    expect(row('f07-001')).not.toHaveTextContent('只归到影片')
  })

  it('person filter hides film_only questions; film filter keeps them', async () => {
    render(Questions, { idx })
    await userEvent.click(screen.getByRole('button', { name: 'Suzy' }))
    expect(rows().map((r) => r.dataset.q)).toEqual(['f28-002'])
    expect(location.hash).toBe('#/questions?person=suzy')
    await userEvent.click(screen.getByRole('button', { name: 'Suzy' }))
    await userEvent.click(screen.getByRole('button', { name: /^28/ }))
    expect(rows().map((r) => r.dataset.q)).toEqual(['f28-001', 'f28-002'])
  })

  it('every film filter shows its transcript coverage', () => {
    render(Questions, { idx })
    const films = Array.from(document.querySelectorAll('[data-film-filter]'))
    expect(films).toHaveLength(10)
    expect(films[0]).toHaveTextContent(t('coverage.full'))
    expect(films[9]).toHaveTextContent(t('coverage.partial'))
  })

  it('switching to EN keeps filters and switches the list text', async () => {
    render(Questions, { idx })
    await userEvent.type(screen.getByRole('searchbox'), 'cabbie')
    setLang('en')
    await new Promise((r) => setTimeout(r))
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('cabbie')
    expect(rows().map((r) => r.dataset.q)).toEqual(['f28-001'])
    expect(row('f28-001')).toHaveTextContent('Film only')
    expect(row('f28-001').querySelector('.primary')).toHaveTextContent('What does it take to be a good cabbie?')
    expect(document.body).not.toHaveTextContent('只归到影片')
  })

  it('#/questions?theme=work opens with the work theme selected', () => {
    render(Questions, { idx, theme: 'work' })
    expect(screen.getByRole('button', { name: '工作' })).toHaveAttribute('aria-pressed', 'true')
    expect(rows().map((r) => r.dataset.q)).toEqual(['f07-001', 'f28-001'])
  })

  it('#/questions?open=<id> expands that question and scrolls it into view', async () => {
    const spy = vi.fn()
    Element.prototype.scrollIntoView = spy
    render(Questions, { idx, open: 'f07-001' })
    await new Promise((r) => setTimeout(r))
    expect(row('f07-001')).toHaveTextContent('《金融时报》。')
    expect(row('f07-001')).toHaveTextContent('Seven Up! · 预备学校段落')
    expect(spy).toHaveBeenCalled()
  })

  it('expanding a row shows its answer summary', async () => {
    render(Questions, { idx })
    expect(row('f28-002')).not.toHaveTextContent('她说还没想好。')
    await fireEvent.click(row('f28-002').querySelector('button.expand')!)
    expect(row('f28-002')).toHaveTextContent('她说还没想好。')
  })
})
