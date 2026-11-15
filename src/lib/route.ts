import type { FilmId, PersonId } from './data/types.ts'
import { FILM_IDS, PERSON_IDS } from './data/types.ts'

export const AGES = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70] as const

export type Route =
  | { name: 'origins' }
  | { name: 'overview'; age?: number }
  | { name: 'person'; id: PersonId }
  | { name: 'guess' }
  | { name: 'questions'; film?: FilmId; person?: PersonId; theme?: string; q?: string; open?: string }
  | { name: 'compare'; a?: PersonId; b?: PersonId }

const isFilm = (v: string | null): v is FilmId => v !== null && (FILM_IDS as readonly string[]).includes(v)
const isPerson = (v: string | null): v is PersonId => v !== null && (PERSON_IDS as readonly string[]).includes(v)
const str = (v: string | null) => (v === null || v === '' ? undefined : v)

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
      return clean({ name: 'overview' as const, age: (AGES as readonly number[]).includes(age) ? age : undefined })
    }
    case 'person':
      return isPerson(parts[1] ?? null) ? { name: 'person', id: parts[1] as PersonId } : { name: 'origins' }
    case 'guess':
      return { name: 'guess' }
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
    case 'compare': {
      const a = qs.get('a')
      const b = qs.get('b')
      return clean({ name: 'compare' as const, a: isPerson(a) ? a : undefined, b: isPerson(b) ? b : undefined })
    }
    default:
      return { name: 'origins' }
  }
}

export function toHash(r: Route): string {
  const q = (pairs: Array<[string, string | number | undefined]>) => {
    const qs = new URLSearchParams()
    for (const [k, v] of pairs) if (v !== undefined && v !== '') qs.set(k, String(v))
    const s = qs.toString()
    return s ? `?${s}` : ''
  }
  switch (r.name) {
    case 'person':
      return `#/person/${r.id}`
    case 'overview':
      return `#/overview${q([['age', r.age]])}`
    case 'questions':
      return `#/questions${q([['film', r.film], ['person', r.person], ['theme', r.theme], ['q', r.q], ['open', r.open]])}`
    case 'compare':
      return `#/compare${q([['a', r.a], ['b', r.b]])}`
    default:
      return `#/${r.name}`
  }
}
