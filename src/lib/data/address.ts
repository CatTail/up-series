// Stable addresses for every record a contributor can suggest a change to. The site, the issue form,
// the suggestion bot and the PR summary all name records this way, e.g. "state/andrew/f35/work".
import type { DataIndex } from './index.ts'
import type { DimKey, FilmId, PersonId } from './types.ts'
import { DIM_KEYS, FILM_IDS, PERSON_IDS } from './types.ts'

export type Target =
  | { kind: 'state'; person: PersonId; film: FilmId; dim: DimKey }
  | { kind: 'participation'; person: PersonId; film: FilmId }
  | { kind: 'person'; person: PersonId }
  | { kind: 'final'; person: PersonId }
  | { kind: 'question'; id: string }
  | { kind: 'source'; id: string }

export type TargetKind = Target['kind']

/** Raw data files keyed by data-relative path ("states/andrew.json"), as `assembleDataset` takes them. */
export type Files = Record<string, unknown>

const has = <T extends string>(list: readonly T[], v: string | undefined): v is T => v !== undefined && (list as readonly string[]).includes(v)
export const QUESTION_ID = /^(f\d\d)-[a-z0-9]{1,8}$/
export const SOURCE_ID = /^[a-z0-9][a-z0-9-]{0,79}$/

export function parseAddress(s: unknown): Target | null {
  if (typeof s !== 'string' || s.length > 120) return null
  const [kind, a, b, c, ...rest] = s.split('/')
  if (rest.length) return null
  switch (kind) {
    case 'state':
      return has(PERSON_IDS, a) && has(FILM_IDS, b) && has(DIM_KEYS, c) ? { kind, person: a, film: b, dim: c } : null
    case 'participation':
      return has(PERSON_IDS, a) && has(FILM_IDS, b) && c === undefined ? { kind, person: a, film: b } : null
    case 'person':
    case 'final':
      return has(PERSON_IDS, a) && b === undefined ? { kind, person: a } : null
    case 'question': {
      const m = a !== undefined && b === undefined ? QUESTION_ID.exec(a) : null
      return m && has(FILM_IDS, m[1]) ? { kind, id: a! } : null
    }
    case 'source':
      return a !== undefined && b === undefined && SOURCE_ID.test(a) ? { kind, id: a } : null
    default:
      return null
  }
}

export function formatAddress(t: Target): string {
  switch (t.kind) {
    case 'state':
      return `state/${t.person}/${t.film}/${t.dim}`
    case 'participation':
      return `participation/${t.person}/${t.film}`
    case 'person':
    case 'final':
      return `${t.kind}/${t.person}`
    case 'question':
    case 'source':
      return `${t.kind}/${t.id}`
  }
}

/** The person a record belongs to, if any (new sources for it go in that person's source file). */
export function personOf(t: Target): PersonId | null {
  return 'person' in t ? t.person : null
}

/** Data-relative path of the file that holds the record, or null if it can't be found. */
export function fileOf(files: Files, t: Target): string | null {
  switch (t.kind) {
    case 'state':
    case 'final':
      return `states/${t.person}.json`
    case 'participation':
    case 'person':
      return 'people.json'
    case 'question':
      return `questions/${t.id.slice(0, 3)}.json`
    case 'source':
      return (
        Object.keys(files)
          .filter((k) => k.startsWith('sources/') && k.endsWith('.json'))
          .sort()
          .find((k) => Array.isArray(files[k]) && (files[k] as Array<{ id?: string }>).some((s) => s.id === t.id)) ?? null
      )
  }
}

/** Translates a ui.json key: `t` from i18n in the browser, a plain lookup in Node scripts. */
export type Tr = (key: string) => string

/** A short human name for the record, e.g. "Andrew · 35 Up · 工作 / 职业". */
export function labelOf(idx: DataIndex, t: Target, ui: Tr): string {
  const name = (p: PersonId) => idx.ds.people.find((x) => x.id === p)?.name ?? p
  const title = (f: FilmId) => idx.ds.films.find((x) => x.id === f)?.title ?? f
  switch (t.kind) {
    case 'state':
      return `${name(t.person)} · ${title(t.film)} · ${ui(`dim.${t.dim}`)}`
    case 'participation':
      return `${name(t.person)} · ${title(t.film)} · ${ui('edit.f.participation')}`
    case 'person':
      return `${name(t.person)} · ${ui('edit.k.person')}`
    case 'final':
      return `${name(t.person)} · ${ui('person.final')}`
    case 'question': {
      const q = idx.question(t.id)
      const who = q?.personId ? `${name(q.personId)} · ` : ''
      return `${q ? title(q.filmId) : t.id.slice(0, 3)} · ${who}${ui('edit.k.question')} ${t.id}`
    }
    case 'source': {
      const s = idx.source(t.id)
      return `${ui('src.label')} · ${s ? `${s.publisher} · ${s.title}` : t.id}`
    }
  }
}
