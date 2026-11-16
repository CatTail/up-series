import { cleanup, render, screen, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import SuggestEdit from '../../src/components/SuggestEdit.svelte'
import { fileUrl } from '../../src/lib/contribute.ts'
import { parseAddress } from '../../src/lib/data/address.ts'
import { assembleDataset } from '../../src/lib/data/assemble.ts'
import { buildIndex } from '../../src/lib/data/index.ts'
import { applyPatch, parsePatch, readTarget } from '../../src/lib/data/patch.ts'
import { closeEditor, editor } from '../../src/lib/editor.svelte.ts'
import { setLang, t } from '../../src/lib/i18n.svelte.ts'
import Overview from '../../src/views/Overview.svelte'
import Person from '../../src/views/Person.svelte'
import Questions from '../../src/views/Questions.svelte'
import { fixtureFiles } from '../fixtures/files.ts'

const files = fixtureFiles()
const idx = buildIndex(assembleDataset(files))
beforeEach(() => setLang('zh'))
afterEach(() => {
  if (editor.target) closeEditor()
  cleanup()
})

function open(view: 'andrew' = 'andrew') {
  render(Person, { idx, id: view })
  render(SuggestEdit, { idx, files })
}
const editBtn = (label: string) => screen.getByRole('button', { name: t('edit.aria', { label }) })
const fillBtn = (label: string) => screen.getByRole('button', { name: t('edit.ariaFill', { label }) })
const dialog = () => screen.getByRole('dialog')
const inDialog = () => within(dialog())
const bi = (legend: string, lang: 'zh' | 'en') => within(inDialog().getByRole('group', { name: legend })).getByRole('textbox', { name: t(`edit.lang.${lang}`) })
const reasonBox = () => inDialog().getByRole('textbox', { name: t('edit.reasonLabel') })
const submitName = `${t('edit.submit')} ↗`
const submitLink = () => inDialog().getByRole('link', { name: submitName }) as HTMLAnchorElement
const submitDisabled = () => (inDialog().getByRole('button', { name: submitName }) as HTMLButtonElement).disabled
const problems = () => Array.from(dialog().querySelectorAll('.check li')).map((li) => li.textContent)
/** The patch carried by the submit link, parsed the way the bot will. */
function linkPatch() {
  const u = new URL(submitLink().href)
  expect(u.origin + u.pathname).toBe('https://github.com/CatTail/up-series/issues/new')
  expect(u.searchParams.get('template')).toBe('data-edit.yml')
  const p = parsePatch(JSON.parse(u.searchParams.get('patch')!))
  if (!p.ok) throw new Error(p.error)
  return { url: u, patch: p.patch }
}

describe('suggesting a change', () => {
  it('✎ on a person-page cell opens the raw record: both languages, sources, address and file', async () => {
    open()
    await userEvent.click(editBtn('Andrew · 35 Up · 工作 / 职业'))
    expect(dialog()).toHaveAccessibleName(t('edit.title'))
    const cur = within(dialog().querySelector('.cur') as HTMLElement)
    expect(cur.getByText('律师')).toBeInTheDocument()
    expect(cur.getByText('Solicitor')).toBeInTheDocument()
    expect(cur.getByRole('link', { name: 'Wikipedia · Up (film series)' })).toBeInTheDocument()
    expect(cur.getByText('state/andrew/f35/work')).toBeInTheDocument()
    expect(cur.getByRole('link', { name: `${t('edit.viewFile')} ↗` })).toHaveAttribute('href', fileUrl('states/andrew.json'))
    expect(bi(t('edit.f.text'), 'zh')).toHaveValue('律师')
  })

  it('an edit shows before → after, needs a reason, and the link carries a patch the bot can apply', async () => {
    open()
    await userEvent.click(editBtn('Andrew · 35 Up · 工作 / 职业'))
    expect(inDialog().getByText(t('edit.noChange'))).toBeInTheDocument()
    await userEvent.clear(bi(t('edit.f.text'), 'zh'))
    await userEvent.type(bi(t('edit.f.text'), 'zh'), '事务律师')
    const row = within(dialog().querySelector('.preview tbody tr') as HTMLElement)
    expect(row.getByText(`${t('edit.f.text')} · ${t('edit.lang.zh')}`)).toBeInTheDocument()
    expect(row.getByText('律师')).toBeInTheDocument()
    expect(row.getByText('事务律师')).toBeInTheDocument()
    expect(problems()).toEqual([t('check.reason')])
    expect(submitDisabled()).toBe(true)

    await userEvent.type(reasonBox(), '35 Up 里他说自己是事务律师。')
    expect(dialog().querySelector('.ok')).toHaveTextContent(t('edit.ok'))
    const { url, patch } = linkPatch()
    expect(url.searchParams.get('title')).toBe(t('edit.issueTitle', { label: 'Andrew · 35 Up · 工作 / 职业' }))
    expect(url.searchParams.get('target')).toBe('state/andrew/f35/work')
    expect(url.searchParams.get('reason')).toBe('35 Up 里他说自己是事务律师。')
    expect(url.searchParams.get('summary')).toContain('| 内容 · 中文 | 律师 | 事务律师 |')
    expect(submitLink()).toHaveAttribute('target', '_blank')
    const r = applyPatch(files, patch, { today: '2026-11-16' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(readTarget(r.files, parseAddress('state/andrew/f35/work')!)).toEqual({ status: 'confirmed', text: { zh: '事务律师', en: 'Solicitor' }, sourceIds: ['wiki-up'] })
  })

  it('a sourced fact without any source is explained in plain words and cannot be submitted', async () => {
    open()
    await userEvent.click(editBtn('Andrew · 35 Up · 工作 / 职业'))
    await userEvent.click(inDialog().getByRole('button', { name: t('edit.src.remove', { name: 'Wikipedia · Up (film series)' }) }))
    await userEvent.type(reasonBox(), '出处不对')
    expect(inDialog().getByText(t('edit.src.none'))).toBeInTheDocument()
    expect(problems()).toContain(t('check.MISSING_SOURCE'))
    expect(submitDisabled()).toBe(true)
  })

  it('未查到 opens in fill-in mode with the film as a source; a new web source travels with the patch', async () => {
    open()
    await userEvent.click(fillBtn('Andrew · 7 Plus Seven · 工作 / 职业'))
    expect(dialog()).toHaveAccessibleName(t('edit.titleFill'))
    expect(inDialog().getByRole('radio', { name: t('edit.st.confirmed') })).toBeChecked()
    expect(dialog().querySelector('[data-source="film-f14"]')).toHaveTextContent('7 Plus Seven')
    await userEvent.type(bi(t('edit.f.text'), 'zh'), '在读寄宿学校')
    await userEvent.type(bi(t('edit.f.text'), 'en'), 'At boarding school')
    await userEvent.click(inDialog().getByRole('button', { name: t('edit.src.newOpen') }))
    const nu = within(inDialog().getByRole('group', { name: t('edit.src.new') }))
    const add = nu.getByRole('button', { name: t('edit.src.add') })
    expect(add).toBeDisabled()
    await userEvent.type(nu.getByRole('textbox', { name: t('edit.f.url') }), 'https://www.example.com/andrew-at-14')
    await userEvent.type(nu.getByRole('textbox', { name: t('edit.f.title') }), 'Andrew at fourteen')
    await userEvent.type(nu.getByRole('textbox', { name: t('edit.f.publisher') }), 'Example')
    await userEvent.click(add)
    expect(dialog().querySelector('[data-source="new:1"]')).toHaveTextContent('Example · Andrew at fourteen')
    await userEvent.type(reasonBox(), '见这篇文章')
    const { url, patch } = linkPatch()
    expect(url.searchParams.get('title')).toBe(t('edit.issueTitleFill', { label: 'Andrew · 7 Plus Seven · 工作 / 职业' }))
    expect(patch.value).toEqual({ status: 'confirmed', text: { zh: '在读寄宿学校', en: 'At boarding school' }, sourceIds: ['film-f14', 'new:1'] })
    expect(patch.newSources).toEqual([{ ref: 'new:1', url: 'https://www.example.com/andrew-at-14', title: 'Andrew at fourteen', publisher: 'Example', kind: 'news' }])
    const r = applyPatch(files, patch, { today: '2026-11-16' })
    expect(r.ok && r.created.map((s) => s.id)).toEqual(['p-andrew-example'])
    expect(within(dialog().querySelector('.preview') as HTMLElement).getByText(`${t('edit.md.added')}${t('p.colon')}${t('src.label')} · Example · Andrew at fourteen`)).toBeInTheDocument()
  })

  it('one empty language blocks, unless the contributor asks the reviewer to translate', async () => {
    open()
    await userEvent.click(fillBtn('Andrew · 7 Plus Seven · 工作 / 职业'))
    await userEvent.type(bi(t('edit.f.text'), 'zh'), '在读寄宿学校')
    await userEvent.type(reasonBox(), '片中说的')
    expect(problems()).toEqual([t('check.MISSING_LANG')])
    await userEvent.click(inDialog().getByRole('checkbox', { name: t('edit.needsTranslation') }))
    expect(problems()).toEqual([t('check.MISSING_LANG_ok')])
    expect(linkPatch().patch.needsTranslation).toBe(true)
  })

  it('a question from the person page: only the changed field differs', async () => {
    open()
    await userEvent.click(editBtn('Seven Up! · Andrew · 问题 f07-001'))
    const zh = inDialog().getByRole('textbox', { name: t('edit.f.qZh') })
    expect(zh).toHaveValue('你读什么报纸？')
    await userEvent.clear(zh)
    await userEvent.type(zh, '你平时读哪份报纸？')
    await userEvent.type(reasonBox(), '翻译更自然')
    const { patch } = linkPatch()
    const before = readTarget(files, parseAddress('question/f07-001')!)
    expect(patch.value).toEqual({ ...(before as object), zh: '你平时读哪份报纸？' })
  })

  it('Escape closes the panel and returns focus to the ✎ that opened it', async () => {
    open()
    const btn = editBtn('Andrew · 35 Up · 工作 / 职业')
    await userEvent.click(btn)
    expect(dialog()).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(btn)
  })

  it('copying gives the whole suggestion as text, including the JSON the bot reads', async () => {
    open()
    await userEvent.click(editBtn('Andrew · 35 Up · 工作 / 职业'))
    await userEvent.clear(bi(t('edit.f.text'), 'en'))
    await userEvent.type(bi(t('edit.f.text'), 'en'), 'Articled clerk')
    await userEvent.type(reasonBox(), 'why')
    await userEvent.click(inDialog().getByRole('button', { name: t('edit.copy') }))
    const copied = inDialog().queryByRole('button', { name: t('edit.copied') })
    const text = copied ? await navigator.clipboard.readText() : (dialog().querySelector('textarea.fallback') as HTMLTextAreaElement).value
    expect(text).toContain('"target": "state/andrew/f35/work"')
    expect(text).toContain('```json')
  })
})

describe('✎ buttons elsewhere', () => {
  it('an opened overview card offers the cell it shows; an absent card offers participation', async () => {
    location.hash = '#/overview'
    render(Overview, { idx, age: 35, dim: 'work' })
    const card = (k: string) => document.querySelector(`[data-card="${k}"]`) as HTMLElement
    await userEvent.click(card('andrew/f35').querySelector('button')!)
    expect(card('andrew/f35').querySelector('[data-edit="state/andrew/f35/work"]')).not.toBeNull()
    await userEvent.click(card('charles/f35').querySelector('button')!)
    expect(card('charles/f35').querySelector('[data-edit="participation/charles/f35"]')).not.toBeNull()
  })

  it('the person page offers profile, participation, every cell and the final state', () => {
    render(Person, { idx, id: 'charles' })
    for (const a of ['person/charles', 'participation/charles/f28', 'state/charles/f07/work', 'final/charles']) {
      expect(document.querySelector(`[data-edit="${a}"]`), a).not.toBeNull()
    }
    expect(document.querySelector('[data-edit="state/charles/f07/work"]')).toHaveTextContent(t('edit.fill'))
  })

  it('an opened question in the library offers itself', async () => {
    Element.prototype.scrollIntoView = () => {}
    location.hash = '#/questions'
    render(Questions, { idx, open: 'f28-002' })
    expect(document.querySelector('.qrow[data-q="f28-002"] [data-edit="question/f28-002"]')).not.toBeNull()
  })
})
