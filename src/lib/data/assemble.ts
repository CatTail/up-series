import type { Dataset, FinalState, OriginsContent, Question, Source, StateRow } from './types.ts'

/**
 * Merge the split data files into one Dataset. Keys are paths relative to the data dir
 * (e.g. "films.json", "sources/core.json", "states/nick.json"); values are parsed JSON.
 * Shared by the Node reader (validation, scripts) and the browser loader (import.meta.glob).
 */
export function assembleDataset(files: Record<string, unknown>): Dataset {
  const one = <T>(name: string, fallback: T): T => (name in files ? (files[name] as T) : fallback)
  const under = (dir: string) =>
    Object.keys(files)
      .filter((k) => k.startsWith(`${dir}/`) && k.endsWith('.json'))
      .sort()
      .map((k) => files[k])

  const sources = under('sources').flat() as Source[]
  const questions = under('questions').flat() as Question[]
  const states: StateRow[] = []
  const finals: FinalState[] = []
  for (const f of under('states') as Array<{ rows: StateRow[]; final: FinalState | null }>) {
    states.push(...f.rows)
    if (f.final) finals.push(f.final)
  }
  return {
    sources,
    films: one('films.json', []),
    groups: one('groups.json', []),
    people: one('people.json', []),
    states,
    finals,
    themes: one('themes.json', []),
    questions,
    origins: one<OriginsContent>('origins.json', { blocks: [] }),
    ui: one('ui.json', {}),
  }
}
