import type { FilmId, PersonId, Question } from './data/types.ts'

/** Search key: NFKC, lowercase, punctuation/symbols removed (both scripts), whitespace collapsed. */
export function normalize(s: string): string {
  return s.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}]/gu, '').replace(/\s+/g, ' ').trim()
}

export type QuestionFilter = { filmIds?: FilmId[]; personIds?: PersonId[]; themeIds?: string[]; query?: string }

// Film ids are zero-padded ages (f07 … f70), so string order is age order.
const byFilmThenId = (a: Question, b: Question) => a.filmId.localeCompare(b.filmId) || a.id.localeCompare(b.id)

const haystack = (q: Question) =>
  normalize([q.en, q.zh, q.answerSummary?.en, q.answerSummary?.zh, q.answerQuote?.en, q.answerQuote?.zh].filter(Boolean).join(' \u0000 '))

export function filterQuestions(qs: Question[], f: QuestionFilter): Question[] {
  const needle = normalize(f.query ?? '')
  return qs
    .filter((q) => !f.filmIds?.length || f.filmIds.includes(q.filmId))
    .filter((q) => !f.personIds?.length || (q.personId !== null && f.personIds.includes(q.personId)))
    .filter((q) => !f.themeIds?.length || q.themeIds.some((t) => f.themeIds!.includes(t)))
    .filter((q) => !needle || haystack(q).includes(needle))
    .sort(byFilmThenId)
}

/** Same person, at least one shared theme, other films. */
export function relatedQuestions(q: Question, all: Question[]): Question[] {
  if (q.personId === null) return []
  return all
    .filter((x) => x.personId === q.personId && x.filmId !== q.filmId && x.themeIds.some((t) => q.themeIds.includes(t)))
    .sort(byFilmThenId)
}
