// Usage: node scripts/validate-data.ts <dataDir>   (STRICT_FINALS=1 to require every final state)
import { readDatasetFromDisk } from '../src/lib/data/read-node.ts'
import { validateDataset } from '../src/lib/data/validate.ts'

const dir = process.argv[2]
if (!dir) {
  console.error('usage: node scripts/validate-data.ts <dataDir>')
  process.exit(2)
}
const errors = validateDataset(readDatasetFromDisk(dir), { strictFinals: process.env.STRICT_FINALS === '1' })
if (errors.length) {
  for (const e of errors) console.error(`${e.code}  ${e.path}  ${e.message}`)
  console.error(`${errors.length} error(s)`)
  process.exit(1)
}
console.log('OK')
