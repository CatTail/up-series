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

const chip = (id: string) => document.querySelector(`.chip[data-person="${id}"]`) as HTMLElement

describe('Overview', () => {
  it('slider at 35 shows Charles absent', async () => {
    render(Overview, { idx })
    await fireEvent.input(screen.getByRole('slider'), { target: { value: '4' } })
    expect(chip('charles')).toHaveTextContent(t('status.absent'))
    expect(location.hash).toBe('#/overview?age=35')
  })

  it('slider at 70 shows Lynn deceased, Charles audio-only, Nick archival interview and his death', async () => {
    render(Overview, { idx, age: 70 })
    expect(chip('lynn')).toHaveTextContent('已去世')
    expect(chip('suzy')).not.toHaveTextContent('已去世')
    expect(chip('charles')).toHaveTextContent(t('mark.audio_only'))
    expect(chip('nick')).toHaveTextContent(t('mark.archival_interview'))
    expect(chip('nick')).toHaveTextContent('† 2023')
    expect(chip('andrew')).not.toHaveTextContent('†')
  })

  it('slider at 63 shows Suzy archive footage only', async () => {
    render(Overview, { idx, age: 63 })
    expect(chip('suzy')).toHaveTextContent(t('status.footage_only'))
  })

  it('clicking a group legend dims the other groups', async () => {
    render(Overview, { idx })
    await userEvent.click(screen.getByRole('button', { name: /伦敦东区/ }))
    const rows = Array.from(document.querySelectorAll('g.row')) as SVGGElement[]
    for (const r of rows) expect(r.getAttribute('opacity')).toBe(r.dataset.group === 'east' ? '1' : '0.25')
    await userEvent.click(screen.getByRole('button', { name: /伦敦东区/ }))
    for (const r of rows) expect(r.getAttribute('opacity')).toBe('1')
  })

  it('table view has one row per person and 10 film columns', async () => {
    render(Overview, { idx })
    await userEvent.click(screen.getByRole('button', { name: t('overview.tableView') }))
    const table = screen.getByRole('table')
    const body = table.querySelectorAll('tbody tr')
    expect(body).toHaveLength(idx.peopleOrdered.length)
    for (const tr of body) expect(tr.querySelectorAll('td')).toHaveLength(10)
    expect(within(table).getAllByText(t('status.deceased'))).toHaveLength(2)
  })

  it('hovering a marker shows name, age, film and participation', async () => {
    render(Overview, { idx })
    const hit = document.querySelector('[data-hit="charles/f35"]')!
    await fireEvent.mouseEnter(hit)
    const tip = screen.getByRole('tooltip')
    expect(tip).toHaveTextContent('Charles')
    expect(tip).toHaveTextContent('35')
    expect(tip).toHaveTextContent('35 Up')
    expect(tip).toHaveTextContent(t('status.absent'))
  })

  it('special (audio-only / archival) markers are stroked in the group colour, so they stay visible', () => {
    render(Overview, { idx })
    const m = document.querySelector('[data-marker="special"]') as SVGElement
    expect(m.style.stroke).toBe('var(--series-1)')
  })

  it('person names link to the person page', async () => {
    render(Overview, { idx })
    const link = document.querySelector('a[data-person-link="nick"]') as Element
    expect(link.getAttribute('href')).toBe('#/person/nick')
  })

  it('switching to English keeps the slider position', async () => {
    render(Overview, { idx, age: 35 })
    setLang('en')
    await new Promise((r) => setTimeout(r))
    expect(chip('charles')).toHaveTextContent('Not filmed')
    expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('4')
  })
})
