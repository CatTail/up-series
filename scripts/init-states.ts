// Usage: node scripts/init-states.ts <dataDir>
// Creates data/states/<personId>.json skeletons for people that have none yet. Never overwrites.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PARTICIPATION_TEXT } from '../src/lib/data/participation-text.ts'
import type { DimKey, DimValue, Film, FinalState, Person, PersonId, StateRow } from '../src/lib/data/types.ts'
import { DIM_KEYS, NON_PARTICIPATING } from '../src/lib/data/types.ts'

export type StateFile = { rows: StateRow[]; final: FinalState | null }

export function initStates(people: Person[], films: Film[]): Record<PersonId, StateFile> {
  const out = {} as Record<PersonId, StateFile>
  for (const p of people) {
    const rows = films.map((f): StateRow => {
      const part = p.participation[f.id]
      const value: DimValue = NON_PARTICIPATING.includes(part)
        ? { status: 'not_applicable', reason: PARTICIPATION_TEXT[part] }
        : { status: 'not_found' }
      const dims = Object.fromEntries(DIM_KEYS.map((d) => [d, structuredClone(value)])) as Record<DimKey, DimValue>
      return { personId: p.id, filmId: f.id, dims }
    })
    out[p.id] = { rows, final: null }
  }
  return out
}

/** Returns the paths written. */
export function writeInitialStates(dataDir: string): string[] {
  const people = JSON.parse(readFileSync(join(dataDir, 'people.json'), 'utf8')) as Person[]
  const films = JSON.parse(readFileSync(join(dataDir, 'films.json'), 'utf8')) as Film[]
  mkdirSync(join(dataDir, 'states'), { recursive: true })
  const written: string[] = []
  for (const [id, file] of Object.entries(initStates(people, films))) {
    const path = join(dataDir, 'states', `${id}.json`)
    if (existsSync(path)) continue
    writeFileSync(path, JSON.stringify(file, null, 2) + '\n')
    written.push(path)
  }
  return written
}

if (import.meta.main) {
  const dir = process.argv[2]
  if (!dir) {
    console.error('usage: node scripts/init-states.ts <dataDir>')
    process.exit(2)
  }
  const written = writeInitialStates(dir)
  console.log(`wrote ${written.length} state file(s)`)
}
