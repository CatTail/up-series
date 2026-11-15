import type { FilmId } from '../../src/lib/data/types.ts'
import { FILM_IDS } from '../../src/lib/data/types.ts'

export type Candidate = { i: number; text: string; before: string[]; after: string[] }

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
    return ENTITIES[e.toLowerCase()] ?? m
  })
}
const clean = (s: string) => decodeEntities(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim()

/** Lines of the "Original subtitles" block. */
export function parseOrigText(html: string): string[] {
  const start = html.indexOf('<div class="orig-text">')
  if (start < 0) return []
  const end = html.indexOf('</div>', start)
  const block = html.slice(start, end < 0 ? undefined : end)
  return [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => clean(m[1])).filter(Boolean)
}

/** Lines of a "scrolling-script-container" page (text separated by <br>). */
export function parseScriptContainer(html: string): string[] {
  const start = html.indexOf('<div class="scrolling-script-container">')
  if (start < 0) return []
  const end = html.indexOf('</div>', start)
  const block = html.slice(start + '<div class="scrolling-script-container">'.length, end < 0 ? undefined : end)
  const lines = block.split(/<br\s*\/?>/i).map(clean).filter(Boolean)
  if (lines.length && /^\d+$/.test(lines[0])) lines.shift()
  return lines
}

export function collapseRepeats(lines: string[]): string[] {
  return lines.filter((l, i) => i === 0 || l !== lines[i - 1])
}

const TERMINAL = /[.?!…♪"”’]$/
const SPEAKER = /^-(\s|(?=[A-Za-z"'“]))/
/** Join subtitle lines into cues: a line without terminal punctuation continues on the next line, unless the next line starts a new speaker ("- "). */
export function joinCues(lines: string[]): string[] {
  const out: string[] = []
  let buf = ''
  for (const line of lines) {
    if (buf && SPEAKER.test(line)) {
      out.push(buf)
      buf = ''
    }
    buf = buf ? `${buf} ${line}` : line
    if (TERMINAL.test(line)) {
      out.push(buf)
      buf = ''
    }
  }
  if (buf) out.push(buf)
  return out
}

/** Split cues into sentences; the speaker dash stays on the first sentence. */
export function splitSentences(cues: string[]): string[] {
  return cues.flatMap((c) => c.split(/(?<=\?)\s+|(?<=[.!…])\s+(?=[-"“A-Z0-9])/).filter(Boolean))
}

const stripDash = (s: string) => s.replace(/^-\s*/, '')
const isSoundCue = (s: string) => {
  const letters = s.replace(/[^A-Za-z]/g, '')
  return letters.length >= 2 && letters === letters.toUpperCase()
}

export function findQuestions(sentences: string[], window = 3): Candidate[] {
  const out: Candidate[] = []
  sentences.forEach((s, i) => {
    const text = stripDash(s.trim())
    if (!text.endsWith('?') || isSoundCue(text)) return
    out.push({ i, text, before: sentences.slice(Math.max(0, i - window), i), after: sentences.slice(i + 1, i + 1 + window) })
  })
  return out
}

export const normalizeLine = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim()

/** Mark candidates whose normalized text already appeared in an earlier film (likely recap footage). Short questions (< 4 words) are never flagged. */
export function markRecaps(byFilm: Partial<Record<FilmId, Candidate[]>>): Record<FilmId, Array<Candidate & { recapOf?: FilmId }>> {
  const first = new Map<string, FilmId>()
  const out = {} as Record<FilmId, Array<Candidate & { recapOf?: FilmId }>>
  for (const f of FILM_IDS) {
    const list = byFilm[f]
    if (!list) continue
    out[f] = list.map((c) => {
      const n = normalizeLine(c.text)
      const seen = first.get(n)
      if (n.split(' ').length >= 4 && seen && seen !== f) return { ...c, recapOf: seen }
      if (!seen) first.set(n, f)
      return { ...c }
    })
  }
  return out
}
