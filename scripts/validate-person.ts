// Usage: node scripts/validate-person.ts <dataDir> <personId>
// Validates one person's states/<id>.json and sources/person-<id>.json against the rest of the data. Other people's
// state files are replaced by fresh skeletons and other person-source files are ignored, so parallel researchers
// don't trip over each other's half-written files.
import { readDatasetFromDisk } from '../src/lib/data/read-node.ts'
import { validateDataset } from '../src/lib/data/validate.ts'
import { initStates } from './init-states.ts'

const [dir, id] = process.argv.slice(2)
if (!dir || !id) {
  console.error('usage: node scripts/validate-person.ts <dataDir> <personId>')
  process.exit(2)
}
const own = (k: string) => k === `states/${id}.json` || k === `sources/person-${id}.json`
let ds
try {
  ds = readDatasetFromDisk(dir, { skip: (k) => (k.startsWith('states/') || k.startsWith('sources/person-')) && !own(k) })
} catch (e) {
  console.error((e as Error).message)
  process.exit(1)
}
const others = initStates(ds.people.filter((p) => p.id !== id), ds.films)
for (const f of Object.values(others)) ds.states.push(...f.rows)
const errors = validateDataset(ds, { strictFinals: false })
if (!ds.finals.some((f) => f.personId === id)) errors.push({ code: 'MISSING_FINAL', path: `finals(${id})`, message: 'no final state' })
if (errors.length) {
  for (const e of errors) console.error(`${e.code}  ${e.path}  ${e.message}`)
  console.error(`${errors.length} error(s)`)
  process.exit(1)
}
const rows = ds.states.filter((s) => s.personId === id)
const confirmed = rows.flatMap((r) => Object.values(r.dims)).filter((v) => v.status === 'confirmed').length
console.log(`OK (${id}: ${confirmed} confirmed cells, final set)`)
