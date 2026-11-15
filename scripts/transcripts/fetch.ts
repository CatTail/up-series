// Usage: node scripts/transcripts/fetch.ts <rawDir>
// Downloads each page listed in <rawDir>/sources.json to <rawDir>/<source>/<filmId>-p<part>.html.
// Skips existing files; waits ≥2s between requests.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadTranscripts } from './sources.ts'

const raw = process.argv[2]
if (!raw) {
  console.error('usage: node scripts/transcripts/fetch.ts <rawDir>')
  process.exit(2)
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
let first = true
const failures: string[] = []
for (const t of loadTranscripts(raw)) {
  const dir = join(raw, t.source)
  const path = join(dir, `${t.filmId}-p${t.part}.html`)
  if (existsSync(path)) {
    console.log(`skip ${path}`)
    continue
  }
  if (!first) await sleep(2000)
  first = false
  mkdirSync(dir, { recursive: true })
  try {
    const res = await fetch(t.url, { headers: { 'user-agent': 'Mozilla/5.0 (research; up-series viz)' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    writeFileSync(path, await res.text())
    console.log(`ok   ${path}`)
  } catch (e) {
    failures.push(`${t.source} ${t.filmId} p${t.part}: ${(e as Error).message}`)
    console.log(`FAIL ${t.source} ${t.filmId} p${t.part}: ${(e as Error).message}`)
  }
}
if (failures.length) {
  console.log(`\n${failures.length} failure(s):\n${failures.join('\n')}`)
  process.exitCode = 1
}
