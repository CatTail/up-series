import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readDatasetFromDisk } from '../../src/lib/data/read-node.ts'
import { makeFixture } from '../fixtures/dataset.ts'

function writeFixture(dir: string, dropFinalOf?: string) {
  const ds = makeFixture()
  const w = (p: string, v: unknown) => {
    mkdirSync(join(dir, p, '..'), { recursive: true })
    writeFileSync(join(dir, p), JSON.stringify(v))
  }
  w('sources/a.json', ds.sources.slice(0, 1))
  w('sources/b.json', ds.sources.slice(1))
  w('films.json', ds.films)
  w('groups.json', ds.groups)
  w('people.json', ds.people)
  for (const p of ds.people) {
    const final = p.id === dropFinalOf ? null : ds.finals.find((f) => f.personId === p.id)
    w(`states/${p.id}.json`, { rows: ds.states.filter((s) => s.personId === p.id), final })
  }
  w('themes.json', ds.themes)
  w('questions/f07.json', ds.questions.filter((q) => q.filmId === 'f07'))
  w('questions/f28.json', ds.questions.filter((q) => q.filmId === 'f28'))
  writeFileSync(join(dir, 'questions/.gitkeep'), '')
  w('origins.json', ds.origins)
  w('ui.json', ds.ui)
  return ds
}

describe('readDatasetFromDisk', () => {
  it('merges split files back into one dataset', () => {
    const dir = mkdtempSync(join(tmpdir(), 'up-data-'))
    const ds = writeFixture(dir)
    const got = readDatasetFromDisk(dir)
    expect(new Set(got.sources.map((s) => s.id))).toEqual(new Set(ds.sources.map((s) => s.id)))
    expect(got.states).toHaveLength(ds.states.length)
    expect(got.questions.map((q) => q.id).sort()).toEqual(ds.questions.map((q) => q.id).sort())
    expect(got.finals).toHaveLength(5)
    expect(got.people).toEqual(ds.people)
  })

  it('drops null finals', () => {
    const dir = mkdtempSync(join(tmpdir(), 'up-data-'))
    writeFixture(dir, 'nick')
    expect(readDatasetFromDisk(dir).finals.map((f) => f.personId)).not.toContain('nick')
  })
})
