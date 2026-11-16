import { describe, expect, it } from 'vitest'
import { validateDataset } from '../../src/lib/data/validate.ts'
import type { Dataset, ErrorCode, Question } from '../../src/lib/data/types.ts'
import { makeFixture } from '../fixtures/dataset.ts'

const codes = (ds: Dataset, opts = {}) => validateDataset(ds, opts).map((e) => e.code)
const row = (ds: Dataset, p: string, f: string) => ds.states.find((s) => s.personId === p && s.filmId === f)!
const quoteQ = (n: number, en = 'Yes.'): Question => ({
  id: `f35-9${n}`, filmId: 'f35', personId: 'andrew', attribution: 'confirmed', fromRecap: false,
  en: 'Q?', zh: '问？', themeIds: [], answerQuote: { zh: '是。', en }, answerSummary: { zh: '是', en: 'yes' },
  sourceId: 'film-f35', locator: { zh: 'Andrew 段落', en: 'Andrew segment' },
})

describe('validateDataset', () => {
  it('fixture passes', () => {
    expect(validateDataset(makeFixture())).toEqual([])
  })

  it('confirmed dim without source', () => {
    const ds = makeFixture()
    const v = row(ds, 'andrew', 'f35').dims.work
    if (v.status !== 'confirmed') throw new Error('fixture changed')
    v.sourceIds = []
    expect(codes(ds)).toContain<ErrorCode>('MISSING_SOURCE')
  })

  it('confirmed dim with unknown source id is dangling', () => {
    const ds = makeFixture()
    const v = row(ds, 'andrew', 'f35').dims.work
    if (v.status !== 'confirmed') throw new Error('fixture changed')
    v.sourceIds = ['nope']
    expect(codes(ds)).toContain<ErrorCode>('DANGLING_REF')
  })

  it('missing state row', () => {
    const ds = makeFixture()
    ds.states = ds.states.filter((s) => !(s.personId === 'andrew' && s.filmId === 'f35'))
    expect(codes(ds)).toContain<ErrorCode>('MISSING_STATE')
  })

  it('missing dim inside a state row', () => {
    const ds = makeFixture()
    delete (row(ds, 'andrew', 'f14').dims as Partial<Record<string, unknown>>).outlook
    expect(codes(ds)).toContain<ErrorCode>('MISSING_STATE')
  })

  it('4 quotes for one person in one film', () => {
    const ds = makeFixture()
    ds.questions.push(quoteQ(1), quoteQ(2), quoteQ(3))
    expect(codes(ds)).not.toContain<ErrorCode>('QUOTE_LIMIT')
    ds.questions.push(quoteQ(4))
    expect(codes(ds)).toContain<ErrorCode>('QUOTE_LIMIT')
  })

  it('quote with 3 sentences', () => {
    const ds = makeFixture()
    ds.questions.push(quoteQ(1, 'I was. I am. I will be.'))
    expect(codes(ds)).toContain<ErrorCode>('QUOTE_TOO_LONG')
    ds.questions[ds.questions.length - 1] = quoteQ(1, 'I was. I am.')
    expect(codes(ds)).not.toContain<ErrorCode>('QUOTE_TOO_LONG')
  })

  it('forbidden domain anywhere', () => {
    const ds = makeFixture()
    ds.sources[0].url = 'https://www.subtitlecat.example/x'
    expect(codes(ds)).toContain<ErrorCode>('FORBIDDEN_DOMAIN')
    const ds2 = makeFixture()
    ds2.questions[0].zh = '见 StockQ'
    expect(codes(ds2)).toContain<ErrorCode>('FORBIDDEN_DOMAIN')
  })

  it('absent cell with confirmed work', () => {
    const ds = makeFixture()
    row(ds, 'charles', 'f35').dims.work = { status: 'confirmed', text: { zh: 'x', en: 'x' }, sourceIds: ['wiki-up'] }
    expect(codes(ds)).toContain<ErrorCode>('STATE_PARTICIPATION_CONFLICT')

    const ok = makeFixture()
    row(ok, 'charles', 'f35').dims.events = { status: 'confirmed', text: { zh: '事后得知', en: 'Learned later' }, sourceIds: ['wiki-up'] }
    expect(codes(ok)).not.toContain<ErrorCode>('STATE_PARTICIPATION_CONFLICT')
  })

  it('footage_only and deceased cells also conflict', () => {
    const ds = makeFixture()
    row(ds, 'suzy', 'f63').dims.family = { status: 'confirmed', text: { zh: 'x', en: 'x' }, sourceIds: ['wiki-up'] }
    row(ds, 'lynn', 'f70').dims.outlook = { status: 'confirmed', text: { zh: 'x', en: 'x' }, sourceIds: ['wiki-up'] }
    expect(validateDataset(ds).filter((e) => e.code === 'STATE_PARTICIPATION_CONFLICT')).toHaveLength(2)
  })

  it('audio_only and archival cells may hold confirmed dims', () => {
    const ds = makeFixture()
    row(ds, 'charles', 'f70').dims.work = { status: 'confirmed', text: { zh: 'x', en: 'x' }, sourceIds: ['wiki-up'] }
    row(ds, 'nick', 'f70').dims.outlook = { status: 'confirmed', text: { zh: 'x', en: 'x' }, sourceIds: ['wiki-up'] }
    expect(validateDataset(ds)).toEqual([])
  })

  it('state evidence must cite a question about the same person in the same film', () => {
    const ds = makeFixture()
    const v = row(ds, 'andrew', 'f07').dims.outlook
    if (v.status !== 'confirmed') throw new Error('fixture changed')
    expect(codes(ds)).not.toContain<ErrorCode>('DANGLING_REF')
    ds.questions[0].personId = 'suzy'
    expect(validateDataset(ds).some((e) => e.code === 'DANGLING_REF' && /not about andrew/.test(e.message))).toBe(true)
    const ds2 = makeFixture()
    const v2 = row(ds2, 'andrew', 'f35').dims.work
    if (v2.status !== 'confirmed') throw new Error('fixture changed')
    v2.questionIds = ['f07-001']
    expect(validateDataset(ds2).some((e) => e.code === 'DANGLING_REF' && /film/.test(e.message))).toBe(true)
  })

  it('missing en text', () => {
    const ds = makeFixture()
    ds.groups[0].name.en = ''
    expect(codes(ds)).toContain<ErrorCode>('MISSING_LANG')
    const ds2 = makeFixture()
    ds2.questions[1].en = '  '
    expect(codes(ds2)).toContain<ErrorCode>('MISSING_LANG')
  })

  it('dangling personId in question', () => {
    const ds = makeFixture()
    ;(ds.questions[0] as { personId: string }).personId = 'zed'
    expect(codes(ds)).toContain<ErrorCode>('DANGLING_REF')
  })

  it('bad enum values', () => {
    const ds = makeFixture()
    ;(ds.people[0].participation as Record<string, string>).f21 = 'maybe'
    expect(codes(ds)).toContain<ErrorCode>('BAD_ENUM')
  })

  it('film source with url', () => {
    const ds = makeFixture()
    ds.sources.find((s) => s.kind === 'film')!.url = 'https://example.com'
    expect(codes(ds)).toContain<ErrorCode>('FILM_SOURCE_URL')

    const ds2 = makeFixture()
    delete ds2.sources[0].url
    expect(codes(ds2)).toContain<ErrorCode>('MISSING_SOURCE')
  })

  it('sourced theme needs a source, interpretation does not', () => {
    const ds = makeFixture()
    ds.themes[0].sourceIds = []
    expect(codes(ds)).toContain<ErrorCode>('MISSING_SOURCE')
  })

  it('confirmed attribution requires a person; film_only requires none', () => {
    const ds = makeFixture()
    ds.questions[0].personId = null
    expect(codes(ds)).toContain<ErrorCode>('BAD_ENUM')
    const ds2 = makeFixture()
    ds2.questions[1].personId = 'andrew'
    expect(codes(ds2)).toContain<ErrorCode>('BAD_ENUM')
  })

  it('backgrounds and finals must not name anyone (they are anonymous in the guess game)', () => {
    const ds = makeFixture()
    ds.people[0].background.en = 'At school with Charles in Kensington'
    ds.finals[1].text.zh = '和 Andrew 一起做纪录片'
    expect(validateDataset(ds).filter((e) => e.code === 'NAMES_PERSON').map((e) => e.path)).toEqual(['people[0](andrew).background', 'finals[1](charles).text'])
    const ok = makeFixture()
    ok.people[0].background.en = 'Andrews Road school'
    expect(codes(ok)).not.toContain<ErrorCode>('NAMES_PERSON')
  })

  it('MISSING_FINAL only under strictFinals', () => {
    const ds = makeFixture()
    ds.finals = ds.finals.filter((f) => f.personId !== 'nick')
    expect(codes(ds)).not.toContain<ErrorCode>('MISSING_FINAL')
    expect(codes(ds, { strictFinals: true })).toContain<ErrorCode>('MISSING_FINAL')
  })
})
