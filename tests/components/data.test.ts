import { cleanup, render, screen, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SuggestEdit from '../../src/components/SuggestEdit.svelte'
import { assembleDataset } from '../../src/lib/data/assemble.ts'
import { buildIndex } from '../../src/lib/data/index.ts'
import { closeEditor, editor } from '../../src/lib/editor.svelte.ts'
import { setLang, t } from '../../src/lib/i18n.svelte.ts'
import Data from '../../src/views/Data.svelte'
import { fixtureFiles } from '../fixtures/files.ts'

const files = fixtureFiles()
const idx = buildIndex(assembleDataset(files))
const notFound = idx.ds.states.flatMap((r) => Object.values(r.dims)).filter((d) => d.status === 'not_found').length
beforeEach(() => setLang('zh'))
afterEach(() => {
  if (editor.target) closeEditor()
  cleanup()
  vi.restoreAllMocks()
})
const rows = () => document.querySelectorAll('tr[data-gap]')
const select = (label: string) => within(screen.getByRole('group', { name: new RegExp(t('data.todo')) })).getByRole('combobox', { name: label })

describe('Data page', () => {
  it('lists every gap, 60 at a time, and filters them', async () => {
    render(Data, { idx })
    expect(screen.getByRole('heading', { name: new RegExp(t('data.todo')) })).toHaveTextContent(t('data.todoCount', { n: notFound }))
    expect(rows()).toHaveLength(60)
    await userEvent.click(screen.getByRole('button', { name: t('data.showMore', { n: notFound - 60 }) }))
    expect(rows()).toHaveLength(Math.min(120, notFound))
    await userEvent.selectOptions(select(t('overview.people')), 'nick')
    await userEvent.selectOptions(select(t('overview.age')), 'f35')
    expect(Array.from(rows()).map((r) => (r as HTMLElement).dataset.gap)).toEqual(['nick/f35/education', 'nick/f35/work', 'nick/f35/family', 'nick/f35/residence', 'nick/f35/events', 'nick/f35/outlook'])
    await userEvent.selectOptions(select(t('overview.theme')), 'work')
    expect(rows()).toHaveLength(1)
  })

  it('补充 on a gap opens the editor in fill-in mode', async () => {
    render(Data, { idx })
    render(SuggestEdit, { idx, files })
    await userEvent.click(within(document.querySelector('tr[data-gap="andrew/f07/education"]') as HTMLElement).getByRole('button'))
    expect(screen.getByRole('dialog')).toHaveAccessibleName(t('edit.titleFill'))
    expect(editor).toEqual({ target: 'state/andrew/f07/education', mode: 'fill' })
  })

  it('downloads are built in the page (no network): CSV for states', async () => {
    const blobs: Blob[] = []
    URL.createObjectURL = vi.fn((b: Blob) => (blobs.push(b), 'blob:x')) as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn()
    const clicks = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('up-states.csv')
    })
    render(Data, { idx })
    await userEvent.click(screen.getByRole('button', { name: t('data.dl.states') }))
    expect(clicks).toHaveBeenCalledOnce()
    expect(blobs[0].type).toBe('text/csv;charset=utf-8')
    expect(await blobs[0].text()).toContain('state/andrew/f35/work')
  })

  it('links to the guide, open suggestions and the raw files on GitHub', () => {
    render(Data, { idx })
    expect(screen.getByRole('link', { name: `${t('data.guide')} ↗` })).toHaveAttribute('href', 'https://github.com/CatTail/up-series/blob/main/CONTRIBUTING.md')
    expect(screen.getByRole('link', { name: `${t('data.open')} ↗` }).getAttribute('href')).toContain('label%3Adata-edit')
    expect(screen.getByRole('link', { name: 'data/states/ ↗' })).toHaveAttribute('href', 'https://github.com/CatTail/up-series/tree/main/data/states')
  })
})
