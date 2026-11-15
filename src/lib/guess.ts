import type { DataIndex } from './data/index.ts'
import type { Bilingual, FilmId, GroupId, Participation, PersonId, Question } from './data/types.ts'

export type GuessRound = {
  personId: PersonId
  background: Bilingual
  groupId: GroupId
  prompt: Question | null
  options: Array<{ personId: PersonId; text: Bilingual }>
  correct: number
  /** Film the target's final state is taken from, and how they appear in the last film (for the "why this is the final" note). */
  asOf: FilmId
  lastParticipation: Participation
}

export type GuessState = { order: PersonId[]; i: number; answers: Array<{ personId: PersonId; chosen: number; correct: boolean }> }

// First names as spoken in the films (with variants) and surnames — hidden in the anonymous 7-year prompt.
const NAMES = [
  'Andrew', 'Charles', 'Charlie', 'John', 'Johnny', 'Suzy', 'Suzi', 'Susie', 'Suzanne', 'Susan', 'Bruce',
  'Jackie', 'Jacqueline', 'Lynn', 'Lynne', 'Sue', 'Tony', 'Anthony', 'Paul', 'Symon', 'Simon', 'Nick', 'Nicholas',
  'Peter', 'Neil', 'Brackfield', 'Furneaux', 'Brisby', 'Lusk', 'Balden', 'Bassett', 'Johnson', 'Davis', 'Walker',
  'Kligerman', 'Basterfield', 'Hitchon', 'Davies', 'Hughes',
]
const NAME_RE = new RegExp(`\\b(?:${NAMES.join('|')})\\b`, 'g')
const hasName = (s: string) => new RegExp(NAME_RE.source).test(s)

export function maskNames(s: string): string {
  return s.replace(NAME_RE, '……')
}

/** mulberry32 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(xs: T[], rng: () => number): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function roundOrder(idx: DataIndex, rng: () => number): PersonId[] {
  return shuffle(idx.peopleOrdered.filter((p) => idx.final(p.id)).map((p) => p.id), rng)
}

export function buildRound(personId: PersonId, idx: DataIndex, rng: () => number): GuessRound {
  const person = idx.person(personId)
  const final = idx.final(personId)
  if (!final) throw new Error(`no final state for ${personId}`)
  const pool = (idx.questionsByPerson.get(personId) ?? []).filter((q) => q.filmId === 'f07' && q.attribution === 'confirmed' && q.answerQuote)
  const named = (q: Question) => [q.en, q.zh, q.answerQuote!.en, q.answerQuote!.zh].some(hasName)
  const chosen = pool.find((q) => !named(q)) ?? pool[0]
  const prompt: Question | null = chosen
    ? { ...chosen, en: maskNames(chosen.en), zh: maskNames(chosen.zh), answerQuote: { en: maskNames(chosen.answerQuote!.en), zh: maskNames(chosen.answerQuote!.zh) } }
    : null
  const others = shuffle(
    idx.peopleOrdered.filter((p) => p.id !== personId && idx.final(p.id) && idx.final(p.id)!.text.en !== final.text.en),
    rng,
  )
  const picked: Array<{ personId: PersonId; text: Bilingual }> = []
  for (const p of others) {
    const text = idx.final(p.id)!.text
    if (picked.some((x) => x.text.en === text.en)) continue
    picked.push({ personId: p.id, text })
    if (picked.length === 2) break
  }
  const options = shuffle([{ personId, text: final.text }, ...picked], rng)
  const last = idx.films[idx.films.length - 1]
  return {
    personId,
    background: person.background,
    groupId: person.group,
    prompt,
    options,
    correct: options.findIndex((o) => o.personId === personId),
    asOf: final.asOfFilmId,
    lastParticipation: person.participation[last.id],
  }
}
