// The fixture dataset laid out as data files, the way `assembleDataset` and `applyPatch` take them.
import type { Files } from '../../src/lib/data/address.ts'
import type { Dataset } from '../../src/lib/data/types.ts'
import { FILM_IDS } from '../../src/lib/data/types.ts'
import realUi from '../../data/ui.json'
import { makeFixture } from './dataset.ts'

export function fixtureFiles(ds: Dataset = makeFixture()): Files {
  const files: Files = {
    'films.json': ds.films,
    'groups.json': ds.groups,
    'people.json': ds.people,
    'themes.json': ds.themes,
    'origins.json': ds.origins,
    'ui.json': ds.ui,
    'sources/core.json': ds.sources.filter((s) => s.kind !== 'film'),
    'sources/films.json': ds.sources.filter((s) => s.kind === 'film'),
  }
  for (const p of ds.people) files[`states/${p.id}.json`] = { rows: ds.states.filter((r) => r.personId === p.id), final: ds.finals.find((f) => f.personId === p.id) ?? null }
  for (const f of FILM_IDS) {
    const qs = ds.questions.filter((q) => q.filmId === f)
    if (qs.length) files[`questions/${f}.json`] = qs
  }
  return structuredClone(files)
}

const ui = realUi as Record<string, { zh: string; en: string }>
/** Translate with the real ui.json, throwing on a missing key like `t` does. */
export const trZh = (k: string) => {
  if (!ui[k]) throw new Error(`missing ui key: ${k}`)
  return ui[k].zh
}
