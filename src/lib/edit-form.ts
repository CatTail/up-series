// The edit form's fields, and conversions between them and a record's editable value. One flat draft
// covers every kind, so switching a state's status back and forth keeps whatever was typed.
import type { Target } from './data/address.ts'
import type { FinalValue, NewSource, ParticipationValue, PersonValue, QuestionValue, SourceValue, Value, WebSourceKind } from './data/patch.ts'
import type { Bilingual, DimValue, FilmId, Participation, PersonId, SourceKind } from './data/types.ts'

export type Draft = {
  status: DimValue['status']
  text: Bilingual
  reason: Bilingual
  sourceIds: string[]
  questionIds: string[]
  participation: Participation
  note: Bilingual
  fullName: string
  background: Bilingual
  born: string
  died: string
  asOfFilmId: FilmId
  qEn: string
  qZh: string
  summary: Bilingual
  quote: Bilingual
  /** '' = only attributable to the film. */
  personId: PersonId | ''
  themeIds: string[]
  locator: Bilingual
  url: string
  title: string
  publisher: string
  kind: SourceKind
}

const empty = (): Bilingual => ({ zh: '', en: '' })
const copy = (b: Bilingual | null | undefined): Bilingual => ({ zh: b?.zh ?? '', en: b?.en ?? '' })
const trim = (b: Bilingual): Bilingual => ({ zh: b.zh.trim(), en: b.en.trim() })
const isEmpty = (b: Bilingual) => !b.zh.trim() && !b.en.trim()
const orNull = (b: Bilingual) => (isEmpty(b) ? null : trim(b))

export function blankDraft(): Draft {
  return {
    status: 'not_found', text: empty(), reason: empty(), sourceIds: [], questionIds: [], participation: 'present', note: empty(),
    fullName: '', background: empty(), born: '', died: '', asOfFilmId: 'f70', qEn: '', qZh: '', summary: empty(), quote: empty(),
    personId: '', themeIds: [], locator: empty(), url: '', title: '', publisher: '', kind: 'news',
  }
}

/** The form, filled from the record. `fill` opens a not-found cell ready to become a sourced fact. */
export function toDraft(t: Target, v: Value, opts: { fill?: boolean } = {}): Draft {
  const d = blankDraft()
  if (v === null) return d
  switch (t.kind) {
    case 'state': {
      const s = v as DimValue
      d.status = opts.fill && s.status === 'not_found' ? 'confirmed' : s.status
      if (s.status === 'confirmed') Object.assign(d, { text: copy(s.text), sourceIds: [...s.sourceIds], questionIds: [...(s.questionIds ?? [])] })
      if (s.status === 'not_applicable') d.reason = copy(s.reason)
      if (opts.fill && s.status === 'not_found') d.sourceIds = [`film-${t.film}`]
      break
    }
    case 'participation': {
      const p = v as ParticipationValue
      Object.assign(d, { participation: p.value, note: copy(p.note) })
      break
    }
    case 'person': {
      const p = v as PersonValue
      Object.assign(d, { fullName: p.fullName, background: copy(p.background), born: p.born ?? '', died: p.died ?? '', sourceIds: [...p.sourceIds] })
      break
    }
    case 'final': {
      const f = v as FinalValue
      Object.assign(d, { asOfFilmId: f.asOfFilmId, text: copy(f.text), sourceIds: [...f.sourceIds] })
      break
    }
    case 'question': {
      const q = v as QuestionValue
      Object.assign(d, {
        qEn: q.en, qZh: q.zh, summary: copy(q.answerSummary), quote: copy(q.answerQuote), personId: q.personId ?? '',
        themeIds: [...q.themeIds], locator: copy(q.locator),
      })
      break
    }
    case 'source': {
      const s = v as SourceValue
      Object.assign(d, { url: s.url, title: s.title, publisher: s.publisher, kind: s.kind })
      break
    }
  }
  return d
}

/** The record's new value from the form (trimmed; empty optional texts become "none"). */
export function fromDraft(t: Target, d: Draft): Value {
  switch (t.kind) {
    case 'state':
      if (d.status === 'confirmed') {
        return { status: 'confirmed', text: trim(d.text), sourceIds: [...d.sourceIds], ...(d.questionIds.length ? { questionIds: [...d.questionIds] } : {}) }
      }
      if (d.status === 'not_applicable') return { status: 'not_applicable', reason: trim(d.reason) }
      return { status: 'not_found' }
    case 'participation':
      return { value: d.participation, note: orNull(d.note) }
    case 'person':
      return { fullName: d.fullName.trim(), background: trim(d.background), born: d.born.trim() || null, died: d.died.trim() || null, sourceIds: [...d.sourceIds] }
    case 'final':
      return { asOfFilmId: d.asOfFilmId, text: trim(d.text), sourceIds: [...d.sourceIds] }
    case 'question':
      return {
        en: d.qEn.trim(), zh: d.qZh.trim(), answerSummary: orNull(d.summary), answerQuote: orNull(d.quote),
        personId: d.personId || null, attribution: d.personId ? 'confirmed' : 'film_only', themeIds: [...d.themeIds], locator: trim(d.locator),
      }
    case 'source':
      return { url: d.url.trim(), title: d.title.trim(), publisher: d.publisher.trim(), kind: d.kind }
  }
}

/** Whether this kind of record has a list of sources the form edits. */
export const hasSources = (t: Target, d: Draft) => (t.kind === 'state' ? d.status === 'confirmed' : t.kind === 'person' || t.kind === 'final')

/** Whether the form shows any bilingual text (and so the "please translate" box). */
export const hasBilingual = (t: Target, d: Draft) => t.kind !== 'source' && !(t.kind === 'state' && d.status === 'not_found')

export type NewSourceDraft = Omit<NewSource, 'ref' | 'kind'> & { kind: WebSourceKind }

/** Only the new sources the value still cites travel with the patch. */
export const usedNewSources = (v: Value, list: NewSource[]) => {
  const ids = v && 'sourceIds' in v ? v.sourceIds : []
  return list.filter((s) => ids.includes(s.ref))
}
