import { scaleLinear } from 'd3-scale'
import type { Film, FilmId, Group, GroupId, Participation, Person, PersonId } from '../data/types.ts'

export type MarkerKind = 'present' | 'absent' | 'special'
export type SegmentStyle = 'solid' | 'faded'

/** Geometry-free shape of one life line: everything is a film index, plus fractions along the gap to the next film. */
export type Topology = {
  markers: Array<{ i: number; filmId: FilmId; kind: MarkerKind; p: Participation }>
  /** The piece of the gap from film `i` to film `i + 1` between fractions `t0` and `t1`. */
  segments: Array<{ i: number; t0: number; t1: number; style: SegmentStyle; from: FilmId; to: FilmId }>
  /** Death `f` of the way from film `i` to film `i + 1`. */
  death?: { i: number; f: number; label: string }
}

export type LifelineRow = {
  personId: PersonId
  groupId: GroupId
  y: number
  markers: Array<{ filmId: FilmId; x: number; kind: MarkerKind; p: Participation }>
  segments: Array<{ x1: number; x2: number; style: SegmentStyle; from: FilmId; to: FilmId }>
  death?: { x: number; label: string }
}
export type LifelineLayout = { height: number; width: number; xOf(i: number): number; rows: LifelineRow[] }

const MARKER: Partial<Record<Participation, MarkerKind>> = {
  present: 'present', absent: 'absent', footage_only: 'absent', audio_only: 'special', archival_interview: 'special',
}
const isGap = (p: Participation) => p === 'absent' || p === 'footage_only'

/** Fractional year from 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD'. */
function yearOf(date: string): number {
  const [y, m = '7', d = '1'] = date.split('-')
  return Number(y) + (Number(m) - 1) / 12 + (Number(d) - 1) / 365
}

/** Exact at the ends, so positions computed from different anchors compare equal. */
const lerp = (a: number, b: number, t: number) => (t === 0 ? a : t === 1 ? b : a + (b - a) * t)

export function lifelineTopology(person: Person, films: Film[]): Topology {
  const parts = films.map((f) => person.participation[f.id])
  const markers = films.flatMap((f, i) => {
    const kind = MARKER[parts[i]]
    return kind ? [{ i, filmId: f.id, kind, p: parts[i] }] : []
  })
  let death: Topology['death']
  if (person.died) {
    const dy = yearOf(person.died)
    const i = films.findIndex((f, k) => k < films.length - 1 && f.year <= dy && dy < films[k + 1].year)
    if (i >= 0) death = { i, f: (dy - films[i].year) / (films[i + 1].year - films[i].year), label: `† ${person.died.slice(0, 4)}` }
  }
  // The life line ends at a death; anything drawn after it (to an archival interview) is faded.
  const segments: Topology['segments'] = []
  for (let i = 0; i < films.length - 1; i++) {
    const a = parts[i]
    const b = parts[i + 1]
    if (a === 'deceased' || b === 'deceased') continue
    const style: SegmentStyle = isGap(a) || isGap(b) ? 'faded' : 'solid'
    const seg = { i, from: films[i].id, to: films[i + 1].id }
    if (death && death.i === i && death.f > 0) {
      segments.push({ ...seg, t0: 0, t1: death.f, style })
      segments.push({ ...seg, t0: death.f, t1: 1, style: 'faded' })
    } else {
      segments.push({ ...seg, t0: 0, t1: 1, style: death && i >= death.i ? 'faded' : style })
    }
  }
  return death ? { markers, segments, death } : { markers, segments }
}

export function layoutLifelines(
  people: Person[],
  films: Film[],
  groups: Group[],
  opts: { width: number; labelWidth: number; rowHeight: number; groupGap: number; top: number; rightPad?: number },
): LifelineLayout {
  const right = opts.width - (opts.rightPad ?? 130)
  const x = scaleLinear().domain([0, Math.max(films.length - 1, 1)]).range([opts.labelWidth, right])
  const xOf = (i: number) => x(i)
  const gOrder = new Map(groups.map((g) => [g.id, g.order]))
  const ordered = people
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (gOrder.get(a.p.group) ?? 99) - (gOrder.get(b.p.group) ?? 99) || a.i - b.i)
    .map((v) => v.p)

  let y = opts.top + opts.rowHeight / 2
  let last: GroupId | null = null
  const rows: LifelineRow[] = ordered.map((person, n) => {
    if (n > 0) y += opts.rowHeight + (person.group !== last ? opts.groupGap : 0)
    last = person.group
    const topo = lifelineTopology(person, films)
    const at = (i: number, t: number) => lerp(xOf(i), xOf(i + 1), t)
    return {
      personId: person.id,
      groupId: person.group,
      y,
      markers: topo.markers.map((m) => ({ filmId: m.filmId, x: xOf(m.i), kind: m.kind, p: m.p })),
      segments: topo.segments.map((s) => ({ x1: at(s.i, s.t0), x2: at(s.i, s.t1), style: s.style, from: s.from, to: s.to })),
      death: topo.death && { x: at(topo.death.i, topo.death.f), label: topo.death.label },
    }
  })
  return { height: y + opts.rowHeight / 2 + 8, width: opts.width, xOf, rows }
}

/** Column geometry in percent of the track. The open column takes `wide` percent; the others share the rest. */
export type LensColumns = { widths: number[]; lefts: number[]; centres: number[] }

export function lensColumns(n: number, open: number | null, wide = 64): LensColumns {
  const isOpen = open !== null && open >= 0 && open < n && n > 1
  const narrow = isOpen ? (100 - wide) / (n - 1) : 100 / n
  const widths = Array.from({ length: n }, (_, i) => (isOpen && i === open ? wide : narrow))
  const lefts: number[] = []
  let acc = 0
  for (const w of widths) {
    lefts.push(acc)
    acc += w
  }
  return { widths, lefts, centres: lefts.map((l, i) => l + widths[i] / 2) }
}

export type LensRow = {
  markers: Array<{ i: number; filmId: FilmId; kind: MarkerKind; p: Participation; x: number }>
  /** Left edge and width in percent. */
  segments: Array<{ i: number; x: number; w: number; style: SegmentStyle; key: string }>
  death?: { x: number; label: string }
}

/**
 * Place one life line on lens columns. In a column that holds a card, lines stop at the card's edges
 * and the marker sits on its left edge; elsewhere everything is at the column centre.
 */
export function lensRow(topo: Topology, cols: LensColumns, card: (i: number) => boolean): LensRow {
  const inAt = (i: number) => (card(i) ? cols.lefts[i] : cols.centres[i])
  const outAt = (i: number) => (card(i) ? cols.lefts[i] + cols.widths[i] : cols.centres[i])
  const at = (i: number, t: number) => lerp(outAt(i), inAt(i + 1), t)
  const segments = topo.segments
    .map((s) => {
      const x = at(s.i, s.t0)
      return { i: s.i, x, w: at(s.i, s.t1) - x, style: s.style, key: `${s.from}-${s.t0}` }
    })
    .filter((s) => s.w > 1e-6)
  return {
    markers: topo.markers.map((m) => ({ ...m, x: inAt(m.i) })),
    segments,
    death: topo.death && { x: at(topo.death.i, topo.death.f), label: topo.death.label },
  }
}
