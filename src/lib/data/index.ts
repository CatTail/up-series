import type { Dataset, Film, FilmId, FinalState, Group, GroupId, Person, PersonId, Question, Source, StateRow, Theme } from './types.ts'

export type DataIndex = {
  ds: Dataset
  films: Film[]
  groups: Group[]
  peopleOrdered: Person[]
  themes: Theme[]
  person(id: PersonId): Person
  film(id: FilmId): Film
  group(id: GroupId): Group
  state(personId: PersonId, filmId: FilmId): StateRow
  final(personId: PersonId): FinalState | null
  question(id: string): Question | undefined
  theme(id: string): Theme | undefined
  source(id: string): Source | undefined
  questionsByFilm: Map<FilmId, Question[]>
  questionsByPerson: Map<PersonId, Question[]>
}

function must<T>(v: T | undefined, what: string): T {
  if (v === undefined) throw new Error(`unknown ${what}`)
  return v
}

export function buildIndex(ds: Dataset): DataIndex {
  const films = [...ds.films].sort((a, b) => a.age - b.age)
  const groups = [...ds.groups].sort((a, b) => a.order - b.order)
  const gOrder = new Map(groups.map((g, i) => [g.id, i]))
  const peopleOrdered = ds.people
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (gOrder.get(a.p.group) ?? 99) - (gOrder.get(b.p.group) ?? 99) || a.i - b.i)
    .map((x) => x.p)
  const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]))
  const people = byId(ds.people)
  const filmMap = byId(films)
  const groupMap = byId(groups)
  const sources = byId(ds.sources)
  const themes = byId(ds.themes)
  const questions = byId(ds.questions)
  const states = new Map(ds.states.map((s) => [`${s.personId}/${s.filmId}`, s]))
  const finals = new Map(ds.finals.map((f) => [f.personId, f]))
  const filmAge = new Map(films.map((f) => [f.id, f.age]))
  const sortedQs = [...ds.questions].sort(
    (a, b) => (filmAge.get(a.filmId) ?? 0) - (filmAge.get(b.filmId) ?? 0) || a.id.localeCompare(b.id),
  )
  const questionsByFilm = new Map<FilmId, Question[]>()
  const questionsByPerson = new Map<PersonId, Question[]>()
  for (const q of sortedQs) {
    questionsByFilm.set(q.filmId, [...(questionsByFilm.get(q.filmId) ?? []), q])
    if (q.personId) questionsByPerson.set(q.personId, [...(questionsByPerson.get(q.personId) ?? []), q])
  }
  return {
    ds, films, groups, peopleOrdered, themes: ds.themes,
    person: (id) => must(people.get(id), `person ${id}`),
    film: (id) => must(filmMap.get(id), `film ${id}`),
    group: (id) => must(groupMap.get(id), `group ${id}`),
    state: (p, f) => must(states.get(`${p}/${f}`), `state ${p}/${f}`),
    final: (p) => finals.get(p) ?? null,
    question: (id) => questions.get(id),
    theme: (id) => themes.get(id),
    source: (id) => sources.get(id),
    questionsByFilm,
    questionsByPerson,
  }
}
