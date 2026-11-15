import { cleanup, fireEvent, render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildIndex } from '../../src/lib/data/index.ts'
import { setLang, t } from '../../src/lib/i18n.svelte.ts'
import Compare from '../../src/views/Compare.svelte'
import { makeFixture } from '../fixtures/dataset.ts'

const idx = buildIndex(makeFixture())
beforeEach(() => {
  setLang('zh')
  location.hash = '#/compare?a=andrew&b=charles'
})
afterEach(() => cleanup())
const cells = (pid: string, dim: string) => Array.from(document.querySelectorAll(`tr[data-person="${pid}"][data-dim="${dim}"] td`)) as HTMLElement[]

describe('Compare', () => {
  it('renders 6 dims × 2 people = 12 rows of 10 cells', () => {
    render(Compare, { idx, a: 'andrew', b: 'charles' })
    const rows = document.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(12)
    for (const r of rows) expect(r.querySelectorAll('td')).toHaveLength(10)
  })

  it('charles f28–f63 cells are .off and show the absent status', () => {
    render(Compare, { idx, a: 'andrew', b: 'charles' })
    const row = cells('charles', 'work')
    for (let i = 3; i <= 8; i++) {
      expect(row[i]).toHaveClass('off')
      expect(row[i]).toHaveTextContent(t('status.absent'))
    }
    expect(row[9]).not.toHaveClass('off')
    expect(row[0]).not.toHaveClass('off')
  })

  it('lynn deceased cells are .off', () => {
    render(Compare, { idx, a: 'lynn', b: 'nick' })
    const row = cells('lynn', 'family')
    expect(row[8]).toHaveTextContent(t('status.deceased'))
    expect(row[9]).toHaveClass('off')
  })

  it('changing a person updates the route', async () => {
    render(Compare, { idx, a: 'andrew', b: 'charles' })
    await userEvent.selectOptions(screen.getByLabelText(t('compare.pickB')), 'lynn')
    expect(location.hash).toBe('#/compare?a=andrew&b=lynn')
    expect(document.querySelectorAll('tr[data-person="lynn"]')).toHaveLength(6)
  })

  it('a select cannot pick the person chosen on the other side', () => {
    render(Compare, { idx, a: 'andrew', b: 'charles' })
    const optsA = Array.from((screen.getByLabelText(t('compare.pickA')) as HTMLSelectElement).options).map((o) => o.value)
    const optsB = Array.from((screen.getByLabelText(t('compare.pickB')) as HTMLSelectElement).options).map((o) => o.value)
    expect(optsA).not.toContain('charles')
    expect(optsB).not.toContain('andrew')
    expect(optsA).toContain('andrew')
  })

  it('clicking a confirmed cell reveals its sources', async () => {
    render(Compare, { idx, a: 'andrew', b: 'charles' })
    const cell = cells('andrew', 'work')[4]
    expect(cell.querySelector('.src')).toBeNull()
    await fireEvent.click(cell.querySelector('button')!)
    expect(cell).toHaveTextContent('Wikipedia · Up (film series)')
  })

  it('defaults to the first two people when the route has none', () => {
    render(Compare, { idx })
    expect(document.querySelectorAll('tr[data-person="andrew"]')).toHaveLength(6)
    expect(document.querySelectorAll('tr[data-person="charles"]')).toHaveLength(6)
  })
})
