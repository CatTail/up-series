// One suggested change to one record. The site builds a patch from the edit form, the issue carries it
// as JSON, and the suggestion bot applies it to the data files. Parsing is a strict whitelist: a patch
// can only replace the editable fields of an existing record (or add a final state), never ids, files
// or structure.
import type { Files, Target } from './address.ts'
import { fileOf, formatAddress, parseAddress, personOf, QUESTION_ID, SOURCE_ID } from './address.ts'
import type { Bilingual, DimValue, FilmId, FinalState, Participation, Person, PersonId, Question, Source, SourceKind, StateRow } from './types.ts'
import { ATTRIBUTIONS, FILM_IDS, PARTICIPATIONS, PERSON_IDS, SOURCE_KINDS } from './types.ts'

export type ParticipationValue = { value: Participation; note: Bilingual | null }
export type PersonValue = { fullName: string; background: Bilingual; born: string | null; died: string | null; sourceIds: string[] }
export type FinalValue = { asOfFilmId: FilmId; text: Bilingual; sourceIds: string[] }
export type QuestionValue = {
  en: string
  zh: string
  answerSummary: Bilingual | null
  answerQuote: Bilingual | null
  personId: PersonId | null
  attribution: (typeof ATTRIBUTIONS)[number]
  themeIds: string[]
  locator: Bilingual
}
export type SourceValue = { url: string; title: string; publisher: string; kind: SourceKind }
/** The editable view of a record. `null` only for a final state that has not been written yet. */
export type Value = DimValue | ParticipationValue | PersonValue | FinalValue | QuestionValue | SourceValue | null

export type WebSourceKind = Exclude<SourceKind, 'film'>
export const WEB_SOURCE_KINDS = SOURCE_KINDS.filter((k): k is WebSourceKind => k !== 'film')
/** A source the contributor adds; `ref` ("new:1") stands in for its id in the value's sourceIds. */
export type NewSource = { ref: string; url: string; title: string; publisher: string; kind: WebSourceKind }

export type Patch = {
  v: 1
  target: string
  /** `hashValue` of the record when the suggestion was made, to catch edits made since. */
  base: string
  value: Value
  newSources?: NewSource[]
  /** The contributor left one language empty and asks the reviewer to translate. */
  needsTranslation?: boolean
}

const NEW_REF = /^new:\d{1,2}$/
const THEME_ID = /^[a-z0-9_]{1,40}$/
const MAX_TEXT = 4000
const MAX_LIST = 30

const bi = (b: Bilingual | undefined): Bilingual => ({ zh: b?.zh ?? '', en: b?.en ?? '' })
/** For writing: keep the key order the file already uses for this text (a few entries list en first). */
const biAs = (b: Bilingual, like: Bilingual | undefined): Bilingual =>
  like && Object.keys(like)[0] === 'en' ? { en: b.en, zh: b.zh } : { zh: b.zh, en: b.en }
const clone = <T>(x: T): T => structuredClone(x)

/** Short, stable fingerprint of a value (FNV-1a over its JSON). */
export function hashValue(v: Value | undefined): string {
  const s = JSON.stringify(v ?? null)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

// ---------------------------------------------------------------------------------------------
// Canonical record shapes (same key order as the data files, so a rewrite only touches edits)

function canonDim(v: DimValue, like?: DimValue): DimValue {
  if (v.status === 'confirmed') {
    const text = biAs(bi(v.text), like?.status === 'confirmed' ? like.text : undefined)
    return { status: 'confirmed', text, sourceIds: [...(v.sourceIds ?? [])], ...(v.questionIds?.length ? { questionIds: [...v.questionIds] } : {}) }
  }
  if (v.status === 'not_applicable') return { status: 'not_applicable', reason: biAs(bi(v.reason), like?.status === 'not_applicable' ? like.reason : undefined) }
  return { status: 'not_found' }
}

/** Rebuild an object with `order` first (skipping undefined), then any other keys as they were. */
function ordered<T extends object>(o: T, order: readonly string[]): T {
  const src = o as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of order) if (src[k] !== undefined) out[k] = src[k]
  for (const k of Object.keys(src)) if (!order.includes(k) && src[k] !== undefined) out[k] = src[k]
  return out as T
}
const PERSON_KEYS = ['id', 'name', 'fullName', 'group', 'background', 'born', 'died', 'participation', 'participationNotes', 'sourceIds']
const QUESTION_KEYS = ['id', 'filmId', 'personId', 'attribution', 'fromRecap', 'en', 'zh', 'themeIds', 'answerSummary', 'answerQuote', 'sourceId', 'locator']
const SOURCE_KEYS = ['id', 'url', 'title', 'publisher', 'accessed', 'kind']

type StateFile = { rows: StateRow[]; final: FinalState | null }
const listAt = <T>(files: Files, path: string | null): T[] | undefined => (path && Array.isArray(files[path]) ? (files[path] as T[]) : undefined)

// ---------------------------------------------------------------------------------------------
// Reading and writing one record

/** The record's editable view; undefined when it doesn't exist (a missing final state reads as null). */
export function readTarget(files: Files, t: Target): Value | undefined {
  const path = fileOf(files, t)
  switch (t.kind) {
    case 'state': {
      const row = (files[path!] as StateFile | undefined)?.rows?.find((r) => r.filmId === t.film)
      const v = row?.dims?.[t.dim]
      return v ? canonDim(v) : undefined
    }
    case 'final': {
      const file = files[path!] as StateFile | undefined
      if (!file) return undefined
      const f = file.final
      return f ? { asOfFilmId: f.asOfFilmId, text: bi(f.text), sourceIds: [...f.sourceIds] } : null
    }
    case 'participation': {
      const p = listAt<Person>(files, path)?.find((x) => x.id === t.person)
      if (!p) return undefined
      const note = p.participationNotes?.[t.film]
      return { value: p.participation[t.film], note: note ? bi(note) : null }
    }
    case 'person': {
      const p = listAt<Person>(files, path)?.find((x) => x.id === t.person)
      if (!p) return undefined
      return { fullName: p.fullName, background: bi(p.background), born: p.born ?? null, died: p.died ?? null, sourceIds: [...p.sourceIds] }
    }
    case 'question': {
      const q = listAt<Question>(files, path)?.find((x) => x.id === t.id)
      if (!q) return undefined
      return {
        en: q.en, zh: q.zh,
        answerSummary: q.answerSummary ? bi(q.answerSummary) : null,
        answerQuote: q.answerQuote ? bi(q.answerQuote) : null,
        personId: q.personId, attribution: q.attribution, themeIds: [...q.themeIds], locator: bi(q.locator),
      }
    }
    case 'source': {
      const s = listAt<Source>(files, path)?.find((x) => x.id === t.id)
      return s ? { url: s.url ?? '', title: s.title, publisher: s.publisher, kind: s.kind } : undefined
    }
  }
}

/** Replace the record's editable fields; returns only the files that changed (as new objects). */
function writeTarget(files: Files, t: Target, value: Value, today: string): Files {
  const path = fileOf(files, t)
  if (!path || files[path] === undefined) throw new Error(`no file for ${formatAddress(t)}`)
  const file = clone(files[path]) as unknown
  switch (t.kind) {
    case 'state': {
      const row = (file as StateFile).rows.find((r) => r.filmId === t.film)!
      row.dims[t.dim] = canonDim(value as DimValue, row.dims[t.dim])
      break
    }
    case 'final': {
      const v = value as FinalValue
      const like = (file as StateFile).final?.text
      ;(file as StateFile).final = { personId: t.person, asOfFilmId: v.asOfFilmId, text: biAs(v.text, like), sourceIds: [...v.sourceIds] }
      break
    }
    case 'participation':
    case 'person': {
      const people = file as Person[]
      const i = people.findIndex((x) => x.id === t.person)
      const p = { ...people[i] }
      if (t.kind === 'participation') {
        const v = value as ParticipationValue
        p.participation = { ...p.participation, [t.film]: v.value }
        const notes: Partial<Record<FilmId, Bilingual>> = { ...p.participationNotes }
        if (v.note) notes[t.film] = biAs(v.note, notes[t.film])
        else delete notes[t.film]
        const kept = FILM_IDS.filter((f) => notes[f])
        p.participationNotes = kept.length ? Object.fromEntries(kept.map((f) => [f, notes[f]])) : undefined
      } else {
        const v = value as PersonValue
        Object.assign(p, { fullName: v.fullName, background: biAs(v.background, p.background), born: v.born ?? undefined, died: v.died ?? undefined, sourceIds: [...v.sourceIds] })
      }
      people[i] = ordered(p, PERSON_KEYS)
      break
    }
    case 'question': {
      const qs = file as Question[]
      const i = qs.findIndex((x) => x.id === t.id)
      const v = value as QuestionValue
      const q = qs[i]
      qs[i] = ordered(
        {
          ...q, en: v.en, zh: v.zh, personId: v.personId, attribution: v.attribution, themeIds: [...v.themeIds], locator: biAs(v.locator, q.locator),
          answerSummary: v.answerSummary ? biAs(v.answerSummary, q.answerSummary) : undefined,
          answerQuote: v.answerQuote ? biAs(v.answerQuote, q.answerQuote) : undefined,
        },
        QUESTION_KEYS,
      )
      break
    }
    case 'source': {
      const list = file as Source[]
      const i = list.findIndex((x) => x.id === t.id)
      const v = value as SourceValue
      const moved = v.url !== list[i].url
      list[i] = ordered({ ...list[i], url: v.url, title: v.title, publisher: v.publisher, kind: v.kind, accessed: moved ? today : list[i].accessed }, SOURCE_KEYS)
      break
    }
  }
  return { [path]: file }
}

// ---------------------------------------------------------------------------------------------
// Strict parsing

class Bad extends Error {}
const fail = (m: string): never => {
  throw new Bad(m)
}
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
function obj(x: unknown, where: string, required: string[], optional: string[] = []): Record<string, unknown> {
  if (!isObj(x)) return fail(`${where}: expected an object`)
  for (const k of Object.keys(x)) if (!required.includes(k) && !optional.includes(k)) fail(`${where}: unexpected key "${k}"`)
  for (const k of required) if (!(k in x)) fail(`${where}: missing "${k}"`)
  return x
}
function str(x: unknown, where: string, max = MAX_TEXT): string {
  if (typeof x !== 'string' || x.length > max) return fail(`${where}: expected text up to ${max} characters`)
  return x
}
function biText(x: unknown, where: string): Bilingual {
  const o = obj(x, where, ['zh', 'en'])
  return { zh: str(o.zh, `${where}.zh`), en: str(o.en, `${where}.en`) }
}
function oneOf<T extends string>(list: readonly T[], x: unknown, where: string): T {
  if (typeof x !== 'string' || !(list as readonly string[]).includes(x)) return fail(`${where}: not one of ${list.join(', ')}`)
  return x as T
}
function ids(x: unknown, where: string, re: RegExp): string[] {
  if (!Array.isArray(x) || x.length > MAX_LIST) return fail(`${where}: expected a list of up to ${MAX_LIST} ids`)
  return x.map((v, i) => (typeof v === 'string' && re.test(v) ? v : fail(`${where}[${i}]: bad id`)))
}
const SOURCE_OR_NEW = new RegExp(`${SOURCE_ID.source}|${NEW_REF.source}`)
const refs = (x: unknown, where: string) => ids(x, where, SOURCE_OR_NEW)
const orNull = <T>(x: unknown, f: (x: unknown) => T): T | null => (x === null ? null : f(x))

function parseValue(t: Target, x: unknown): Value {
  switch (t.kind) {
    case 'state': {
      const status = oneOf(['confirmed', 'not_found', 'not_applicable'] as const, isObj(x) ? x.status : undefined, 'value.status')
      if (status === 'confirmed') {
        const o = obj(x, 'value', ['status', 'text', 'sourceIds'], ['questionIds'])
        return canonDim({ status, text: biText(o.text, 'value.text'), sourceIds: refs(o.sourceIds, 'value.sourceIds'), questionIds: o.questionIds === undefined ? undefined : ids(o.questionIds, 'value.questionIds', QUESTION_ID) })
      }
      if (status === 'not_applicable') return { status, reason: biText(obj(x, 'value', ['status', 'reason']).reason, 'value.reason') }
      obj(x, 'value', ['status'])
      return { status }
    }
    case 'participation': {
      const o = obj(x, 'value', ['value', 'note'])
      return { value: oneOf(PARTICIPATIONS, o.value, 'value.value'), note: orNull(o.note, (n) => biText(n, 'value.note')) }
    }
    case 'person': {
      const o = obj(x, 'value', ['fullName', 'background', 'born', 'died', 'sourceIds'])
      return {
        fullName: str(o.fullName, 'value.fullName', 200), background: biText(o.background, 'value.background'),
        born: orNull(o.born, (v) => str(v, 'value.born', 40)), died: orNull(o.died, (v) => str(v, 'value.died', 40)), sourceIds: refs(o.sourceIds, 'value.sourceIds'),
      }
    }
    case 'final': {
      const o = obj(x, 'value', ['asOfFilmId', 'text', 'sourceIds'])
      return { asOfFilmId: oneOf(FILM_IDS, o.asOfFilmId, 'value.asOfFilmId'), text: biText(o.text, 'value.text'), sourceIds: refs(o.sourceIds, 'value.sourceIds') }
    }
    case 'question': {
      const o = obj(x, 'value', ['en', 'zh', 'answerSummary', 'answerQuote', 'personId', 'attribution', 'themeIds', 'locator'])
      return {
        en: str(o.en, 'value.en'), zh: str(o.zh, 'value.zh'),
        answerSummary: orNull(o.answerSummary, (v) => biText(v, 'value.answerSummary')),
        answerQuote: orNull(o.answerQuote, (v) => biText(v, 'value.answerQuote')),
        personId: orNull(o.personId, (v) => oneOf(PERSON_IDS, v, 'value.personId')),
        attribution: oneOf(ATTRIBUTIONS, o.attribution, 'value.attribution'),
        themeIds: ids(o.themeIds, 'value.themeIds', THEME_ID), locator: biText(o.locator, 'value.locator'),
      }
    }
    case 'source': {
      const o = obj(x, 'value', ['url', 'title', 'publisher', 'kind'])
      return { url: str(o.url, 'value.url', 500), title: str(o.title, 'value.title', 300), publisher: str(o.publisher, 'value.publisher', 200), kind: oneOf(WEB_SOURCE_KINDS, o.kind, 'value.kind') }
    }
  }
}

export type Parsed = { ok: true; patch: Patch; target: Target } | { ok: false; error: string }

export function parsePatch(x: unknown): Parsed {
  try {
    const o = obj(x, 'patch', ['v', 'target', 'base', 'value'], ['newSources', 'needsTranslation'])
    if (o.v !== 1) fail('patch.v: unsupported version')
    const target = parseAddress(o.target) ?? fail('patch.target: unknown record address')
    const base = typeof o.base === 'string' && /^[0-9a-f]{8}$/.test(o.base) ? o.base : fail('patch.base: expected an 8-digit hash')
    const value = parseValue(target, o.value)
    let newSources: NewSource[] | undefined
    if (o.newSources !== undefined) {
      if (!Array.isArray(o.newSources) || o.newSources.length > 5) fail('patch.newSources: expected up to 5 sources')
      newSources = (o.newSources as unknown[]).map((s, i) => {
        const w = `patch.newSources[${i}]`
        const n = obj(s, w, ['ref', 'url', 'title', 'publisher', 'kind'])
        return {
          ref: typeof n.ref === 'string' && NEW_REF.test(n.ref) ? n.ref : fail(`${w}.ref: expected "new:<n>"`),
          url: str(n.url, `${w}.url`, 500), title: str(n.title, `${w}.title`, 300), publisher: str(n.publisher, `${w}.publisher`, 200),
          kind: oneOf(WEB_SOURCE_KINDS, n.kind, `${w}.kind`),
        }
      })
      if (new Set(newSources.map((s) => s.ref)).size !== newSources.length) fail('patch.newSources: duplicate ref')
    }
    const used = value && 'sourceIds' in value ? value.sourceIds : []
    for (const r of used) if (NEW_REF.test(r) && !newSources?.some((s) => s.ref === r)) fail(`patch.value.sourceIds: ${r} has no matching new source`)
    if (o.needsTranslation !== undefined && typeof o.needsTranslation !== 'boolean') fail('patch.needsTranslation: expected true or false')
    const patch: Patch = { v: 1, target: formatAddress(target), base, value }
    if (newSources?.length) patch.newSources = newSources
    if (o.needsTranslation) patch.needsTranslation = true
    return { ok: true, patch, target }
  } catch (e) {
    if (e instanceof Bad) return { ok: false, error: e.message }
    throw e
  }
}

// ---------------------------------------------------------------------------------------------
// Applying

export type Applied =
  | { ok: true; changed: Files; files: Files; created: Source[] }
  | { ok: false; error: 'not_found' | 'conflict' | 'read_only'; message: string }

/** Lower-case ascii name for a site, from its host: "www.theguardian.com" → "theguardian". */
export function siteSlug(url: string): string {
  try {
    const parts = new URL(url).hostname.toLowerCase().replace(/^www\./, '').split('.')
    parts.pop()
    if (parts.length > 1 && ['co', 'com', 'org', 'net', 'gov', 'ac', 'edu'].includes(parts[parts.length - 1])) parts.pop()
    return (parts.pop() ?? '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'web'
  } catch {
    return 'web'
  }
}

function allSourceIds(files: Files): Set<string> {
  const out = new Set<string>()
  for (const [k, v] of Object.entries(files)) if (k.startsWith('sources/') && Array.isArray(v)) for (const s of v as Source[]) out.add(s.id)
  return out
}

/**
 * Apply a parsed patch to the data files. `today` (YYYY-MM-DD) dates any new source. Fails if the
 * record is gone, if it changed since the suggestion was made, or if it is read-only (a film source).
 */
export function applyPatch(files: Files, patch: Patch, opts: { today: string }): Applied {
  const t = parseAddress(patch.target)
  if (!t) return { ok: false, error: 'not_found', message: `unknown address ${patch.target}` }
  const current = readTarget(files, t)
  if (current === undefined) return { ok: false, error: 'not_found', message: `${patch.target} does not exist` }
  if (t.kind === 'source' && (current as SourceValue).kind === 'film') return { ok: false, error: 'read_only', message: 'film sources cite the film itself' }
  if (hashValue(current) !== patch.base) return { ok: false, error: 'conflict', message: `${patch.target} changed after the suggestion was made` }

  let value = clone(patch.value)
  const changed: Files = {}
  const created: Source[] = []
  const used = value && 'sourceIds' in value ? value.sourceIds : []
  const fresh = (patch.newSources ?? []).filter((s) => used.includes(s.ref))
  if (fresh.length) {
    const taken = allSourceIds(files)
    const owner = personOf(t)
    const path = owner ? `sources/person-${owner}.json` : 'sources/core.json'
    const list = clone((files[path] as Source[] | undefined) ?? [])
    const map = new Map<string, string>()
    for (const s of fresh) {
      const stem = owner ? `p-${owner}-${siteSlug(s.url)}` : `${siteSlug(s.url)}-${opts.today.slice(0, 4)}`
      let id = stem
      for (let n = 2; taken.has(id); n++) id = `${stem}-${n}`
      taken.add(id)
      map.set(s.ref, id)
      const src: Source = { id, url: s.url, title: s.title, publisher: s.publisher, accessed: opts.today, kind: s.kind }
      list.push(src)
      created.push(src)
    }
    changed[path] = list
    if (value && 'sourceIds' in value) value = { ...value, sourceIds: value.sourceIds.map((r) => map.get(r) ?? r) } as Value
  }
  Object.assign(changed, writeTarget({ ...files, ...changed }, t, value, opts.today))
  return { ok: true, changed, files: { ...files, ...changed }, created }
}

/** Files as they are written to disk: 2-space JSON with a trailing newline. */
export const serialize = (json: unknown) => `${JSON.stringify(json, null, 2)}\n`
