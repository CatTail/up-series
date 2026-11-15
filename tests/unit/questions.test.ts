import { describe, expect, it } from 'vitest'
import type { Question } from '../../src/lib/data/types.ts'
import { filterQuestions, normalize, relatedQuestions } from '../../src/lib/questions.ts'
import { makeFixture } from '../fixtures/dataset.ts'

const base = makeFixture().questions
const mk = (id: string, filmId: Question['filmId'], personId: Question['personId'], themeIds: string[]): Question => ({
  id, filmId, personId, attribution: personId ? 'confirmed' : 'film_only', fromRecap: false, en: `Q ${id}?`, zh: `问 ${id}？`,
  themeIds, sourceId: `film-${filmId}`, locator: { zh: 'x', en: 'x' },
})
const qs: Question[] = [
  ...base,
  mk('f35-001', 'f35', 'andrew', ['work']),
  mk('f14-001', 'f14', 'andrew', ['work', 'education']),
  mk('f14-002', 'f14', 'andrew', ['education']),
  mk('f07-002', 'f07', 'andrew', ['work']),
  mk('f21-001', 'f21', null, ['work']),
]

describe('normalize', () => {
  it('lowercases, NFKC-folds and strips punctuation in both scripts', () => {
    expect(normalize('  CABBIE?! ')).toBe('cabbie')
    expect(normalize('出租车，司机？')).toBe('出租车司机')
    expect(normalize('Ｆｕｌｌ－width  “quotes”')).toBe('fullwidth quotes')
  })
})

describe('filterQuestions', () => {
  it("query 'CABBIE?' matches en 'What does it take to be a good cabbie?'", () => {
    expect(filterQuestions(qs, { query: 'CABBIE?' }).map((q) => q.id)).toEqual(['f28-001'])
  })
  it("query '出租车' matches its zh", () => {
    expect(filterQuestions(qs, { query: '出租车' }).map((q) => q.id)).toEqual(['f28-001'])
  })
  it('query also matches the answer summary', () => {
    expect(filterQuestions(qs, { query: 'financial paper' }).map((q) => q.id)).toEqual(['f07-001'])
  })
  it('person filter excludes film_only', () => {
    const r = filterQuestions(qs, { personIds: ['andrew'] })
    expect(r.every((q) => q.personId === 'andrew')).toBe(true)
    expect(r.map((q) => q.id)).toEqual(['f07-001', 'f07-002', 'f14-001', 'f14-002', 'f35-001'])
  })
  it('film filter includes film_only', () => {
    expect(filterQuestions(qs, { filmIds: ['f28'] }).map((q) => q.id)).toEqual(['f28-001', 'f28-002'])
  })
  it('theme filter and combination', () => {
    expect(filterQuestions(qs, { themeIds: ['education'], personIds: ['andrew'] }).map((q) => q.id)).toEqual(['f14-001', 'f14-002'])
  })
  it('empty filter returns everything sorted by film then id', () => {
    expect(filterQuestions(qs, {}).map((q) => q.id)).toEqual(['f07-001', 'f07-002', 'f14-001', 'f14-002', 'f21-001', 'f28-001', 'f28-002', 'f35-001'])
  })
  it('blank query is ignored', () => {
    expect(filterQuestions(qs, { query: ' ？ ' })).toHaveLength(qs.length)
  })
})

describe('relatedQuestions', () => {
  it('related excludes same film and null person', () => {
    const q = qs.find((x) => x.id === 'f14-001')!
    expect(relatedQuestions(q, qs).map((x) => x.id)).toEqual(['f07-001', 'f07-002', 'f35-001'])
    const fo = qs.find((x) => x.id === 'f21-001')!
    expect(relatedQuestions(fo, qs)).toEqual([])
  })
})
