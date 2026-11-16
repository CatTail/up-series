import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildIndex } from '../../src/lib/data/index.ts'
import { setLang, t } from '../../src/lib/i18n.svelte.ts'
import Overview from '../../src/views/Overview.svelte'
import { makeFixture } from '../fixtures/dataset.ts'

const idx = buildIndex(makeFixture())
beforeEach(() => {
  setLang('zh')
  location.hash = '#/overview'
})
afterEach(() => cleanup())

const ageBtn = (age: number) => document.querySelector(`.axis button[data-age="${age}"]`) as HTMLButtonElement
const chart = () => document.querySelector('.chart') as HTMLElement
const chartName = (name: string) => within(chart()).getByRole('button', { name })
const filter = (label: string) => screen.getByRole('group', { name: label })
const allIn = (label: string) => within(filter(label)).getByRole('button', { name: t('overview.all') })
const agePill = (age: number) => within(filter(t('overview.age'))).getByRole('button', { name: t('age.short', { age }) })
const personPill = (name: string) => within(filter(t('overview.people'))).getByRole('button', { name })
const cardIds = () => cards().map((c) => c.dataset.card!).sort()
const card = (pid: string, fid: string) => document.querySelector(`[data-card="${pid}/${fid}"]`) as HTMLElement | null
const cards = () => Array.from(document.querySelectorAll('[data-card]')) as HTMLElement[]
const rowIds = () => Array.from(document.querySelectorAll('.row[data-person]')).map((r) => (r as HTMLElement).dataset.person)
const tick = () => new Promise((r) => setTimeout(r))

describe('Overview', () => {
  it('starts with nothing selected: no cards, every filter on 全部, no slider, no table', () => {
    render(Overview, { idx })
    expect(cards()).toHaveLength(0)
    expect(screen.queryByRole('slider')).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
    expect(rowIds()).toEqual(idx.peopleOrdered.map((p) => p.id))
    for (const g of [t('overview.age'), t('overview.people'), t('overview.theme')]) expect(allIn(g)).toHaveAttribute('aria-pressed', 'true')
  })

  it('the lede explains how age and people combine; origin is a static legend under the chart', () => {
    render(Overview, { idx })
    expect(document.querySelector('.lede')).toHaveTextContent(t('overview.lede'))
    expect(screen.queryByRole('group', { name: t('overview.origin') })).toBeNull()
    const legend = document.querySelector('.legend') as HTMLElement
    expect(chart().compareDocumentPosition(legend) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(legend).toHaveTextContent(t('overview.origin'))
    for (const g of idx.groups) expect(legend).toHaveTextContent(g.name.zh)
    expect(legend).toHaveTextContent(t('legend.absent'))
    expect(legend.querySelector('button')).toBeNull()
  })

  it('clicking an age label opens that column for everyone; clicking it again closes it', async () => {
    render(Overview, { idx })
    await userEvent.click(ageBtn(35))
    expect(location.hash).toBe('#/overview?age=35')
    expect(ageBtn(35)).toHaveAttribute('aria-pressed', 'true')
    expect(ageBtn(35)).toHaveTextContent('35 Up')
    expect(cards()).toHaveLength(idx.peopleOrdered.length)
    expect(card('charles', 'f35')).toHaveTextContent(t('status.absent'))
    expect(card('andrew', 'f35')).toHaveTextContent('律师')
    await userEvent.click(ageBtn(35))
    expect(location.hash).toBe('#/overview')
    expect(cards()).toHaveLength(0)
  })

  it('clicking a node opens its age', async () => {
    render(Overview, { idx })
    await fireEvent.click(document.querySelector('[data-node="lynn/f35"]')!)
    expect(location.hash).toBe('#/overview?age=35')
    expect(card('lynn', 'f35')).toHaveTextContent('图书管理员')
  })

  it('arrow keys on the age labels move the open age', async () => {
    render(Overview, { idx, age: 35 })
    ageBtn(35).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(location.hash).toBe('#/overview?age=42')
    expect(document.activeElement).toBe(ageBtn(42))
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(location.hash).toBe('#/overview?age=28')
  })

  it('at 70: Lynn deceased, Charles audio-only, Nick archival interview with his death', () => {
    render(Overview, { idx, age: 70 })
    expect(card('lynn', 'f70')).toHaveTextContent(t('status.deceased'))
    expect(card('suzy', 'f70')).not.toHaveTextContent(t('status.deceased'))
    expect(card('charles', 'f70')).toHaveTextContent(t('mark.audio_only'))
    expect(card('nick', 'f70')).toHaveTextContent(t('mark.archival_interview'))
    expect(card('nick', 'f70')).toHaveTextContent('† 2023')
    expect(card('andrew', 'f70')).not.toHaveTextContent('†')
  })

  it('at 63 Suzy is archive footage only', () => {
    render(Overview, { idx, age: 63 })
    expect(card('suzy', 'f63')).toHaveTextContent(t('status.footage_only'))
  })

  it('with no theme a card names the dimension it summarises; a theme switches the text', async () => {
    render(Overview, { idx, age: 7 })
    expect(card('andrew', 'f07')).toHaveTextContent(t('state.notFound'))
    await userEvent.click(screen.getByRole('button', { name: t('dim.outlook') }))
    expect(location.hash).toBe('#/overview?age=7&dim=outlook')
    expect(card('andrew', 'f07')).toHaveTextContent('想读《金融时报》')
    cleanup()
    render(Overview, { idx, age: 35 })
    expect(card('andrew', 'f35')).toHaveTextContent(t('dim.work'))
    await userEvent.click(screen.getByRole('button', { name: t('dim.family') }))
    expect(card('andrew', 'f35')).toHaveTextContent(t('state.notFound'))
    expect(card('andrew', 'f35')).not.toHaveTextContent('律师')
  })

  it('the age filter and the age labels on the chart share one state', async () => {
    render(Overview, { idx })
    await userEvent.click(agePill(35))
    expect(location.hash).toBe('#/overview?age=35')
    expect(ageBtn(35)).toHaveAttribute('aria-pressed', 'true')
    expect(agePill(35)).toHaveAttribute('aria-pressed', 'true')
    expect(allIn(t('overview.age'))).toHaveAttribute('aria-pressed', 'false')
    expect(cards()).toHaveLength(idx.peopleOrdered.length)
    await userEvent.click(ageBtn(42))
    expect(agePill(42)).toHaveAttribute('aria-pressed', 'true')
    expect(agePill(35)).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(agePill(42))
    expect(location.hash).toBe('#/overview')
    await userEvent.click(agePill(7))
    await userEvent.click(allIn(t('overview.age')))
    expect(location.hash).toBe('#/overview')
    expect(cards()).toHaveLength(0)
  })

  it('the people filter and the names on the chart share one state', async () => {
    render(Overview, { idx })
    const pills = within(filter(t('overview.people'))).getAllByRole('button').map((b) => b.textContent!.trim())
    expect(pills).toEqual([t('overview.all'), ...idx.peopleOrdered.map((p) => p.name)])
    await userEvent.click(personPill('Nick'))
    expect(location.hash).toBe('#/overview?people=nick')
    expect(chartName('Nick')).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(chartName('Charles'))
    expect(personPill('Charles')).toHaveAttribute('aria-pressed', 'true')
    expect(location.hash).toBe('#/overview?people=nick,charles')
    await userEvent.click(allIn(t('overview.people')))
    expect(location.hash).toBe('#/overview')
    expect(chartName('Nick')).toHaveAttribute('aria-pressed', 'false')
    expect(allIn(t('overview.people'))).toHaveAttribute('aria-pressed', 'true')
  })

  it('selected people with no age open move to the top and fill every age', async () => {
    render(Overview, { idx })
    await userEvent.click(chartName('Nick'))
    await userEvent.click(chartName('Charles'))
    expect(rowIds().slice(0, 2)).toEqual(['nick', 'charles'])
    expect(rowIds()).toHaveLength(idx.peopleOrdered.length)
    expect(cards().map((c) => c.dataset.card!.split('/')[0]).sort()).toEqual([...Array(10).fill('charles'), ...Array(10).fill('nick')])
    expect(card('charles', 'f35')).toHaveTextContent(t('status.absent'))
    expect(card('nick', 'f70')).toHaveTextContent(t('mark.archival_interview'))
  })

  it('an age and people together show only them at that age; selecting a name keeps the age open', async () => {
    render(Overview, { idx, age: 35 })
    expect(cards()).toHaveLength(idx.peopleOrdered.length)
    await userEvent.click(chartName('Nick'))
    expect(location.hash).toBe('#/overview?age=35&people=nick')
    expect(ageBtn(35)).toHaveAttribute('aria-pressed', 'true')
    expect(cardIds()).toEqual(['nick/f35'])
    await userEvent.click(personPill('Charles'))
    expect(cardIds()).toEqual(['charles/f35', 'nick/f35'])
    expect(rowIds().slice(0, 2)).toEqual(['nick', 'charles'])
    await userEvent.click(ageBtn(70))
    expect(location.hash).toBe('#/overview?age=70&people=nick,charles')
    expect(cardIds()).toEqual(['charles/f70', 'nick/f70'])
    await userEvent.click(allIn(t('overview.age')))
    expect(cards()).toHaveLength(20)
  })

  it('rows not selected fade while a selection exists', async () => {
    render(Overview, { idx, people: ['lynn'] })
    const rows = () => Array.from(document.querySelectorAll('.row[data-person]')) as HTMLElement[]
    for (const r of rows()) expect(r.classList.contains('rest')).toBe(r.dataset.person !== 'lynn')
    await userEvent.click(chartName('Lynn'))
    for (const r of rows()) expect(r.classList.contains('rest')).toBe(false)
  })

  it('the old compare link lands in compare mode', () => {
    render(Overview, { idx, people: ['andrew', 'charles'] })
    expect(rowIds().slice(0, 2)).toEqual(['andrew', 'charles'])
    expect(card('andrew', 'f35')).toHaveTextContent('律师')
    expect(card('charles', 'f07')).not.toBeNull()
  })

  it('opening a card shows its sources and links to the person and their questions in that film', async () => {
    render(Overview, { idx, age: 7, dim: 'outlook' })
    const c = card('andrew', 'f07')!
    expect(c.querySelector('.src')).toBeNull()
    await userEvent.click(c.querySelector('button')!)
    expect(c).toHaveTextContent('Seven Up!')
    expect(c.querySelector('a[href="#/person/andrew"]')).not.toBeNull()
    expect(c.querySelector('a[href="#/questions?film=f07&person=andrew"]')).toHaveTextContent('1')
    const lynn = card('lynn', 'f07')!
    await userEvent.click(lynn.querySelector('button')!)
    expect(lynn.querySelector('a[href^="#/questions"]')).toBeNull()
    expect(c.querySelector('.src')).toBeNull()
  })

  it('an absent card shows the participation note', () => {
    const ds = makeFixture()
    ds.people.find((p) => p.id === 'charles')!.participationNotes!.f35 = { zh: '本人拒绝参加', en: 'Declined' }
    render(Overview, { idx: buildIndex(ds), age: 35 })
    expect(card('charles', 'f35')).toHaveTextContent('本人拒绝参加')
  })

  it('hovering a node shows name, age, film, participation and the state text', async () => {
    render(Overview, { idx })
    await fireEvent.mouseEnter(document.querySelector('[data-node="charles/f35"]')!)
    const tip = screen.getByRole('tooltip')
    expect(tip).toHaveTextContent('Charles')
    expect(tip).toHaveTextContent('35 Up')
    expect(tip).toHaveTextContent(t('status.absent'))
    await fireEvent.mouseLeave(document.querySelector('[data-node="charles/f35"]')!)
    expect(screen.queryByRole('tooltip')).toBeNull()
    await fireEvent.mouseEnter(document.querySelector('[data-node="andrew/f35"]')!)
    expect(screen.getByRole('tooltip')).toHaveTextContent('律师')
  })

  it('each row carries its group colour for the line and markers', () => {
    render(Overview, { idx })
    const row = (id: string) => document.querySelector(`.row[data-person="${id}"]`) as HTMLElement
    expect(row('charles').style.getPropertyValue('--c')).toBe('var(--series-1)')
    expect(row('lynn').style.getPropertyValue('--c')).toBe('var(--series-2)')
    expect((document.querySelector('[data-node="charles/f70"]') as HTMLElement).dataset.marker).toBe('special')
    expect((document.querySelector('[data-node="charles/f35"]') as HTMLElement).dataset.marker).toBe('absent')
    expect(document.querySelector('[data-node="lynn/f63"]')).toBeNull()
  })

  it('draws the death tick and fades the line after it', () => {
    render(Overview, { idx })
    expect(document.querySelector('.row[data-person="nick"] .dlabel')).toHaveTextContent('† 2023')
    const segs = Array.from(document.querySelectorAll('.row[data-person="nick"] .seg')) as HTMLElement[]
    expect(segs.at(-1)!.dataset.style).toBe('faded')
    expect(segs.at(-2)!.dataset.style).toBe('solid')
  })

  it('a death label next to an open card is pushed off it', () => {
    render(Overview, { idx, age: 70 })
    expect(document.querySelector('.row[data-person="nick"] .dlabel')).toHaveClass('before')
    cleanup()
    render(Overview, { idx, age: 63 })
    expect(document.querySelector('.row[data-person="nick"] .dlabel')).toHaveClass('after')
    expect(document.querySelector('.row[data-person="lynn"] .dlabel')).not.toHaveClass('after')
  })

  it('clicking a name selects the person for comparison instead of opening their page', async () => {
    render(Overview, { idx })
    expect(document.querySelector('.row .name a')).toBeNull()
    expect(document.querySelector('.row input[type="checkbox"]')).toBeNull()
    await userEvent.click(chartName('Lynn'))
    expect(location.hash).toBe('#/overview?people=lynn')
    expect(rowIds()[0]).toBe('lynn')
    await userEvent.click(chartName('Lynn'))
    expect(location.hash).toBe('#/overview')
    expect(chartName('Lynn')).toHaveAttribute('aria-pressed', 'false')
  })

  it('switching to English keeps the open age and theme', async () => {
    render(Overview, { idx, age: 35, dim: 'work' })
    setLang('en')
    await tick()
    expect(card('charles', 'f35')).toHaveTextContent('Not filmed')
    expect(card('andrew', 'f35')).toHaveTextContent('Solicitor')
    expect(ageBtn(35)).toHaveAttribute('aria-pressed', 'true')
  })
})
