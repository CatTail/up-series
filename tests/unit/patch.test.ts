import { describe, expect, it } from 'vitest'
import type { Files } from '../../src/lib/data/address.ts'
import { parseAddress } from '../../src/lib/data/address.ts'
import { assembleDataset } from '../../src/lib/data/assemble.ts'
import type { Patch, Value } from '../../src/lib/data/patch.ts'
import { applyPatch, hashValue, parsePatch, readTarget, serialize, siteSlug } from '../../src/lib/data/patch.ts'
import type { Person, Question, Source } from '../../src/lib/data/types.ts'
import { validateCore, validateDataset } from '../../src/lib/data/validate.ts'
import { fixtureFiles } from '../fixtures/files.ts'

const today = '2026-11-16'
const read = (files: Files, a: string) => readTarget(files, parseAddress(a)!)
/** A patch against the current record, the way the site builds one. */
function patchFor(files: Files, target: string, value: Value, extra: Partial<Patch> = {}): Patch {
  const p = parsePatch({ v: 1, target, base: hashValue(read(files, target)), value, ...extra })
  if (!p.ok) throw new Error(p.error)
  return p.patch
}
function apply(files: Files, p: Patch) {
  const r = applyPatch(files, p, { today })
  if (!r.ok) throw new Error(r.message)
  return r
}
const changedLines = (a: unknown, b: unknown) => {
  const x = serialize(a).split('\n')
  const y = serialize(b).split('\n')
  return { added: y.filter((l) => !x.includes(l)), removed: x.filter((l) => !y.includes(l)), sameLength: x.length === y.length }
}

describe('readTarget', () => {
  const files = fixtureFiles()
  it('reads each kind of record as its editable view', () => {
    expect(read(files, 'state/andrew/f35/work')).toEqual({ status: 'confirmed', text: { zh: '律师', en: 'Solicitor' }, sourceIds: ['wiki-up'] })
    expect(read(files, 'state/andrew/f14/work')).toEqual({ status: 'not_found' })
    expect(read(files, 'participation/charles/f70')).toEqual({ value: 'audio_only', note: { zh: '只有录音和照片', en: 'Audio and photos only' } })
    expect(read(files, 'participation/andrew/f70')).toEqual({ value: 'present', note: null })
    expect(read(files, 'person/lynn')).toMatchObject({ fullName: 'Lynn Johnson', born: null, died: '2013-05' })
    expect(read(files, 'final/nick')).toMatchObject({ asOfFilmId: 'f70', sourceIds: ['wiki-up'] })
    expect(read(files, 'question/f28-001')).toMatchObject({ personId: null, attribution: 'film_only', answerSummary: null, answerQuote: null })
    expect(read(files, 'source/film-f07')).toMatchObject({ kind: 'film', url: '' })
    expect(read(files, 'question/f35-999')).toBeUndefined()
  })
})

describe('parsePatch', () => {
  const files = fixtureFiles()
  const good = () => ({ v: 1, target: 'state/andrew/f35/work', base: hashValue(read(files, 'state/andrew/f35/work')), value: { status: 'confirmed', text: { zh: '事务律师', en: 'Solicitor' }, sourceIds: ['wiki-up'] } })

  it('accepts a well-formed patch', () => {
    const p = parsePatch(good())
    expect(p.ok).toBe(true)
  })

  it('rejects anything outside the whitelist', () => {
    const cases: Array<[string, (x: ReturnType<typeof good>) => unknown]> = [
      ['not an object', () => 'hello'],
      ['unknown top-level key', (x) => ({ ...x, file: '../../package.json' })],
      ['wrong version', (x) => ({ ...x, v: 2 })],
      ['unknown target', (x) => ({ ...x, target: 'state/andrew/f35/salary' })],
      ['path in target', (x) => ({ ...x, target: '../people.json' })],
      ['bad base', (x) => ({ ...x, base: 'abc' })],
      ['extra key in value', (x) => ({ ...x, value: { ...x.value, personId: 'nick' } })],
      ['bad status', (x) => ({ ...x, value: { ...x.value, status: 'rumour' } })],
      ['text not bilingual', (x) => ({ ...x, value: { ...x.value, text: 'Solicitor' } })],
      ['text too long', (x) => ({ ...x, value: { ...x.value, text: { zh: 'x'.repeat(5000), en: 'y' } } })],
      ['bad source id', (x) => ({ ...x, value: { ...x.value, sourceIds: ['<script>'] } })],
      ['new ref without a source', (x) => ({ ...x, value: { ...x.value, sourceIds: ['new:1'] } })],
      ['film new source', (x) => ({ ...x, value: { ...x.value, sourceIds: ['new:1'] }, newSources: [{ ref: 'new:1', url: 'https://x.org', title: 't', publisher: 'p', kind: 'film' }] })],
      ['needsTranslation not boolean', (x) => ({ ...x, needsTranslation: 'yes' })],
    ]
    for (const [why, f] of cases) expect(parsePatch(f(good())), why).toMatchObject({ ok: false })
  })

  it('rejects ids and structure in a question value', () => {
    const base = hashValue(read(files, 'question/f28-002'))
    const value = { ...(read(files, 'question/f28-002') as object), id: 'f28-999' }
    expect(parsePatch({ v: 1, target: 'question/f28-002', base, value })).toMatchObject({ ok: false })
    const film = { ...(read(files, 'question/f28-002') as object), filmId: 'f07' }
    expect(parsePatch({ v: 1, target: 'question/f28-002', base, value: film })).toMatchObject({ ok: false })
  })
})

describe('applyPatch', () => {
  it('changes only the edited lines of the one file', () => {
    const files = fixtureFiles()
    const r = apply(files, patchFor(files, 'state/andrew/f35/work', { status: 'confirmed', text: { zh: '事务律师', en: 'Solicitor (articled)' }, sourceIds: ['wiki-up'] }))
    expect(Object.keys(r.changed)).toEqual(['states/andrew.json'])
    const d = changedLines(files['states/andrew.json'], r.changed['states/andrew.json'])
    expect(d.sameLength).toBe(true)
    expect(d.added).toEqual(['            "zh": "事务律师",', '            "en": "Solicitor (articled)"'])
    expect(read(r.files, 'state/andrew/f35/work')).toMatchObject({ text: { zh: '事务律师' } })
    expect(files['states/andrew.json']).toEqual(fixtureFiles()['states/andrew.json'])
    expect(validateDataset(assembleDataset(r.files))).toEqual([])
  })

  it('refuses when the record changed after the suggestion was made', () => {
    const files = fixtureFiles()
    const p = patchFor(files, 'state/andrew/f35/work', { status: 'not_found' })
    const moved = apply(files, patchFor(files, 'state/andrew/f35/work', { status: 'confirmed', text: { zh: '法官', en: 'Judge' }, sourceIds: ['wiki-up'] })).files
    expect(applyPatch(moved, p, { today })).toMatchObject({ ok: false, error: 'conflict' })
  })

  it('fills a not-found cell with a new web source in that person’s source file', () => {
    const files = fixtureFiles()
    const p = patchFor(
      files, 'state/andrew/f42/family',
      { status: 'confirmed', text: { zh: '已婚，有两个孩子', en: 'Married with two children' }, sourceIds: ['film-f42', 'new:1', 'new:2'] },
      { newSources: [
        { ref: 'new:1', url: 'https://www.theguardian.com/tv/x', title: 'An interview', publisher: 'The Guardian', kind: 'interview' },
        { ref: 'new:2', url: 'https://www.theguardian.com/tv/y', title: 'A review', publisher: 'The Guardian', kind: 'review' },
        { ref: 'new:3', url: 'https://example.org/unused', title: 'Unused', publisher: 'Nobody', kind: 'other' },
      ] },
    )
    const r = apply(files, p)
    expect(Object.keys(r.changed).sort()).toEqual(['sources/person-andrew.json', 'states/andrew.json'])
    expect(r.created.map((s) => s.id)).toEqual(['p-andrew-theguardian', 'p-andrew-theguardian-2'])
    expect((r.changed['sources/person-andrew.json'] as Source[])[0]).toEqual({
      id: 'p-andrew-theguardian', url: 'https://www.theguardian.com/tv/x', title: 'An interview', publisher: 'The Guardian', accessed: today, kind: 'interview',
    })
    expect(read(r.files, 'state/andrew/f42/family')).toMatchObject({ sourceIds: ['film-f42', 'p-andrew-theguardian', 'p-andrew-theguardian-2'] })
    expect(validateDataset(assembleDataset(r.files))).toEqual([])
  })

  it('a question’s new source goes in the core file with a year in its id', () => {
    const files = fixtureFiles()
    const q = read(files, 'question/f28-002') as Extract<Value, { zh: string }>
    expect(siteSlug('https://www.bbc.co.uk/news/1')).toBe('bbc')
    expect(siteSlug('not a url')).toBe('web')
    const p = patchFor(files, 'question/f28-002', { ...q, zh: '你考虑过结婚吗？' })
    const r = apply(files, p)
    expect(Object.keys(r.changed)).toEqual(['questions/f28.json'])
    const changed = (r.changed['questions/f28.json'] as Question[]).find((x) => x.id === 'f28-002')!
    expect(Object.keys(changed)).toEqual(['id', 'filmId', 'personId', 'attribution', 'fromRecap', 'en', 'zh', 'themeIds', 'answerSummary', 'sourceId', 'locator'])
    expect(changed.zh).toBe('你考虑过结婚吗？')
  })

  it('participation notes stay in film order and disappear when the last one is removed', () => {
    const files = fixtureFiles()
    const r1 = apply(files, patchFor(files, 'participation/charles/f28', { value: 'absent', note: { zh: '拒绝参加', en: 'Declined' } }))
    const charles = (r1.files['people.json'] as Person[]).find((p) => p.id === 'charles')!
    expect(Object.keys(charles.participationNotes!)).toEqual(['f28', 'f70'])
    const r2 = apply(r1.files, patchFor(r1.files, 'participation/charles/f28', { value: 'absent', note: null }))
    const r3 = apply(r2.files, patchFor(r2.files, 'participation/charles/f70', { value: 'audio_only', note: null }))
    const after = (r3.files['people.json'] as Person[]).find((p) => p.id === 'charles')!
    expect('participationNotes' in after).toBe(false)
    expect(Object.keys(after)).toEqual(['id', 'name', 'fullName', 'group', 'background', 'participation', 'sourceIds'])
  })

  it('a participation change that contradicts a confirmed state fails validation', () => {
    const files = fixtureFiles()
    const r = apply(files, patchFor(files, 'participation/andrew/f35', { value: 'absent', note: null }))
    expect(validateCore(assembleDataset(r.files)).map((e) => e.code)).toContain('STATE_PARTICIPATION_CONFLICT')
  })

  it('a person’s death date can be added or removed; key order is kept', () => {
    const files = fixtureFiles()
    const v = read(files, 'person/lynn') as Extract<Value, { fullName: string }>
    const r = apply(files, patchFor(files, 'person/lynn', { ...v, died: null }))
    const lynn = (r.files['people.json'] as Person[]).find((p) => p.id === 'lynn')!
    expect('died' in lynn).toBe(false)
    const r2 = apply(r.files, patchFor(r.files, 'person/lynn', { ...v, born: '1956', died: '2013-05' }))
    expect(Object.keys((r2.files['people.json'] as Person[]).find((p) => p.id === 'lynn')!)).toEqual(['id', 'name', 'fullName', 'group', 'background', 'born', 'died', 'participation', 'sourceIds'])
  })

  it('a final state can be written for someone who has none', () => {
    const files = fixtureFiles()
    ;(files['states/nick.json'] as { final: unknown }).final = null
    expect(read(files, 'final/nick')).toBeNull()
    const r = apply(files, patchFor(files, 'final/nick', { asOfFilmId: 'f70', text: { zh: '去世', en: 'Died' }, sourceIds: ['wiki-up'] }))
    expect((r.files['states/nick.json'] as { final: unknown }).final).toEqual({ personId: 'nick', asOfFilmId: 'f70', text: { zh: '去世', en: 'Died' }, sourceIds: ['wiki-up'] })
  })

  it('fixing a source’s link re-dates it; film sources are read-only', () => {
    const files = fixtureFiles()
    const v = read(files, 'source/apted-wb') as Extract<Value, { url: string }>
    const r = apply(files, patchFor(files, 'source/apted-wb', { ...v, url: 'https://writersblocpresents.com/fixed' }))
    expect((r.files['sources/core.json'] as Source[]).find((s) => s.id === 'apted-wb')).toMatchObject({ url: 'https://writersblocpresents.com/fixed', accessed: today })
    const film = { v: 1 as const, target: 'source/film-f07', base: hashValue(read(files, 'source/film-f07')), value: { url: 'https://x.org', title: 't', publisher: 'p', kind: 'news' as const } }
    expect(applyPatch(files, film, { today })).toMatchObject({ ok: false, error: 'read_only' })
  })

  it('a record that does not exist is reported, not created', () => {
    const files = fixtureFiles()
    const p = { v: 1 as const, target: 'question/f35-999', base: hashValue(undefined), value: read(files, 'question/f28-002')! }
    expect(applyPatch(files, p, { today })).toMatchObject({ ok: false, error: 'not_found' })
  })
})

describe('validateCore and validateDataset', () => {
  it('only the full gate checks forbidden domains (so the site bundle never carries the list)', () => {
    const files = fixtureFiles()
    ;(files['sources/core.json'] as Source[])[0].url = 'https://www.subtitlecat.example/x'
    const ds = assembleDataset(files)
    expect(validateCore(ds).map((e) => e.code)).not.toContain('FORBIDDEN_DOMAIN')
    expect(validateDataset(ds).map((e) => e.code)).toContain('FORBIDDEN_DOMAIN')
  })
})

describe('the real data files', () => {
  it('writing any record back unchanged leaves its file byte-identical', async () => {
    const { readFilesFromDisk } = await import('../../src/lib/data/read-node.ts')
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const { listTargets } = await import('../../src/lib/data/diff.ts')
    const dir = join(__dirname, '../../data')
    const files = readFilesFromDisk(dir)
    let n = 0
    for (const t of listTargets(files)) {
      const target = (await import('../../src/lib/data/address.ts')).formatAddress(t)
      const v = read(files, target)
      if (t.kind === 'source' && (v as { kind: string }).kind === 'film') continue
      const p = parsePatch({ v: 1, target, base: hashValue(v), value: v })
      expect(p.ok, target).toBe(true)
      const r = applyPatch(files, (p as { patch: Patch }).patch, { today })
      expect(r.ok, target).toBe(true)
      for (const [path, json] of Object.entries((r as { changed: Files }).changed)) {
        expect(serialize(json), `${target} → ${path}`).toBe(readFileSync(join(dir, path), 'utf8'))
      }
      n++
    }
    expect(n).toBeGreaterThan(1500)
  })
})
