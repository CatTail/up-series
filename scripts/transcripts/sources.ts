// Which transcript pages to fetch. The page list (with URLs) is kept outside the repo in <rawDir>/sources.json,
// next to the raw downloads; nothing here names a transcript website.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { FilmId } from '../../src/lib/data/types.ts'
import { FILM_IDS } from '../../src/lib/data/types.ts'

export const TRANSCRIPT_SOURCES = ['primary', 'primary-alt', 'secondary'] as const
export type TranscriptSource = (typeof TRANSCRIPT_SOURCES)[number]
export type Transcript = { filmId: FilmId; part: number; source: TranscriptSource; url: string }

/** Read and check <rawDir>/sources.json: an array of { filmId, part, source, url }. */
export function loadTranscripts(rawDir: string): Transcript[] {
  const path = join(rawDir, 'sources.json')
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    throw new Error(`cannot read ${path}: ${(e as Error).message}`)
  }
  if (!Array.isArray(raw)) throw new Error(`${path}: expected an array`)
  return raw.map((t, i): Transcript => {
    const at = `${path}[${i}]`
    if (!(FILM_IDS as readonly string[]).includes(t?.filmId)) throw new Error(`${at}: bad filmId ${t?.filmId}`)
    if (!Number.isInteger(t.part) || t.part < 1) throw new Error(`${at}: bad part ${t.part}`)
    if (!(TRANSCRIPT_SOURCES as readonly string[]).includes(t.source)) throw new Error(`${at}: bad source ${t.source}`)
    if (typeof t.url !== 'string' || !/^https?:\/\//.test(t.url)) throw new Error(`${at}: bad url`)
    return { filmId: t.filmId, part: t.part, source: t.source, url: t.url }
  })
}
