import type { DataIndex } from './data/index.ts'
import type { Bilingual, DimKey, FilmId, Participation, PersonId } from './data/types.ts'
import { NON_PARTICIPATING } from './data/types.ts'

export type CellView =
  | { kind: 'text'; text: Bilingual; sourceIds: string[]; questionIds?: string[] }
  | { kind: 'not_found' }
  | { kind: 'not_applicable'; reason: Bilingual }
  | { kind: 'participation'; p: Participation; note?: Bilingual }

const participationView = (p: Participation, note?: Bilingual): CellView => (note ? { kind: 'participation', p, note } : { kind: 'participation', p })

export function cellView(idx: DataIndex, personId: PersonId, filmId: FilmId, dim: DimKey): CellView {
  const person = idx.person(personId)
  const p = person.participation[filmId]
  const v = idx.state(personId, filmId).dims[dim]
  if (v.status === 'confirmed' && (dim === 'events' || !NON_PARTICIPATING.includes(p))) {
    return v.questionIds?.length
      ? { kind: 'text', text: v.text, sourceIds: v.sourceIds, questionIds: v.questionIds }
      : { kind: 'text', text: v.text, sourceIds: v.sourceIds }
  }
  if (NON_PARTICIPATING.includes(p)) return participationView(p, person.participationNotes?.[filmId])
  if (v.status === 'not_applicable') return { kind: 'not_applicable', reason: v.reason }
  return { kind: 'not_found' }
}

const SUMMARY_DIMS: DimKey[] = ['work', 'family', 'residence', 'education']

/** One-line state for the overview chips. */
export function chipSummary(idx: DataIndex, personId: PersonId, filmId: FilmId): CellView {
  const person = idx.person(personId)
  const p = person.participation[filmId]
  if (NON_PARTICIPATING.includes(p)) return participationView(p, person.participationNotes?.[filmId])
  for (const d of SUMMARY_DIMS) {
    const c = cellView(idx, personId, filmId, d)
    if (c.kind === 'text') return c
  }
  return { kind: 'not_found' }
}
