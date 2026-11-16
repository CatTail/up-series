// Spreadsheet-friendly exports of the data, and the list of gaps contributors can fill.
import type { Target } from './address.ts'
import type { DataIndex } from './index.ts'
import type { Bilingual } from './types.ts'
import { DIM_KEYS } from './types.ts'

/** RFC 4180 CSV with CRLF line ends and a UTF-8 BOM, so Excel shows Chinese correctly. */
export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return `\uFEFF${rows.map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`
}

const zh = (b?: Bilingual | null) => b?.zh ?? ''
const en = (b?: Bilingual | null) => b?.en ?? ''

export function statesCsv(idx: DataIndex): string {
  const rows: Array<Array<string | number>> = [['person', 'name', 'film', 'age', 'dimension', 'status', 'zh', 'en', 'sources', 'address']]
  for (const p of idx.peopleOrdered) {
    for (const f of idx.films) {
      const row = idx.state(p.id, f.id)
      for (const d of DIM_KEYS) {
        const v = row.dims[d]
        const text = v.status === 'confirmed' ? v.text : v.status === 'not_applicable' ? v.reason : null
        rows.push([p.id, p.name, f.title, f.age, d, v.status, zh(text), en(text), v.status === 'confirmed' ? v.sourceIds.join(' ') : '', `state/${p.id}/${f.id}/${d}`])
      }
    }
  }
  return toCsv(rows)
}

export function questionsCsv(idx: DataIndex): string {
  const rows: Array<Array<string | number>> = [
    ['id', 'film', 'age', 'person', 'attribution', 'en', 'zh', 'summary_zh', 'summary_en', 'quote_zh', 'quote_en', 'themes', 'source', 'locator_zh', 'locator_en', 'address'],
  ]
  for (const f of idx.films) {
    for (const q of idx.questionsByFilm.get(f.id) ?? []) {
      rows.push([
        q.id, f.title, f.age, q.personId ?? '', q.attribution, q.en, q.zh, zh(q.answerSummary), en(q.answerSummary), zh(q.answerQuote), en(q.answerQuote),
        q.themeIds.join(' '), q.sourceId, zh(q.locator), en(q.locator), `question/${q.id}`,
      ])
    }
  }
  return toCsv(rows)
}

export function sourcesCsv(idx: DataIndex): string {
  const rows: Array<Array<string>> = [['id', 'kind', 'publisher', 'title', 'url', 'accessed', 'address']]
  for (const s of idx.ds.sources) rows.push([s.id, s.kind, s.publisher, s.title, s.url ?? '', s.accessed, `source/${s.id}`])
  return toCsv(rows)
}

export type Gap = { target: Target & { kind: 'state' | 'final' } }

/** Every cell nobody has found a source for yet, in people → age → dimension order; then missing final states. */
export function gaps(idx: DataIndex): Gap[] {
  const out: Gap[] = []
  for (const p of idx.peopleOrdered) {
    for (const f of idx.films) {
      const row = idx.state(p.id, f.id)
      for (const d of DIM_KEYS) if (row.dims[d].status === 'not_found') out.push({ target: { kind: 'state', person: p.id, film: f.id, dim: d } })
    }
  }
  for (const p of idx.peopleOrdered) if (!idx.final(p.id)) out.push({ target: { kind: 'final', person: p.id } })
  return out
}
