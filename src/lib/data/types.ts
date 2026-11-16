export type Lang = 'zh' | 'en'
export type Bilingual = { zh: string; en: string }

export const FILM_IDS = ['f07', 'f14', 'f21', 'f28', 'f35', 'f42', 'f49', 'f56', 'f63', 'f70'] as const
export type FilmId = (typeof FILM_IDS)[number]

export const PERSON_IDS = [
  'andrew', 'charles', 'john', 'suzy', 'bruce',
  'jackie', 'lynn', 'sue', 'tony',
  'paul', 'symon',
  'nick',
  'peter', 'neil',
] as const
export type PersonId = (typeof PERSON_IDS)[number]

export const GROUP_IDS = ['priv', 'east', 'home', 'rural', 'lpool'] as const
export type GroupId = (typeof GROUP_IDS)[number]

export const PARTICIPATIONS = [
  'present', 'absent', 'audio_only', 'archival_interview', 'footage_only', 'deceased',
] as const
export type Participation = (typeof PARTICIPATIONS)[number]

/** Cells where the person did not take part in this film: no confirmed current-state dims except `events`. */
export const NON_PARTICIPATING: readonly Participation[] = ['absent', 'footage_only', 'deceased']

export const SOURCE_KINDS = ['wiki', 'news', 'review', 'interview', 'broadcaster', 'film', 'other'] as const
export type SourceKind = (typeof SOURCE_KINDS)[number]

export type Source = {
  id: string
  /** Required unless kind === 'film'; must be absent for kind === 'film'. */
  url?: string
  title: string
  publisher: string
  /** ISO date the source was read. */
  accessed: string
  kind: SourceKind
}

export const COVERAGES = ['full', 'partial', 'none'] as const
export type Coverage = (typeof COVERAGES)[number]

export type Film = {
  id: FilmId
  age: number
  year: number
  title: string
  firstAired: string
  lastAired: string
  director: string
  broadcaster: string
  episodes: number
  transcriptCoverage: Coverage
  sourceIds: string[]
}

export const COLOR_VARS = ['--series-1', '--series-2', '--series-3', '--series-4', '--series-5'] as const
export type ColorVar = (typeof COLOR_VARS)[number]

export type Group = {
  id: GroupId
  name: Bilingual
  colorVar: ColorVar
  order: number
}

export type Person = {
  id: PersonId
  name: string
  fullName: string
  group: GroupId
  background: Bilingual
  born?: string
  died?: string
  participation: Record<FilmId, Participation>
  participationNotes?: Partial<Record<FilmId, Bilingual>>
  sourceIds: string[]
}

export const DIM_KEYS = ['education', 'work', 'family', 'residence', 'events', 'outlook'] as const
export type DimKey = (typeof DIM_KEYS)[number]

export type DimValue =
  | { status: 'confirmed'; text: Bilingual; sourceIds: string[]; questionIds?: string[] }
  | { status: 'not_found' }
  | { status: 'not_applicable'; reason: Bilingual }

export type StateRow = {
  personId: PersonId
  filmId: FilmId
  dims: Record<DimKey, DimValue>
}

export type FinalState = {
  personId: PersonId
  asOfFilmId: FilmId
  text: Bilingual
  sourceIds: string[]
}

export const INTENT_KINDS = ['sourced', 'interpretation'] as const
export type Theme = {
  id: string
  name: Bilingual
  intent: Bilingual
  intentKind: (typeof INTENT_KINDS)[number]
  sourceIds: string[]
}

export const ATTRIBUTIONS = ['confirmed', 'film_only'] as const
export type Question = {
  id: string
  filmId: FilmId
  personId: PersonId | null
  attribution: (typeof ATTRIBUTIONS)[number]
  fromRecap: boolean
  en: string
  zh: string
  themeIds: string[]
  answerSummary?: Bilingual
  answerQuote?: Bilingual
  sourceId: string
  locator: Bilingual
}

export const ORIGIN_KINDS = ['quote', 'fact', 'interpretation'] as const
export type OriginsBlock = {
  id: string
  text: Bilingual
  kind: (typeof ORIGIN_KINDS)[number]
  sourceIds: string[]
  /** Optional attribution line shown under a quote, e.g. "Michael Apted, 2013". */
  cite?: Bilingual
}
export type OriginsContent = { blocks: OriginsBlock[] }

export type Dataset = {
  sources: Source[]
  films: Film[]
  groups: Group[]
  people: Person[]
  states: StateRow[]
  /** Only finals that have been researched; a person may be missing until Task 10. */
  finals: FinalState[]
  themes: Theme[]
  questions: Question[]
  origins: OriginsContent
  ui: Record<string, Bilingual>
}

export const ERROR_CODES = [
  'MISSING_SOURCE', 'DANGLING_REF', 'BAD_ENUM', 'MISSING_LANG', 'MISSING_STATE', 'MISSING_FINAL',
  'QUOTE_LIMIT', 'QUOTE_TOO_LONG', 'FORBIDDEN_DOMAIN', 'STATE_PARTICIPATION_CONFLICT', 'FILM_SOURCE_URL', 'NAMES_PERSON',
] as const
export type ErrorCode = (typeof ERROR_CODES)[number]

export type ValidationError = { code: ErrorCode; path: string; message: string }

/** Strings that must never appear in published data or build output. */
export const FORBIDDEN_DOMAINS = ['subtitlecat', 'springfieldspringfield', 'stockq'] as const

export const MAX_QUOTES_PER_PERSON_FILM = 3
export const MAX_QUOTE_SENTENCES = 2
