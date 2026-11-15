import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { initStates, writeInitialStates } from '../../scripts/init-states.ts'
import { PARTICIPATION_TEXT } from '../../src/lib/data/participation-text.ts'
import { DIM_KEYS } from '../../src/lib/data/types.ts'
import type { Person } from '../../src/lib/data/types.ts'
import { makeFixture } from '../fixtures/dataset.ts'

const fx = makeFixture()
// 14 people: the fixture's 5 plus 9 always-present clones
const ids = ['john', 'bruce', 'jackie', 'sue', 'tony', 'paul', 'symon', 'peter', 'neil'] as const
const people: Person[] = [...fx.people, ...ids.map((id) => ({ ...fx.people[0], id }))]

describe('initStates', () => {
  const out = initStates(people, fx.films)

  it('14×10 rows', () => {
    expect(Object.keys(out)).toHaveLength(14)
    for (const v of Object.values(out)) {
      expect(v.rows).toHaveLength(10)
      expect(v.final).toBeNull()
    }
  })

  it("charles f35 is not_applicable with reason 'absent'", () => {
    const row = out.charles.rows.find((r) => r.filmId === 'f35')!
    for (const d of DIM_KEYS) expect(row.dims[d]).toEqual({ status: 'not_applicable', reason: PARTICIPATION_TEXT.absent })
  })

  it("lynn f63 not_applicable 'deceased'", () => {
    const row = out.lynn.rows.find((r) => r.filmId === 'f63')!
    expect(row.dims.work).toEqual({ status: 'not_applicable', reason: PARTICIPATION_TEXT.deceased })
  })

  it('suzy f63 footage_only is not_applicable', () => {
    const row = out.suzy.rows.find((r) => r.filmId === 'f63')!
    expect(row.dims.family).toEqual({ status: 'not_applicable', reason: PARTICIPATION_TEXT.footage_only })
  })

  it('nick f70 dims are not_found', () => {
    const row = out.nick.rows.find((r) => r.filmId === 'f70')!
    for (const d of DIM_KEYS) expect(row.dims[d]).toEqual({ status: 'not_found' })
  })

  it('does not overwrite existing file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'up-init-'))
    writeFileSync(join(dir, 'people.json'), JSON.stringify(people))
    writeFileSync(join(dir, 'films.json'), JSON.stringify(fx.films))
    mkdirSync(join(dir, 'states'))
    writeFileSync(join(dir, 'states/andrew.json'), '{"keep":true}')
    const written = writeInitialStates(dir)
    expect(written).toHaveLength(13)
    expect(readFileSync(join(dir, 'states/andrew.json'), 'utf8')).toBe('{"keep":true}')
    expect(existsSync(join(dir, 'states/nick.json'))).toBe(true)
  })
})
