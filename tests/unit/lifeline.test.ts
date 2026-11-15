import { describe, expect, it } from 'vitest'
import { buildIndex } from '../../src/lib/data/index.ts'
import { layoutLifelines, lensColumns, lensRow, lifelineTopology } from '../../src/lib/viz/lifeline.ts'
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

describe('lifelineTopology', () => {
  const topo = (id: string) => lifelineTopology(idx.person(id as never), idx.films)
  it('is index based: charles is absent from f28 to f63, special at f70', () => {
    const t = topo('charles')
    expect(t.markers.map((m) => m.kind)).toEqual(['present', 'present', 'present', 'absent', 'absent', 'absent', 'absent', 'absent', 'absent', 'special'])
    expect(t.segments.map((s) => s.style)).toEqual(['solid', 'solid', 'faded', 'faded', 'faded', 'faded', 'faded', 'faded', 'faded'])
  })
  it('splits the segment holding a death: solid to the death, faded after', () => {
    const t = topo('nick')
    expect(t.death).toMatchObject({ i: 8, label: '† 2023' })
    expect(t.death!.f).toBeGreaterThan(0)
    expect(t.death!.f).toBeLessThan(1)
    const last = t.segments.filter((s) => s.i === 8)
    expect(last).toEqual([
      expect.objectContaining({ t0: 0, t1: t.death!.f, style: 'solid' }),
      expect.objectContaining({ t0: t.death!.f, t1: 1, style: 'faded' }),
    ])
  })
  it('stops at deceased films', () => {
    const t = topo('lynn')
    expect(t.segments.map((s) => s.i)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(t.markers).toHaveLength(8)
  })
})

describe('lensColumns', () => {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
  it('equal columns when no age is open', () => {
    const c = lensColumns(10, null)
    expect(c.widths.every((w) => Math.abs(w - 10) < 1e-9)).toBe(true)
    expect(c.lefts[0]).toBe(0)
    expect(c.centres[3]).toBeCloseTo(35)
  })
  it('the open column takes `wide` percent, the rest share what is left', () => {
    const c = lensColumns(10, 3, 55)
    expect(c.widths[3]).toBe(55)
    expect(c.widths[0]).toBeCloseTo(5)
    expect(sum(c.widths)).toBeCloseTo(100)
    expect(c.lefts[4]).toBeCloseTo(15 + 55)
    expect(c.lefts[9] + c.widths[9]).toBeCloseTo(100)
  })
})

describe('lensRow', () => {
  const topo = (id: string) => lifelineTopology(idx.person(id as never), idx.films)
  it('without cards, markers sit at column centres and segments join centres', () => {
    const c = lensColumns(10, null)
    const r = lensRow(topo('andrew'), c, () => false)
    expect(r.markers.map((m) => m.x)).toEqual(c.centres)
    expect(r.segments[0]).toMatchObject({ x: c.centres[0], style: 'solid' })
    expect(r.segments[0].w).toBeCloseTo(c.centres[1] - c.centres[0])
  })
  it('a card column anchors lines at its edges and puts the marker on its left edge', () => {
    const c = lensColumns(10, 3)
    const r = lensRow(topo('andrew'), c, (i) => i === 3)
    expect(r.markers[3].x).toBe(c.lefts[3])
    const into = r.segments.find((s) => s.i === 2)!
    const out = r.segments.find((s) => s.i === 3)!
    expect(into.x + into.w).toBeCloseTo(c.lefts[3])
    expect(out.x).toBeCloseTo(c.lefts[3] + c.widths[3])
    expect(out.x + out.w).toBeCloseTo(c.centres[4])
  })
  it('a death next to an open column is placed between the card edge and the next node, never under the card', () => {
    const c = lensColumns(10, 7)
    const r = lensRow(topo('lynn'), c, (i) => i === 7)
    const edge = c.lefts[7] + c.widths[7]
    expect(r.death!.x).toBeGreaterThan(edge)
    expect(r.death!.x).toBeLessThan(c.centres[8])
    expect(r.death!.label).toBe('† 2013')
  })
  it('drops zero-length segments between two adjacent cards', () => {
    const c = lensColumns(10, null)
    const r = lensRow(topo('andrew'), c, () => true)
    expect(r.segments).toEqual([])
  })
})
