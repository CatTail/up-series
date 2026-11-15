import { describe, expect, it } from 'vitest'
import { buildIndex } from '../../src/lib/data/index.ts'
import { layoutLifelines } from '../../src/lib/viz/lifeline.ts'
import { makeFixture } from '../fixtures/dataset.ts'

const idx = buildIndex(makeFixture())
const L = layoutLifelines(idx.peopleOrdered, idx.films, idx.groups, { width: 980, labelWidth: 170, rowHeight: 24, groupGap: 14, top: 26 })
const row = (id: string) => L.rows.find((r) => r.personId === id)!
const seg = (id: string, i: number) => row(id).segments.find((s) => s.x1 === L.xOf(i) && s.x2 === L.xOf(i + 1))

describe('layoutLifelines', () => {
  it('charles segments f21→f28 … f63→f70 are faded, f07→f21 solid', () => {
    expect(seg('charles', 0)?.style).toBe('solid')
    expect(seg('charles', 1)?.style).toBe('solid')
    for (let i = 2; i <= 8; i++) expect(seg('charles', i)?.style).toBe('faded')
  })
  it('charles f70 marker is special', () => {
    expect(row('charles').markers.find((m) => m.filmId === 'f70')?.kind).toBe('special')
    expect(row('charles').markers.find((m) => m.filmId === 'f35')?.kind).toBe('absent')
  })
  it('lynn has no segment after f56 and no marker at f63/f70', () => {
    expect(row('lynn').segments.filter((s) => s.x1 >= L.xOf(7))).toEqual([])
    expect(row('lynn').markers.map((m) => m.filmId)).not.toContain('f63')
    expect(row('lynn').markers.map((m) => m.filmId)).not.toContain('f70')
    expect(row('lynn').markers).toHaveLength(8)
  })
  it('suzy f63 marker is absent and segments f56→f63, f63→f70 are faded', () => {
    expect(row('suzy').markers.find((m) => m.filmId === 'f63')?.kind).toBe('absent')
    expect(seg('suzy', 7)?.style).toBe('faded')
    expect(seg('suzy', 8)?.style).toBe('faded')
    expect(seg('suzy', 6)?.style).toBe('solid')
  })
  it("lynn death.x is strictly between xOf(7) and xOf(8) and label '† 2013'", () => {
    const d = row('lynn').death!
    expect(d.x).toBeGreaterThan(L.xOf(7))
    expect(d.x).toBeLessThan(L.xOf(8))
    expect(d.label).toBe('† 2013')
  })
  it('nick death.x between xOf(8) and xOf(9)', () => {
    const d = row('nick').death!
    expect(d.x).toBeGreaterThan(L.xOf(8))
    expect(d.x).toBeLessThan(L.xOf(9))
    expect(row('andrew').death).toBeUndefined()
  })
  it('the line is solid only up to a death; the rest (e.g. to an archival interview) is faded', () => {
    const r = row('nick')
    const d = r.death!.x
    expect(r.segments.filter((s) => s.style === 'solid' && s.x2 > d + 0.01)).toEqual([])
    expect(r.segments.find((s) => s.x1 === L.xOf(8) && s.x2 === d)?.style).toBe('solid')
    expect(r.segments.find((s) => s.x1 === d && s.x2 === L.xOf(9))?.style).toBe('faded')
  })

  it('groups separated by groupGap', () => {
    const ys = L.rows.map((r) => r.y)
    // fixture order: andrew, charles, suzy (priv) | lynn (east) | nick (rural)
    expect(ys[1] - ys[0]).toBe(24)
    expect(ys[3] - ys[2]).toBe(24 + 14)
    expect(ys[4] - ys[3]).toBe(24 + 14)
    expect(L.height).toBeGreaterThan(ys[4])
  })
  it('x positions span label width to the right edge', () => {
    expect(L.xOf(0)).toBe(170)
    expect(L.xOf(9)).toBeLessThan(980)
  })
})
