import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { assembleDataset } from './assemble.ts'
import type { Dataset } from './types.ts'

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

/** Every JSON file under `dataDir`, parsed, keyed by data-relative path ("states/andrew.json"). */
export function readFilesFromDisk(dataDir: string, opts: { skip?: (key: string) => boolean } = {}): Record<string, unknown> {
  const files: Record<string, unknown> = {}
  for (const p of walk(dataDir)) {
    if (!p.endsWith('.json')) continue
    const key = relative(dataDir, p).split(sep).join('/')
    if (opts.skip?.(key)) continue
    try {
      files[key] = JSON.parse(readFileSync(p, 'utf8'))
    } catch (e) {
      throw new Error(`${key}: ${(e as Error).message}`)
    }
  }
  return files
}

/** `skip(key)` — ignore files by data-relative path, e.g. other annotators' half-written question files. */
export function readDatasetFromDisk(dataDir: string, opts: { skip?: (key: string) => boolean } = {}): Dataset {
  return assembleDataset(readFilesFromDisk(dataDir, opts))
}
