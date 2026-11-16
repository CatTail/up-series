import { describe, expect, it } from 'vitest'
import type { Files } from '../../src/lib/data/address.ts'
import { parseAddress } from '../../src/lib/data/address.ts'
import { diffFiles, toMarkdown } from '../../src/lib/data/diff.ts'
import { applyPatch, hashValue, parsePatch, readTarget, type Value } from '../../src/lib/data/patch.ts'
import type { Theme } from '../../src/lib/data/types.ts'
import { fixtureFiles, trZh } from '../fixtures/files.ts'

function edit(files: Files, target: string, value: Value, extra = {}) {
  const p = parsePatch({ v: 1, target, base: hashValue(readTarget(files, parseAddress(target)!)), value, ...extra })
  if (!p.ok) throw new Error(p.error)
  const r = applyPatch(files, p.patch, { today: '2026-11-16' })
  if (!r.ok) throw new Error(r.message)
  return r.files
}

describe('diffFiles', () => {
  it('lists the record, the changed fields and the file', () => {
    const before = fixtureFiles()
    const after = edit(before, 'state/andrew/f35/work', { status: 'confirmed', text: { zh: '事务律师', en: 'Solicitor' }, sourceIds: ['wiki-up', 'apted-wb'] })
    const d = diffFiles(before, after, trZh, 'zh')
    expect(d.files).toEqual(['states/andrew.json'])
    expect(d.changes).toHaveLength(1)
    expect(d.changes[0]).toMatchObject({ address: 'state/andrew/f35/work', label: 'Andrew · 35 Up · 工作 / 职业', kind: 'changed' })
    expect(d.changes[0].fields).toEqual([
      { label: '内容 · 中文', before: '律师', after: '事务律师' },
      { label: '出处', before: 'Wikipedia · Up (film series)', after: 'Wikipedia · Up (film series)\nWriters Bloc · Interview with Michael Apted' },
    ])
  })

  it('shows a status change and a new source as added', () => {
    const before = fixtureFiles()
    const after = edit(
      before, 'state/nick/f42/residence',
      { status: 'confirmed', text: { zh: '住在美国', en: 'Lives in the US' }, sourceIds: ['new:1'] },
      { newSources: [{ ref: 'new:1', url: 'https://news.example.com/a', title: 'Profile', publisher: 'Example News', kind: 'news' }] },
    )
    const d = diffFiles(before, after, trZh, 'zh')
    expect(d.changes.map((c) => [c.address, c.kind])).toEqual([['state/nick/f42/residence', 'changed'], ['source/p-nick-example', 'added']])
    expect(d.changes[0].fields[0]).toEqual({ label: '状态', before: '未查到', after: '有出处' })
    expect(d.files).toEqual(['sources/person-nick.json', 'states/nick.json'])
  })

  it('reports files outside the editable records too', () => {
    const before = fixtureFiles()
    const after = structuredClone(before)
    ;(after['themes.json'] as Theme[])[0].name.zh = '职业'
    expect(diffFiles(before, after, trZh, 'zh')).toEqual({ changes: [], files: ['themes.json'] })
  })
})

describe('toMarkdown', () => {
  it('renders a table that pipes, newlines, html and @mentions cannot break', () => {
    const before = fixtureFiles()
    const after = edit(before, 'state/andrew/f35/work', { status: 'confirmed', text: { zh: 'a | b\nc <img> @someone', en: 'Solicitor' }, sourceIds: ['wiki-up'] })
    const md = toMarkdown(diffFiles(before, after, trZh, 'zh'), trZh)
    expect(md).toContain('#### Andrew · 35 Up · 工作 / 职业')
    expect(md).toContain('`state/andrew/f35/work`')
    expect(md).toContain('| 内容 · 中文 | 律师 | a \\| b<br>c &lt;img> @​someone |')
    expect(md).not.toContain('@someone')
    expect(md).toContain('改动的文件：`data/states/andrew.json`')
  })

  it('says so when nothing changed', () => {
    const f = fixtureFiles()
    expect(toMarkdown(diffFiles(f, f, trZh, 'zh'), trZh)).toBe('没有改动。')
  })
})
