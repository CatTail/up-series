import { scaleLinear } from 'd3-scale'
import type { Film, FilmId, Group, GroupId, Participation, Person, PersonId } from '../data/types.ts'

export type MarkerKind = 'present' | 'absent' | 'special'
export type LifelineRow = {
  personId: PersonId
  groupId: GroupId
  y: number
  markers: Array<{ filmId: FilmId; x: number; kind: MarkerKind; p: Participation }>
  segments: Array<{ x1: number; x2: number; style: 'solid' | 'faded'; from: FilmId; to: FilmId }>
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
    const parts = films.map((f) => person.participation[f.id])
    const markers = films.flatMap((f, i) => {
      const kind = MARKER[parts[i]]
      return kind ? [{ filmId: f.id, x: xOf(i), kind, p: parts[i] }] : []
    })
    let death: LifelineRow['death']
    if (person.died) {
      const dy = yearOf(person.died)
      const i = films.findIndex((f, k) => k < films.length - 1 && f.year <= dy && dy < films[k + 1].year)
      if (i >= 0) {
        const f = (dy - films[i].year) / (films[i + 1].year - films[i].year)
        death = { x: xOf(i) + (xOf(i + 1) - xOf(i)) * f, label: `† ${person.died.slice(0, 4)}` }
      }
    }
    // The life line ends at a death; anything drawn after it (to an archival interview) is faded.
    const segments: LifelineRow['segments'] = []
    for (let i = 0; i < films.length - 1; i++) {
      const a = parts[i]
      const b = parts[i + 1]
      if (a === 'deceased' || b === 'deceased') continue
      const x1 = xOf(i)
      const x2 = xOf(i + 1)
      const style = isGap(a) || isGap(b) ? 'faded' : 'solid'
      const seg = { from: films[i].id, to: films[i + 1].id }
      if (death && death.x > x1 && death.x < x2) {
        segments.push({ ...seg, x1, x2: death.x, style })
        segments.push({ ...seg, x1: death.x, x2, style: 'faded' })
      } else {
        segments.push({ ...seg, x1, x2, style: death && x1 >= death.x ? 'faded' : style })
      }
    }
    return { personId: person.id, groupId: person.group, y, markers, segments, death }
  })
  return { height: y + opts.rowHeight / 2 + 8, width: opts.width, xOf, rows }
}
