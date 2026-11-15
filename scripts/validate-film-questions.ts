// Usage: node scripts/validate-film-questions.ts <dataDir> <filmId>
// Validates one questions/<filmId>.json against the rest of the data, ignoring the other question files
// (so parallel annotators don't trip over each other's half-written files).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readDatasetFromDisk } from '../src/lib/data/read-node.ts'
import type { Question } from '../src/lib/data/types.ts'
import { validateDataset } from '../src/lib/data/validate.ts'

const [dir, film] = process.argv.slice(2)
if (!dir || !film) {
  console.error('usage: node scripts/validate-film-questions.ts <dataDir> <filmId>')
  process.exit(2)
}
let mine: Question[]
try {
  mine = JSON.parse(readFileSync(join(dir, 'questions', `${film}.json`), 'utf8'))
} catch (e) {
  console.error(`questions/${film}.json: ${(e as Error).message}`)
  process.exit(1)
}
const ds = readDatasetFromDisk(dir, { skip: (k) => k.startsWith('questions/') })
ds.questions = mine
// states may already link questions from other films; drop those links for this check
ds.states = ds.states.map((s) => ({ ...s, dims: Object.fromEntries(Object.entries(s.dims).map(([k, v]) => [k, v.status === 'confirmed' ? { ...v, questionIds: undefined } : v])) as typeof s.dims }))
const errors = validateDataset(ds)
if (errors.length) {
  for (const e of errors) console.error(`${e.code}  ${e.path}  ${e.message}`)
  console.error(`${errors.length} error(s)`)
  process.exit(1)
}
console.log(`OK (${mine.length} questions)`)
