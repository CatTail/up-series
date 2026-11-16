// Readable before → after summaries of data changes, for the edit form's preview, the suggestion
// bot's PR body and the CI job summary.
import type { Files, Target, Tr } from './address.ts'
import { formatAddress, labelOf } from './address.ts'
import { assembleDataset } from './assemble.ts'
import { buildIndex, type DataIndex } from './index.ts'
import type { FinalValue, ParticipationValue, PersonValue, QuestionValue, SourceValue, Value } from './patch.ts'
import { hashValue, readTarget } from './patch.ts'
import type { Bilingual, DimValue, Lang, Person, Question, Source, StateRow } from './types.ts'
import { DIM_KEYS, FILM_IDS } from './types.ts'

export type Field = { label: string; text: string }
export type FieldChange = { label: string; before: string; after: string }
export type Change = { address: string; target: Target; label: string; kind: 'changed' | 'added' | 'removed'; fields: FieldChange[] }

/** Names for ids that appear inside values (sources, films, people, themes), from one or more datasets. */
export type Lookup = { tr: Tr; source(id: string): string; film(id: string): string; person(id: string): string; theme(id: string): string }

export function makeLookup(tr: Tr, lang: Lang, ...idxs: DataIndex[]): Lookup {
  const find = <T>(f: (i: DataIndex) => T | undefined) => {
    for (const i of idxs) {
      const v = f(i)
      if (v !== undefined) return v
    }
    return undefined
  }
  return {
    tr,
    source: (id) => {
      const s = find((i) => i.source(id))
      return s ? (s.kind === 'film' ? s.title : `${s.publisher} · ${s.title}`) : id
    },
    film: (id) => find((i) => i.ds.films.find((f) => f.id === id))?.title ?? id,
    person: (id) => find((i) => i.ds.people.find((p) => p.id === id))?.name ?? id,
    theme: (id) => find((i) => i.theme(id))?.name[lang] ?? id,
  }
}

/**
 * The record's fields as labelled text. Every field of a kind is always listed (empty when it does not
 * apply), so two versions of a record line up field by field.
 */
export function fieldsOf(t: Target, v: Value | undefined, look: Lookup): Field[] {
  const { tr } = look
  const two = (key: string, b: Bilingual | null | undefined): Field[] => [
    { label: `${tr(key)} · ${tr('edit.lang.zh')}`, text: b?.zh ?? '' },
    { label: `${tr(key)} · ${tr('edit.lang.en')}`, text: b?.en ?? '' },
  ]
  const one = (key: string, text: string | null | undefined): Field => ({ label: tr(key), text: text ?? '' })
  const sources = (list: string[] | undefined) => one('edit.f.sources', (list ?? []).map(look.source).join('\n'))
  if (v === undefined || v === null) return []
  switch (t.kind) {
    case 'state': {
      const d = v as DimValue
      const status = d.status === 'confirmed' ? tr('badge.sourced') : d.status === 'not_found' ? tr('state.notFound') : tr('edit.status.not_applicable')
      return [
        one('edit.f.status', status),
        ...two('edit.f.text', d.status === 'confirmed' ? d.text : null),
        ...two('edit.f.reason', d.status === 'not_applicable' ? d.reason : null),
        sources(d.status === 'confirmed' ? d.sourceIds : []),
        one('edit.f.questions', d.status === 'confirmed' ? (d.questionIds ?? []).join(', ') : ''),
      ]
    }
    case 'participation': {
      const p = v as ParticipationValue
      return [one('edit.f.participation', tr(`status.${p.value}`)), ...two('edit.f.note', p.note)]
    }
    case 'person': {
      const p = v as PersonValue
      return [one('edit.f.fullName', p.fullName), ...two('edit.f.background', p.background), one('edit.f.born', p.born), one('edit.f.died', p.died), sources(p.sourceIds)]
    }
    case 'final': {
      const f = v as FinalValue
      return [one('edit.f.asOf', look.film(f.asOfFilmId)), ...two('edit.f.text', f.text), sources(f.sourceIds)]
    }
    case 'question': {
      const q = v as QuestionValue
      return [
        one('edit.f.qEn', q.en), one('edit.f.qZh', q.zh), ...two('edit.f.summary', q.answerSummary), ...two('edit.f.quote', q.answerQuote),
        one('edit.f.asked', q.personId ? look.person(q.personId) : tr('qa.filmOnly')),
        one('edit.f.themes', q.themeIds.map(look.theme).join('、')), ...two('edit.f.locator', q.locator),
      ]
    }
    case 'source': {
      const s = v as SourceValue
      return [one('edit.f.url', s.url), one('edit.f.title', s.title), one('edit.f.publisher', s.publisher), one('edit.f.kind', tr(`edit.kind.${s.kind}`))]
    }
  }
}

/** Fields whose text differs between two versions of one record. */
export function diffValues(t: Target, before: Value | undefined, after: Value | undefined, look: Lookup): FieldChange[] {
  const a = fieldsOf(t, before, look)
  const b = fieldsOf(t, after, look)
  const labels = [...new Set([...a, ...b].map((f) => f.label))]
  const text = (list: Field[], l: string) => list.find((f) => f.label === l)?.text ?? ''
  return labels.map((label) => ({ label, before: text(a, label), after: text(b, label) })).filter((c) => c.before !== c.after)
}

/** Every editable record in a set of data files. */
export function listTargets(files: Files): Target[] {
  const out: Target[] = []
  const people = (Array.isArray(files['people.json']) ? files['people.json'] : []) as Person[]
  for (const p of people) {
    out.push({ kind: 'person', person: p.id })
    for (const f of FILM_IDS) if (p.participation?.[f] !== undefined) out.push({ kind: 'participation', person: p.id, film: f })
  }
  for (const [k, v] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    if (k.startsWith('states/')) {
      const file = v as { rows?: StateRow[]; final?: unknown }
      const person = k.slice(7, -5) as Person['id']
      for (const r of file.rows ?? []) for (const d of DIM_KEYS) if (r.dims?.[d]) out.push({ kind: 'state', person, film: r.filmId, dim: d })
      if (file.final) out.push({ kind: 'final', person })
    } else if (k.startsWith('questions/') && Array.isArray(v)) {
      for (const q of v as Question[]) out.push({ kind: 'question', id: q.id })
    } else if (k.startsWith('sources/') && Array.isArray(v)) {
      for (const s of v as Source[]) out.push({ kind: 'source', id: s.id })
    }
  }
  return out
}

export type FilesDiff = { changes: Change[]; files: string[] }

/** All record-level changes between two versions of the data, plus every file whose JSON differs. */
export function diffFiles(before: Files, after: Files, tr: Tr, lang: Lang): FilesDiff {
  const ia = buildIndex(assembleDataset(before))
  const ib = buildIndex(assembleDataset(after))
  const look = makeLookup(tr, lang, ib, ia)
  const seen = new Set<string>()
  const changes: Change[] = []
  for (const t of [...listTargets(before), ...listTargets(after)]) {
    const address = formatAddress(t)
    if (seen.has(address)) continue
    seen.add(address)
    const a = readTarget(before, t)
    const b = readTarget(after, t)
    if (hashValue(a) === hashValue(b)) continue
    const kind = a === undefined || a === null ? 'added' : b === undefined || b === null ? 'removed' : 'changed'
    let label: string
    try {
      label = labelOf(b === undefined ? ia : ib, t, tr)
    } catch {
      label = address
    }
    changes.push({ address, target: t, label, kind, fields: diffValues(t, a, b, look) })
  }
  const paths = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
  const files = paths.filter((p) => JSON.stringify(before[p]) !== JSON.stringify(after[p]))
  return { changes, files }
}

/** Table-safe text: no pipes or newlines, and no @mentions that would notify people. */
function cell(s: string): string {
  if (!s) return '—'
  return s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/</g, '&lt;').replace(/@/g, '@\u200b').replace(/\r?\n/g, '<br>')
}

export function toMarkdown(d: FilesDiff, tr: Tr): string {
  if (!d.changes.length && !d.files.length) return tr('edit.md.none')
  const out: string[] = []
  for (const c of d.changes) {
    out.push(`#### ${cell(c.label)}${c.kind === 'changed' ? '' : `（${tr(`edit.md.${c.kind}`)}）`}`, '', `\`${c.address}\``, '')
    if (c.fields.length) {
      out.push(`| | ${tr('edit.before')} | ${tr('edit.after')} |`, '|---|---|---|')
      for (const f of c.fields) out.push(`| ${cell(f.label)} | ${cell(f.before)} | ${cell(f.after)} |`)
      out.push('')
    }
  }
  if (d.files.length) out.push(`${tr('edit.md.files')}${tr('p.colon')}${d.files.map((f) => `\`data/${f}\``).join('、')}`)
  return out.join('\n').trim()
}
