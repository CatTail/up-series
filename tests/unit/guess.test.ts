import { describe, expect, it } from 'vitest'
import { buildIndex } from '../../src/lib/data/index.ts'
import { buildRound, makeRng, roundOrder } from '../../src/lib/guess.ts'
import { makeFixture } from '../fixtures/dataset.ts'

const idx = buildIndex(makeFixture())

describe('guess', () => {
  it('makeRng is deterministic and in [0,1)', () => {
    const a = makeRng(42)
    const b = makeRng(42)
    const xs = Array.from({ length: 20 }, () => a())
    expect(xs).toEqual(Array.from({ length: 20 }, () => b()))
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true)
    expect(new Set(xs).size).toBe(20)
  })

  it('options are 3 distinct people incl. the target', () => {
    for (let seed = 1; seed < 30; seed++) {
      const r = buildRound('andrew', idx, makeRng(seed))
      const ids = r.options.map((o) => o.personId)
      expect(new Set(ids).size).toBe(3)
      expect(ids).toContain('andrew')
      expect(new Set(r.options.map((o) => o.text.en)).size).toBe(3)
    }
  })

  it('correct index points at target final', () => {
    for (let seed = 1; seed < 30; seed++) {
      const r = buildRound('suzy', idx, makeRng(seed))
      expect(r.options[r.correct].personId).toBe('suzy')
      expect(r.options[r.correct].text).toEqual(idx.final('suzy')!.text)
    }
  })

  it('target position varies across seeds', () => {
    const pos = new Set(Array.from({ length: 30 }, (_, s) => buildRound('andrew', idx, makeRng(s + 1)).correct))
    expect(pos.size).toBe(3)
  })

  it('same seed → same round', () => {
    expect(buildRound('nick', idx, makeRng(7))).toEqual(buildRound('nick', idx, makeRng(7)))
  })

  it('prompt is the first confirmed f07 question with a quote; null when none', () => {
    expect(buildRound('andrew', idx, makeRng(1)).prompt?.id).toBe('f07-001')
    expect(buildRound('charles', idx, makeRng(1)).prompt).toBeNull()
  })

  it('lynn round uses her final (asOf f56) and shows deceased note', () => {
    const r = buildRound('lynn', idx, makeRng(3))
    expect(r.options[r.correct].text.en).toContain('librarian')
    expect(r.asOf).toBe('f56')
    expect(r.lastParticipation).toBe('deceased')
  })

  it('people without a final are never used as distractors and get no round', () => {
    const ds = makeFixture()
    ds.finals = ds.finals.filter((f) => f.personId !== 'charles')
    const i2 = buildIndex(ds)
    for (let seed = 1; seed < 40; seed++) {
      expect(buildRound('andrew', i2, makeRng(seed)).options.map((o) => o.personId)).not.toContain('charles')
    }
    expect(roundOrder(i2, makeRng(1))).not.toContain('charles')
  })

  it('roundOrder is a permutation of everyone with a final', () => {
    const o = roundOrder(idx, makeRng(5))
    expect([...o].sort()).toEqual(['andrew', 'charles', 'lynn', 'nick', 'suzy'])
    expect(roundOrder(idx, makeRng(5))).toEqual(o)
  })
})
