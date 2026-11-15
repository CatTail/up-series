import { cleanup, render, screen } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildIndex } from '../../src/lib/data/index.ts'
import { setLang, t } from '../../src/lib/i18n.svelte.ts'
import Person from '../../src/views/Person.svelte'
import { makeFixture } from '../fixtures/dataset.ts'

beforeEach(() => setLang('zh'))
afterEach(() => cleanup())
const wave = (filmId: string) => document.querySelector(`[data-film="${filmId}"]`) as HTMLElement
const dim = (filmId: string, d: string) => wave(filmId).querySelector(`[data-dim="${d}"]`) as HTMLElement

describe('Person page', () => {
  it('nick page shows header tags (group, background, † 2023-07-23)', () => {
    render(Person, { idx: buildIndex(makeFixture()), id: 'nick' })
    const head = document.querySelector('header.phead') as HTMLElement
    expect(head).toHaveTextContent('Nick Hitchon')
    expect(head).toHaveTextContent('约克郡山谷农场')
    expect(head).toHaveTextContent('约克郡山谷小农场')
    expect(head).toHaveTextContent('† 2023-07-23')
  })

  it('renders one block per film with its own lifeline', () => {
    render(Person, { idx: buildIndex(makeFixture()), id: 'nick' })
    expect(document.querySelectorAll('[data-film]')).toHaveLength(10)
    expect(document.querySelectorAll('g.row')).toHaveLength(1)
  })

  it('charles f35 row shows "未出镜" and its participationNote if present', () => {
    const ds = makeFixture()
    ds.people.find((p) => p.id === 'charles')!.participationNotes!.f35 = { zh: '本人拒绝参加', en: 'Declined to take part' }
    render(Person, { idx: buildIndex(ds), id: 'charles' })
    expect(wave('f35')).toHaveTextContent('未出镜')
    expect(wave('f35')).toHaveTextContent('本人拒绝参加')
    expect(wave('f70')).toHaveTextContent(t('status.audio_only'))
    expect(wave('f70')).toHaveTextContent('只有录音和照片')
  })

  it('not_found dim renders "未查到"', () => {
    render(Person, { idx: buildIndex(makeFixture()), id: 'andrew' })
    expect(dim('f14', 'work')).toHaveTextContent('未查到')
  })

  it('confirmed dim renders text + source list', () => {
    render(Person, { idx: buildIndex(makeFixture()), id: 'andrew' })
    const cell = dim('f35', 'work')
    expect(cell).toHaveTextContent('律师')
    const a = cell.querySelector('a[href^="https://"]') as HTMLAnchorElement
    expect(a.getAttribute('href')).toBe('https://en.wikipedia.org/wiki/Up_(film_series)')
    expect(cell).toHaveTextContent('Wikipedia · Up (film series)')
  })

  it('confirmed dim with questionIds links to #/questions?open=<id>', () => {
    render(Person, { idx: buildIndex(makeFixture()), id: 'andrew' })
    const link = dim('f07', 'outlook').querySelector('a[href^="#/questions"]')!
    expect(link.getAttribute('href')).toBe('#/questions?open=f07-001')
  })

  it('film sources show title and locator, without a link', () => {
    render(Person, { idx: buildIndex(makeFixture()), id: 'andrew' })
    const qa = wave('f07').querySelector('.qa') as HTMLElement
    expect(qa).toHaveTextContent('你读什么报纸？')
    expect(qa).toHaveTextContent('《金融时报》。')
    expect(qa).toHaveTextContent('Seven Up! · 预备学校段落')
    expect(qa.querySelector('a[href^="http"]')).toBeNull()
  })

  it('final summary section rendered; when final null shows "未查到"', () => {
    const ds = makeFixture()
    render(Person, { idx: buildIndex(ds), id: 'lynn' })
    const fin = document.querySelector('[data-final]') as HTMLElement
    expect(fin).toHaveTextContent('儿童图书管理员')
    expect(fin).toHaveTextContent('56 Up')
    cleanup()
    ds.finals = ds.finals.filter((f) => f.personId !== 'lynn')
    render(Person, { idx: buildIndex(ds), id: 'lynn' })
    expect(document.querySelector('[data-final]')).toHaveTextContent('未查到')
  })

  it('lynn f63 and f70 show deceased', () => {
    render(Person, { idx: buildIndex(makeFixture()), id: 'lynn' })
    expect(wave('f63')).toHaveTextContent('已去世')
    expect(wave('f70')).toHaveTextContent('已去世')
  })

  it('EN toggle switches all dims', async () => {
    render(Person, { idx: buildIndex(makeFixture()), id: 'andrew' })
    setLang('en')
    await new Promise((r) => setTimeout(r))
    expect(dim('f35', 'work')).toHaveTextContent('Solicitor')
    expect(dim('f14', 'work')).toHaveTextContent('Not found')
    expect(document.body).not.toHaveTextContent('未查到')
    expect(screen.getAllByText(t('dim.education')).length).toBeGreaterThan(0)
  })
})
