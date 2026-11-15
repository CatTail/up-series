// Checks on the real published data (not the fixture).
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readDatasetFromDisk } from '../../src/lib/data/read-node.ts'
import { validateDataset } from '../../src/lib/data/validate.ts'
import { PERSON_IDS } from '../../src/lib/data/types.ts'

const ds = readDatasetFromDisk(join(__dirname, '../../data'))
const names = ds.people.map((p) => p.name)

describe('real data', () => {
  it('passes validation', () => {
    expect(validateDataset(ds)).toEqual([])
  })
  it('has all 14 people and 10 films', () => {
    expect(ds.people.map((p) => p.id)).toEqual([...PERSON_IDS])
    expect(ds.films).toHaveLength(10)
  })
  it('backgrounds name nobody (they are shown anonymously in the guess game)', () => {
    for (const p of ds.people) {
      for (const n of names) {
        expect(p.background.en, `${p.id} background mentions ${n}`).not.toMatch(new RegExp(`\\b${n}\\b`))
        expect(p.background.zh, `${p.id} background mentions ${n}`).not.toContain(n)
      }
    }
  })
  it('final states name nobody (used as anonymous guess options)', () => {
    for (const f of ds.finals) for (const n of names) {
      expect(f.text.en, `${f.personId} final mentions ${n}`).not.toMatch(new RegExp(`\\b${n}\\b`))
      expect(f.text.zh, `${f.personId} final mentions ${n}`).not.toContain(n)
    }
  })
})
