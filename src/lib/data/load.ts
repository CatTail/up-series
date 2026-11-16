import { assembleDataset } from './assemble.ts'
import type { Dataset } from './types.ts'

/** Every data file, bundled at build time (no runtime requests; works from file://), keyed like "states/nick.json". */
export function loadFiles(): Record<string, unknown> {
  const mods = import.meta.glob('/data/**/*.json', { eager: true, import: 'default' })
  const files: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(mods)) files[k.replace(/^\/data\//, '')] = v
  return files
}

export function loadDataset(): Dataset {
  return assembleDataset(loadFiles())
}
