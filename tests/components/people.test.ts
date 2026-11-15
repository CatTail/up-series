import { cleanup, render, screen } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildIndex } from '../../src/lib/data/index.ts'
import { setLang, t } from '../../src/lib/i18n.svelte.ts'
import People from '../../src/views/People.svelte'
import { makeFixture } from '../fixtures/dataset.ts'

beforeEach(() => setLang('zh'))
afterEach(() => cleanup())
const card = (id: string) => document.querySelector(`a.pcard[href="#/person/${id}"]`) as HTMLElement

describe('People index', () => {
  it('groups people by origin, one heading per group that has people', () => {
    const idx = buildIndex(makeFixture())
    render(People, { idx })
    const heads = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent?.trim())
    expect(heads).toEqual(['富裕家庭 · 私立学校', '伦敦东区 · 公立小学', '约克郡山谷农场'])
    expect(document.querySelectorAll('a.pcard')).toHaveLength(idx.peopleOrdered.length)
  })

  it('a card shows full name, background, death and final state, and links to the person', () => {
    render(People, { idx: buildIndex(makeFixture()) })
    const nick = card('nick')
    expect(nick).toHaveTextContent('Nick Hitchon')
    expect(nick).toHaveTextContent('约克郡山谷小农场')
    expect(nick).toHaveTextContent('† 2023-07-23')
    expect(nick).toHaveTextContent('核物理学家，2023 年去世')
    expect(nick).toHaveTextContent('70 Up')
  })

  it('a person without a final state shows not found', () => {
    const ds = makeFixture()
    ds.finals = ds.finals.filter((f) => f.personId !== 'lynn')
    render(People, { idx: buildIndex(ds) })
    expect(card('lynn')).toHaveTextContent(t('state.notFound'))
  })

  it('has the name strip with no current person', () => {
    render(People, { idx: buildIndex(makeFixture()) })
    const strip = screen.getByRole('navigation', { name: t('people.strip') })
    expect(strip.querySelectorAll('a')).toHaveLength(5)
    expect(strip.querySelector('[aria-current]')).toBeNull()
  })
})
