import { assembleDataset } from './assemble.ts'
import type { Dataset } from './types.ts'

/** Bundle every data file at build time (no runtime requests; works from file://). */
export function loadDataset(): Dataset {
  const mods = import.meta.glob('/data/**/*.json', { eager: true, import: 'default' })
  const files: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(mods)) files[k.replace(/^\/data\//, '')] = v
  return assembleDataset(files)
}
