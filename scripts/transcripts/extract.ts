// Usage: node scripts/transcripts/extract.ts <rawDir>
// Reads <rawDir>/primary/*.html, writes <rawDir>/candidates/<filmId>.json, <filmId>.sentences.txt and REPORT.md.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { FilmId } from '../../src/lib/data/types.ts'
import { FILM_IDS } from '../../src/lib/data/types.ts'
import { type Candidate, collapseRepeats, findQuestions, joinCues, markRecaps, parseOrigText, parseScriptContainer, splitSentences } from './parse.ts'

const raw = process.argv[2]
if (!raw) {
  console.error('usage: node scripts/transcripts/extract.ts <rawDir>')
  process.exit(2)
}
const out = join(raw, 'candidates')
mkdirSync(out, { recursive: true })

const partsOf = (source: string, f: FilmId) => {
  const dir = join(raw, source)
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((n) => n.startsWith(`${f}-p`) && n.endsWith('.html')).sort()
}

type PartCandidate = Candidate & { part: number }
const byFilm: Partial<Record<FilmId, PartCandidate[]>> = {}
const stats: Record<string, { rawLines: number; sentences: number; candidates: number; parts: number; alt: number; secondary: number }> = {}

for (const f of FILM_IDS) {
  const files = partsOf('primary', f)
  let rawLines = 0
  let sentenceCount = 0
  const cands: PartCandidate[] = []
  const txt: string[] = []
  for (const file of files) {
    const part = Number(file.match(/-p(\d+)\.html$/)?.[1] ?? 1)
    const lines = parseOrigText(readFileSync(join(raw, 'primary', file), 'utf8'))
    rawLines += lines.length
    const sentences = splitSentences(joinCues(collapseRepeats(lines)))
    sentenceCount += sentences.length
    txt.push(`=== Part ${part} ===`, ...sentences.map((s, i) => `${part}:${i}\t${s}`))
    cands.push(...findQuestions(sentences).map((c) => ({ ...c, part })))
  }
  byFilm[f] = cands
  const alt = partsOf('primary-alt', f).reduce((n, file) => n + parseOrigText(readFileSync(join(raw, 'primary-alt', file), 'utf8')).length, 0)
  const secondary = partsOf('secondary', f).reduce((n, file) => n + parseScriptContainer(readFileSync(join(raw, 'secondary', file), 'utf8')).length, 0)
  stats[f] = { rawLines, sentences: sentenceCount, candidates: cands.length, parts: files.length, alt, secondary }
  writeFileSync(join(out, `${f}.sentences.txt`), txt.join('\n') + '\n')
}

const marked = markRecaps(byFilm)
const report = ['# Candidate extraction report', '', '| film | parts | raw lines | sentences | ? candidates | recap-flagged | alt lines | secondary lines |', '|---|---|---|---|---|---|---|---|']
for (const f of FILM_IDS) {
  const list = marked[f] ?? []
  writeFileSync(join(out, `${f}.json`), JSON.stringify({ filmId: f, candidates: list }, null, 1) + '\n')
  const s = stats[f]
  report.push(`| ${f} | ${s.parts} | ${s.rawLines} | ${s.sentences} | ${s.candidates} | ${list.filter((c) => c.recapOf).length} | ${s.alt} | ${s.secondary} |`)
}
writeFileSync(join(out, 'REPORT.md'), report.join('\n') + '\n')
console.log(report.join('\n'))
