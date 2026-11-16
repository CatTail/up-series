// Usage: node scripts/data-diff.ts <baseDataDir> <headDataDir>
// Prints the data changes between two checkouts as Markdown (for the PR job summary).
import { readFilesFromDisk } from '../src/lib/data/read-node.ts'
import { diffFiles, toMarkdown } from '../src/lib/data/diff.ts'
import type { Bilingual } from '../src/lib/data/types.ts'

const [base, head] = process.argv.slice(2)
if (!base || !head) {
  console.error('usage: node scripts/data-diff.ts <baseDataDir> <headDataDir>')
  process.exit(2)
}
const before = readFilesFromDisk(base)
const after = readFilesFromDisk(head)
const ui = (after['ui.json'] ?? before['ui.json'] ?? {}) as Record<string, Bilingual>
const tr = (k: string) => ui[k]?.zh ?? k
console.log(`## 数据改动 · Data changes\n\n${toMarkdown(diffFiles(before, after, tr, 'zh'), tr)}\n`)
