import type { DimKey, FilmId, PersonId } from './data/types.ts'
import { DIM_KEYS, FILM_IDS, PERSON_IDS } from './data/types.ts'

export const AGES = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70] as const

export type Route =
  | { name: 'origins' }
  | { name: 'overview'; age?: number; dim?: DimKey; people?: PersonId[] }
  | { name: 'person'; id?: PersonId }
  | { name: 'guess' }
  | { name: 'questions'; film?: FilmId; person?: PersonId; theme?: string; q?: string; open?: string }
  | { name: 'data' }

const isFilm = (v: string | null): v is FilmId => v !== null && (FILM_IDS as readonly string[]).includes(v)
const isPerson = (v: string | null): v is PersonId => v !== null && (PERSON_IDS as readonly string[]).includes(v)
const isDim = (v: string | null): v is DimKey => v !== null && (DIM_KEYS as readonly string[]).includes(v)
const str = (v: string | null) => (v === null || v === '' ? undefined : v)
/** Valid person ids, de-duplicated, in the given order; undefined when none are left. */
function peopleList(ids: Array<string | null>): PersonId[] | undefined {
  const out: PersonId[] = []
  for (const id of ids) if (isPerson(id) && !out.includes(id)) out.push(id)
  return out.length ? out : undefined
}

/** Drop keys whose value is undefined so routes compare cleanly with toEqual. */
function clean<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T
}

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '')
  const [path, query = ''] = raw.split('?', 2)
  const parts = path.split('/').filter(Boolean)
  const qs = new URLSearchParams(query)
  switch (parts[0]) {
    case 'overview': {
      const age = Number(qs.get('age'))
      const dim = qs.get('dim')
      return clean({
        name: 'overview' as const,
        age: (AGES as readonly number[]).includes(age) ? age : undefined,
        dim: isDim(dim) ? dim : undefined,
        people: peopleList((qs.get('people') ?? '').split(',')),
      })
    }
    case 'person':
      // No id (or an unknown one) is the people index.
      return isPerson(parts[1] ?? null) ? { name: 'person', id: parts[1] as PersonId } : { name: 'person' }
    case 'guess':
      return { name: 'guess' }
    case 'data':
      return { name: 'data' }
    case 'questions': {
      const film = qs.get('film')
      const person = qs.get('person')
      return clean({
        name: 'questions' as const,
        film: isFilm(film) ? film : undefined,
        person: isPerson(person) ? person : undefined,
        theme: str(qs.get('theme')),
        q: str(qs.get('q')),
        open: str(qs.get('open')),
      })
    }
    case 'compare':
      // The old two-person page now lives on the overview chart; keep its links working.
      return clean({ name: 'overview' as const, people: peopleList([qs.get('a'), qs.get('b')]) })
    default:
      return { name: 'origins' }
  }
}

export function toHash(r: Route): string {
  const q = (pairs: Array<[string, string | number | undefined]>) => {
    const qs = new URLSearchParams()
    for (const [k, v] of pairs) if (v !== undefined && v !== '') qs.set(k, String(v))
    const s = qs.toString().replace(/%2C/g, ',')
    return s ? `?${s}` : ''
  }
  switch (r.name) {
    case 'person':
      return r.id ? `#/person/${r.id}` : '#/person'
    case 'overview':
      return `#/overview${q([['age', r.age], ['dim', r.dim], ['people', r.people?.join(',')]])}`
    case 'questions':
      return `#/questions${q([['film', r.film], ['person', r.person], ['theme', r.theme], ['q', r.q], ['open', r.open]])}`
    default:
      return `#/${r.name}`
  }
}
